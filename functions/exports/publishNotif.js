const { pubsub } = require('firebase-functions')
const { discord } = require('../utils/discord')
const { dbGet, dbSet } = require('../utils/database')

exports.publishNotif = pubsub.schedule('*/5 * * * *').onRun(async () => {
	const now = Math.trunc(Date.now()/1000)
	const sentNotifIDs = await dbGet('notifIDs') || []
	const allNotifs = Object.entries( await dbGet('notifs') || {} )
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
		dbSet( ['notifs',id,'notifTimestamp'], now )
		pushNotif(id, notif)
		discord({
			author: '',
			id,
			title: '🔔 ' + notif.title,
			description: notif.blurb
		})
		log(`sent <${id}>: ${notif.title}`)
	})
	dbSet( 'notifIDs', sentNotifIDs.concat(readyNotifIDs) )
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
