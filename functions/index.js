const DEBUG = false

const functions = require("firebase-functions")
const admin = require('firebase-admin')
const fetch = require('node-fetch')

admin.initializeApp({
	...functions.config().firebase,
	databaseURL: 'https://ahs-app.firebaseio.com'
});

const database = admin.database()

exports.checkPendingNotifs = functions.pubsub.schedule('* * * * *').onRun(async () => {
	const now = Math.trunc(Date.now()/1000)
	const pendingNotifs = await database.ref('pendingNotifs').get().then(x=>x.val())
	return Object.entries(pendingNotifs || {})
	.filter( ([id,notif]) => notif.notifTimestamp < now )
	.map( ([id,notif]) => ([id,Object.assign(notif,{notifTimestamp:now})]) )
	.forEach( ([id,notif]) => {
		if(!DEBUG) database.ref('pendingNotifs/' + id).remove()
		database.ref('notifications/' + id).set(notif)
		pushNotif(id, notif)
		discordNotif(id, notif)
		console.log(`sent <${id}>`)
	})
})

async function pushNotif(id, notif) {
	const auth = await database.ref('secrets/messaging').get().then(x=>x.val())
	const payload = {
		notification: {
			title: notif.title,
			body: notif.blurb
		},
		data: { articleID: id },
		to: '/topics/' + notif.categoryID
	}
	const response = await fetch('https://fcm.googleapis.com/fcm/send', {
		method: 'POST',
		headers: {
			'Authorization': auth,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	})
}

async function discordNotif(id, notif) {
	const url = 'https://' + await database.ref('secrets/webhook').get().then(x=>x.val())
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
