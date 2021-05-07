const functions = require('firebase-functions')
const admin = require('firebase-admin')
const fetch = require('node-fetch')
const { log, warn, error } = require('firebase-functions/lib/logger')

admin.initializeApp({
	...functions.config().firebase,
	databaseURL: 'https://ahs-app.firebaseio.com'
});

const database = admin.database()

exports.categoryThumbnails = functions.database.ref('snippets/{articleID}').onUpdate( async snapshot => {
	const snippet = snapshot.val()
	const categoryRef = database.ref('categories/'+snippet.categoryID)
	const category = await categoryRef.get().then(value) || {}
	category.thumbURLs = category.articleIDs
	.map( id => database.ref('snippets').get().then(value) )
	.filter( snippet => 'thumbURLs' in snippet ) // select articles with images
	.sort( (a,b) => b.featured - a.featured ) // prioritize featured articles
	.slice(0, 3) // trim to first 4 articles
	.map( snippet => snippet.thumbURLs[0] ) // map to image array
	categoryRef.set(category)
})

exports.checkPendingNotifs = functions.pubsub.schedule('* * * * *').onRun(async () => {
	const now = Math.trunc(Date.now()/1000)
	const sentNotifIDs = await database.ref('notifIDs').get().then(value) || []
	const allNotifs = Object.entries(
		await database.ref('notifs').get().then(value) || {}
	)
	const readyNotifs = allNotifs.filter(
		([id, notif]) => !sentNotifIDs.includes(id) && notif.notifTimestamp <= now 
	)
	const readyNotifIDs = readyNotifs.map(
		([id, notif]) => id
	)
	log(`saw ${readyNotifIDs.length} notifs ready to be sent`)
	readyNotifs.forEach( ([id, notif]) => {
		database.ref(`notifs/${id}/notifTimestamp`).set(now)
		pushNotif(id, notif)
		discordNotif(id, notif)
		log(`sent <${id}>: ${notif.title}`)
	})
	database.ref('notifIDs').set(sentNotifIDs.concat(readyNotifIDs))
})

async function pushNotif(id, notif) {
	const auth = await database.ref('secrets/messaging').get().then(value)
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

async function discordNotif(id, notif) {
	const url = 'https://' + await database.ref('secrets/webhook').get().then(value)
	const payload = {
		username: 'Aces Cloud',
		avatar_url: 'https://edit.ahs.app/icon.png',
		content: '',
		embeds: [{
			color: 0x995eff,
			url: 'https://editor.ahs.app/'+rot13(id),
			title: '🔔 ' + notif.title,
			description: notif.blurb,
		}],
	}
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	})
}

const rot13 = string => string.replace(/[a-z]/gi,c=>'NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm'['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.indexOf(c)])

const value = snapshot => snapshot.val()

// VIEW COUNTER FUNCTION

exports.incrementViews = functions.https.onCall((data, context) => {
  const articleID = data.id;
  return database.ref('/articles/'+articleID+'/views').once('value', 
    snapshot =>{
      // List of database operations (acts like a queue)
      const dataBaseOps = [];
      dataBaseOps.push(admin.database().ref('/articles/'+articleID+'/views').set(Number(snapshot.val()+1)));
      // Execute all the queued database operations
      Promise.all(dataBaseOps);
    });
});
