const { database } = require('firebase-functions')
const { discord } = require('./discord')
const { dbGet, dbSet, dbSetLegacy, auth } = require('../utils/database')

exports.publishStory = database
.instance('ahs-app')
.ref('/storys/{storyID}')
.onWrite( async ( change, { params: { storyID }, authType, auth } ) => {

	const before = change.before.val()
	const after = change.after.val()
	const changes = diff(before,after)
	
	// clone story into various places
	mirrorStory(after,storyID,changes)
	legacyStory(after,storyID,changes)

	// update categories
	if(someIn(changes,'categoryID') && 'categoryID' in before)
		categoryStoryIDs(before.categoryID,storyID,false)

	if(someIn(changes,'timestamp','categoryID'))
		categoryStoryIDs(after.categoryID,storyID,true)

	// remove notification if unnotified
	if(before.notified && !after.notified)
		removeNotif(storyID)

	// update thumbnails
	if (someIn(changes,'categoryID'))
			categoryThumbnail(before.categoryID)
	
	if (someIn(changes,'featured','timestamp','thumbURLs','categoryID'))
			categoryThumbnail(after.categoryID)

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
})

/**
 * Returns list of properties whose values are different between two objects 
 * @param {Object} a 
 * @param {Object} b 
 * @returns {Array}
 */
function diff (a,b) { 
	return Object.keys({ ...a, ...b })
 	.filter( k => JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k]) )
}

/**
 * Returns a formatted list of properties and their before and after values
 * @param {Object} a 
 * @param {Object} b 
 * @returns {String}
 */
 function formattedDiff (a,b) {
	return diff(a,b)
	.map( k =>
		[k,a[k],b[k]]
		.map( s => s === undefined ? null : s )
		.map( JSON.stringify )
		.map( s => s.length > 16 ? s.substring(0,16) + '...' : s )
	)
	.map(([k,a,b])=>`${k}: ${a} → ${b}`)
	.join('\n')
}

/**
 * Checks if an array includes any of the subset
 * @param {any[]} array 
 * @param  {...any} subset 
 * @returns {Boolean}
 */
function someIn(array,...subset) {
	return array.some(element=>subset.includes(element))
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
	dbSetLegacy(legacyPath(story.categoryID,storyID),legacyStory)
}

/**
 * Get the path of a category in a legacy database
 * @param {string} categoryID 
 * @returns {string}
 */
 async function legacyPath(categoryID){
	return Object.entries(await dbGet('locations')).find(
		([,{categoryIDs}]) => categoryIDs.includes(categoryID)
	)[0]
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
	await dbSet([...path,'thumbURLs'], thumbURLs )
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
		await dbSetLegacy(legacyPath(categoryID,storyID),null)
	}
	await dbSet(path,storyIDs)
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
