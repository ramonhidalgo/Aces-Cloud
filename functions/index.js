const DEBUG = true

const functions = require("firebase-functions")
const admin = require('firebase-admin')
const fetch = require('node-fetch')

// Switch Database to ahs-app
const ahsApp = Object.assign({}, functions.config().firebase)

ahsApp.databaseURL = 'https://ahs-app.firebaseio.com/'
admin.initializeApp(ahsApp);

const database = admin.database()

let secrets
database.ref('secrets').once('value',snapshot=>secrets=snapshot.val())

exports.checkPendingNotifs = functions.pubsub.schedule('* * * * *').onRun(async (context) => {

	console.log(`checking notifs at [${new Date().toISOString()}]`);
	const currentTime = Math.trunc(Date.now() / 1000);

	return database
	 .ref('pendingNotifs')
	 .get()
	 .then(snapshot=>Object.entries(snapshot.val()))
	 .filter( ([ , notif ]) => notif.notifTimestamp < currentTime )
	 .forEach( ([ articleID, notif ]) => {

		console.log(`sending <${articleID}>...`);

		// Change notif timestamp to time of push
		notif.notifTimestamp = currentTime

		// Swap Data
		if(!DEBUG) database.ref('pendingNotifs/' + articleID).remove()
		database.ref('notifications/' + articleID).set(notif)

		// Send Notif
		sendNotif(notif, articleID)
	})
})

async function sendNotif(notif, articleID) {
	// Construct the message
	const message = {
		notification: {
			title: notif.title,
			body: notif.blurb
		},
		data: { articleID },
		to: '/topics/' + notif.categoryID
	};
	// Convert message into string
	const body = JSON.stringify(message)
	// Post request with fetch()
	const result = await fetch('https://fcm.googleapis.com/fcm/send', {
		method: 'POST',
		headers: {
			'Authorization': secrets.messaging,
			'Content-Type': 'application/json'
		},
		body
	})
}


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
