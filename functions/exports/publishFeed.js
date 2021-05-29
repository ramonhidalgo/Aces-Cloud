const { pubsub } = require('firebase-functions')
const { discord } = require('../utils/discord')
const { dbGet, dbSet } = require('../utils/database')
const { id } = require('../utils/id')
const { templateStory } = require('../utils/templateStory')

const fetch = require('node-fetch')
const DOMParser = require('dom-parser')
const Turndown = require('turndown')
const marked = require('marked')
const { imgbb } = require('../utils/imgbb')

const parser = new DOMParser()
const turned = new Turndown()
const parse_xml = str => parser.parseFromString(str)
const html_to_md = html => turned.turndown(html)
const md_to_html = md => marked(md)

exports.publishFeed = pubsub.schedule('0 0 * * *').onRun( async () => {
	
	const feeds = await dbGet('feeds')
	const template = templateStory()

	for (const key of feeds) {
		const feed = feeds[key]

		const items = await fetch(feed.url)
			// Get plaintext XML
			.then(response => response.text())
			// Remove CDATA blocks
			.then(text => text.replace(/(\<\!\[CDATA\[|\]\]\>)/g,''))
			// Sanitize colons in tag names
			.then(text => text.replace(/(\<\/?\w+)\:(\w+.*?\>)/g,'$1X$2'))
			// Parse XML
			.then(parse_xml)
			// Get the individual entries
			.then(xml => xml.getElementsByTagName(feed.item))

		for (const item of items.slice(0,12)) {
			let story = { }

			// fill from schema
			for(const key in feed.schema) {
				const value = item.getElementsByTagName(feed.props[key])[0]?.innerHTML
				if(value) story[key] = value
			}

			// base ID from title
			story.id = id(...story.title.match(
					new RegExp(`.{${~~(story.title.length/3)}}`,'g')
			))

			// fill with template and older versions of the story
			story = {
				...template,
				...await dbGet(['storys',story.id]) || {},
				...story,
				categoryID: feed.path,
				timestamp: Math.trunc(Date.parse(story.date)/1000),
				markdown: html_to_md(story.body.replace(/\<img.*?\>/g,''))+'\n\n'+feed.footer,
			}

			// find image tags from the story
			story.imageURLs = story.body.match(/(?<=\<img src\=['"]).*?(?=['"].*?\>)/g)

			// re-render a cleaner body from markdown
			story.body = md_to_html(story.markdown)

			// org-specific fixes
			switch(feed.path){
				case 'APN':
					story.videoIDs = [story.videoID]
					story.imageURLs = [`https://img.youtube.com/vi/${story.video}/maxresdefault.jpg`]
					story.title = story.title.split(': ')[1]
					break
				case 'KiA':
					story.title = story.title.split(/#\d+\s/)[1]
			}
			
			// upload external images to imgBB
			for( const set of await Promise.all(story.externalImageURLs.map(imgbb)) )
				story = { ...story, ...set }

			// publish
			dbSet(['storys',id], story)
		}
	}
})
