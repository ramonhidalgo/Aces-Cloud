const functions = require('firebase-functions')
const admin = require('firebase-admin')
const fetch = require('node-fetch')
const { log, warn, error } = require('firebase-functions/lib/logger')
const config = functions.config().firebase
const app = admin.initializeApp({
	...config,
	databaseURL: 'https://ahs-app.firebaseio.com'
},'main')
const db = admin.database(app).ref()
const appLegacy = admin.initializeApp({
	...config,
	databaseURL: 'https://arcadia-high-mobile.firebaseio.com'
},'legacy')
const dbLegacy = admin.database(appLegacy).ref()
const auth = admin.auth(app)

/**
 * Picking up from Aces's modification of the stories tree,
 * this function realizes the effects of that change, such as
 * mirrors of the story on the snippets tree and the legacy database,
 * category articleID lists, category thumbnails, and Discord logs.
 */
exports.publishStory = functions.database.instance('ahs-app')
.ref('/storys/{storyID}').onWrite( async (
		change,
		{ 
			params: { storyID },
			auth: { uid },
		}
	) => {

	const before = change.before.val()
	const after = change.after.val()
	const changes = diff(before,after)

	// update mirrors

	mirrorStory(after,storyID,changes)
	legacyStory(after,storyID,changes)

	// update pointers

	if(someIn(changes,'categoryID') && 'categoryID' in before)
		categoryStoryIDs(before.categoryID,storyID,false)

	if(someIn(changes,'timestamp','categoryID'))
		categoryStoryIDs(after.categoryID,storyID,true)

	if(before.notified && !after.notified)
		removeNotif(storyID)

	// update thumbnails

	if(someIn(changes,'categoryID'))
		categoryThumbnail(before.categoryID)
	
	if(someIn(changes,'thumbURLs','categoryID'))
		categoryThumbnail(after.categoryID)

	// log to discord
	const email = await idToEmail(uid)
	discord({
		author: email,
		id: storyID, 
		title: '✏️ ' + after.title, 
		description: formattedDiff(before,after),
	})

	return true
})

/**
 * Returns list of properties whose values are different between two objects 
 * @param {Object} a 
 * @param {Object} b 
 * @returns {Array}
 */
function diff (a,b) { 
	return Object.keys({ ...a, ...b })
 	.filter( k => JSON.stringify(a[k]||0) !== JSON.stringify(b[k]||0) )
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
	const schemas = await db.child('schemas').get().then(value)
	const mirrors = ['article','snippet']
	if(story.notified) mirrors.push('notif')
	for(const type of mirrors){
		const schema = Object.keys(schemas[type])
		if(someIn(schema,changes)) continue
		const mirror = Object.fromEntries(
			Object.entries(story).filter(([key])=>schema.includes(key))
		)
		db.child(type+'s').child(storyID).set(mirror)
	}
}

/**
 * Mirrors a story into the legacy database
 * @param {Object} story 
 * @param {story} storyID 
 */
async function legacyStory(story,storyID){
	const schemas = await db.child('schemas').get().then(value)
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
	const ref = await legacyRef(story.categoryID)
	ref.child(storyID).set(legacyStory)
}

/**
 * Get the ref of a category in a legacy database
 * @param {string} categoryID 
 * @returns {string}
 */
 async function legacyRef(categoryID){
	return dbLegacy.child(Object.entries(await db.child('locations').get().then(value)).find(
		([,{categoryIDs}]) => categoryIDs.includes(categoryID)
	)[0]).child(categoryID)
}

/**
 * Generates thumbnails for a category
 * @param {string} categoryID 
 */
async function categoryThumbnail(categoryID){
	const categoryRef = db.child('categories/'+categoryID)
	const category = await categoryRef.get().then(value)
	const snippets = await db.child('snippets').get().then(value)
	category.thumbURLs = category.articleIDs
	.map( id => snippets[id] )
	.filter( snippet => 'thumbURLs' in snippet ) // select articles with images
	.sort( (a,b) => b.featured - a.featured ) // prioritize featured articles
	.slice(0, 3) // trim to first 4 articles
	.map( snippet => snippet.thumbURLs[0] ) // map to image array
	categoryRef.set(category)
}

/**
 * Adds or removes a story to a category's articleIDs collection
 * @param {string} categoryID 
 * @param {string} storyID 
 * @param {Boolean} insert 
 */
