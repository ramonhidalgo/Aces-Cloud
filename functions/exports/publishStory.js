const { discord } = require('../utils/discord')
const { dbGet, dbSet, dbSetLegacy, auth } = require('../utils/database')
const { diff, formattedDiff, someIn, allIn } = require('../utils/objects')
const levenshtein = require('js-levenshtein')

exports.publishStory = async ( change, { params: { storyID }, authType, auth } ) => {

	const before = change.before.val() || {}
	const after = change.after.val() || {}
	const changes = diff(before,after)

	if (changes.length === 0 || allIn(changes,'relatedArticleIDs')) return

	// update categories
	if (someIn(changes,'categoryID') && before.categoryID)
		categoryStoryIDs(before.categoryID,storyID,false)

	if (someIn(changes,'timestamp','categoryID'))
		categoryStoryIDs(after.categoryID,storyID,true)

	// remove notification if unnotified
	if (someIn(changes,'notified') && before.notified)
		removeNotif(storyID)

	// update thumbnails
	if (someIn(changes,'categoryID'))
		categoryThumbnail(before.categoryID)
	
	if (someIn(changes,'featured','timestamp','thumbURLs','categoryID'))
		categoryThumbnail(after.categoryID)
		
	// find similar storys
	if (someIn(changes,'title'))
		await relatedStoryIDs(after,storyID)
	
	// clone story into various places
	mirrorStory(after,storyID,changes)
	legacyStory(after,storyID,changes)

	// log to discord
	const user = authType === 'ADMIN'
	? 'Aces Cloud'
	: authType === 'USER'
	? await idToEmail(auth.uid)
	: 'Anonymous'
	
	discord({
		author: user,
		id: storyID, 
		title: '✏️ ' + after.title, 
		description: formattedDiff(before,after),
	})
}

/**
 * Sets an article with 4 related ones
 * @param {Object} story 
 * @param {string} storyID 
 * @returns {Promise}
 */
async function relatedStoryIDs(story,storyID){
	const snippets = await dbGet('snippets')
	const categories = await dbGet('categories')
	const title = story.title + ' '
	const relatedArticleIDs = Object.keys(snippets)
	.filter( id => ( id !== storyID ) /*&& ( categories[snippets[id].categoryID].visible )*/ )
	.sort( ( a, b ) =>
		levenshtein( snippets[a].title + ' ', title ) -
		levenshtein( snippets[b].title + ' ', title )
	)
	.slice( 0, 4 )
	return dbSet(['storys',storyID,'relatedArticleIDs'], relatedArticleIDs)
}

/**
 * Mirrors a story into objects which have less properties & are quicker to access
 * @param {Object} story 
 * @param {string} storyID 
 */
async function mirrorStory(story,storyID,changes){
	const schemas = await dbGet('schemas')
	const mirrors = ['article','snippet']
	if(story.notified) mirrors.push('notif')
	for(const type of mirrors){
		const schema = Object.keys(schemas[type])
		if(someIn(schema,changes)) continue
		const mirror = Object.fromEntries(
			Object.entries(story).filter(([key])=>schema.includes(key))
		)
		dbSet( [type+'s',storyID], mirror )
	}
}

/**
 * Mirrors a story into the legacy database
 * @param {Object} story 
 * @param {story} storyID 
 */
async function legacyStory(story,storyID){
	const schemas = await dbGet('schemas')
	const legacyStory = {
		...Object.fromEntries(
			Object.entries(story)
			.filter(([key])=>key in schemas.legacy)
			.map(([key,value]) => [schemas.legacy[key],value])
		),
		...{
			hasHTML: true,
		}
	}
	dbSetLegacy(await legacyPath(story.categoryID,storyID),legacyStory)
}

/**
 * Get the path of a story in a legacy database
 * @param {string} categoryID 
 * @returns {string}
 */
 async function legacyPath(categoryID,storyID){
	return [
		Object.entries(await dbGet('locations')).find(
			([,{categoryIDs}]) => categoryIDs.includes(categoryID)
		)[0],
		categoryID,
		storyID,
	]
}

/**
 * Generates thumbnails for a category
 * @param {string} categoryID 
 */
async function categoryThumbnail(categoryID){
	const path = ['categories',categoryID]
	const storyIDs = await dbGet([...path,'articleIDs']) || []
	const snippets = await dbGet('snippets') || []
	const thumbURLs = storyIDs
	.map( id => snippets[id] )
	.filter( snippet => 'thumbURLs' in snippet ) // select articles with images
	.sort( (a,b) => b.featured - a.featured ) // prioritize featured articles
	.slice(0, 3) // trim to first 4 articles
	.map( snippet => snippet.thumbURLs[0] ) // map to image array
	dbSet([...path,'thumbURLs'], thumbURLs )
}

/**
 * Adds or removes a story to a category's articleIDs collection
 * @param {string} categoryID 
 * @param {string} storyID 
 * @param {Boolean} insert 
 */
async function categoryStoryIDs(categoryID,storyID,insert){
	const path = ['categories',categoryID,'articleIDs']
	let storyIDs = await dbGet(path) || []
	storyIDs = storyIDs.filter(x=>x!==storyID)
	if (insert) {
		const snippets = await dbGet('snippets') || []
		const index = storyIDs.findIndex(id=>snippets[id].timestamp < snippets[storyID].timestamp)
		index < 0 ? storyIDs.push(storyID) : storyIDs.splice(index,0,storyID)
	} else {
		dbSetLegacy(await legacyPath(categoryID,storyID),null)
	}
	dbSet(path,storyIDs)
}

/**
 * Remove a story from the notification list
 * @param {String} storyID 
 */
async function removeNotif(storyID){
	dbSet('notifIDs',(await dbGet('notifIDs')).filter(x=>x!==storyID))
}
/**
 * Converts a user's ID into their email
 * @param {String} uid 
 * @returns {String} email
 */
async function idToEmail(uid){
	const user = await auth.getUser(uid)
	return user.email || ''
}