async function categoryStoryIDs(categoryID,storyID,insert){
	const storyIDsRef = db.child('categories').child(categoryID).child('articleIDs')
	let storyIDs = await storyIDsRef.get().then(value)
	storyIDs = storyIDs.filter(x=>x!==storyID)
	log(insert,categoryID,storyID,storyIDs)
	if (insert) {
		const snippets = await db.child('snippets').get().then(value)
		const index = storyIDs.findIndex(id=>snippets[id].timestamp < snippets[storyID].timestamp)
		index < 0 ? storyIDs.push(storyID) : storyIDs.splice(index,0,storyID)
		log(index)
	} else {
		const ref = await legacyRef(categoryID)
		ref.child(storyID).remove().catch(e=>log(e))
	}
	log(insert,categoryID,storyID,storyIDs)
	storyIDsRef.set(storyIDs).catch(e=>log(e))
}

/**
 * Remove a story from the notification list
 * @param {String} storyID 
 */
async function removeNotif(storyID){
	const ref = db.child('notifIDs')
	ref.set((await ref.get().then(value)).filter(x=>x!==storyID))
}

exports.checkPendingNotifs = functions.pubsub.schedule('*/5 * * * *').onRun(async () => {
	const now = Math.trunc(Date.now()/1000)
	const sentNotifIDs = await db.child('notifIDs').get().then(value) || []
	const allNotifs = Object.entries(
		await db.child('notifs').get().then(value) || {}
	)
	const readyNotifs = allNotifs.filter(
		([id, notif]) =>
		!sentNotifIDs.includes(id)
		&& notif.notifTimestamp <= now 
		&& notif.notifTimestamp >= now - 60*60*24
	)
	const readyNotifIDs = readyNotifs.map(
		([id, notif]) => id
	)
	log(`saw ${readyNotifIDs.length} notifs ready to be sent`)
	readyNotifs.forEach( ([id, notif]) => {
		db.child('notifs').child(id).child('notifTimestamp').set(now)
		pushNotif(id, notif)
		discord({
			author: '',
			id,
			title: '🔔 ' + notif.title,
			description: notif.blurb
		})
		log(`sent <${id}>: ${notif.title}`)
	})
	db.child('notifIDs').set(sentNotifIDs.concat(readyNotifIDs))
})

/**
 * Pushes a notification to Firebase Cloud notifications' REST API
 * @param {string} id 
 * @param {Object} notif 
 */
async function pushNotif(id, notif) {
	const auth = await db.child('secrets/messaging').get().then(value)
	let payloads = [{
		notification: {
			title: notif.title,
			body: notif.blurb
		},
		data: { articleID: id },
		to: '/topics/' + notif.categoryID
	}]

	const legacyTopicID = {
		General_Info: 'general',
		District: 'district',
		ASB: 'asb',
		Academics: 'bulletin',
		Athletics: 'bulletin',
		Clubs: 'bulletin',
		Colleges: 'bulletin',
		Reference: 'bulletin',
	}[notif.categoryID] || 'testing'
	payloads.push({ ...payloads[0], ...{ to: '/topics/' + legacyTopicID } })

	for(const payload of payloads) await fetch('https://fcm.googleapis.com/fcm/send', {
		method: 'POST',
		headers: {
			'Authorization': auth,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	})
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

/**
 * Sends a message to the Discord webhook
 * @param {string} id 
 * @param {string} title 
 * @param {string} description 
 */
async function discord({ id, author, title, description }) {
	const url = 'https://' + await db.child('secrets/webhook').get().then(value)
	const payload = {
		username: 'Aces Cloud',
		avatar_url: 'https://edit.ahs.app/icon.png',
		content: '',
		embeds: [{
			author: { name: author },
			color: 0x995eff,
			url: 'https://editor.ahs.app/'+id,
			title,
			description,
		}],
	}
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	})
}

const rot13 = string => string.replace(/[a-z]/gi,c=>'NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm'['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.indexOf(c)])

const value = snapshot => snapshot.val()

// VIEW COUNTER FUNCTION

exports.incrementViews = functions.https.onCall((data, context) => {
  const articleID = data.id;
  return db.child('storys').child(articleID).child('views').once('value', 
    snapshot =>{
      // List of database operations (acts like a queue)
      const dataBaseOps = [];
      dataBaseOps.push(db.child('storys').child(articleID).child('views').set(Number(snapshot.val()+1)));
      // Execute all the queued database operations
      Promise.all(dataBaseOps);
    });
});
