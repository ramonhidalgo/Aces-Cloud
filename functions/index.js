const DEBUG = true

const functions = require("firebase-functions")
const admin = require('firebase-admin')
const fetch = require('node-fetch')

// Switch Database to ahs-app
const config = Object.assign({}, functions.config().firebase)
config.databaseURL = 'https://ahs-app.firebaseio.com/'
admin.initializeApp(config);

const database = admin.database()


exports.checkPendingNotifs = functions.pubsub.schedule('* * * * *').onRun(async (context) => {
	const now = Math.trunc(Date.now()/1000)
	const pendingNotifs = await database.ref('pendingNotifs').get().then(x=>x.val())
	return Object.entries(pendingNotifs || {})
	.filter( ([id,notif]) => notif.notifTimestamp < now )
	.map( ([id,notif]) => ([id,Object.assign(notif,{notifTimestamp:now})]) )
	.forEach( ([id,notif]) => {
		if(!DEBUG) database.ref('pendingNotifs/' + id).remove()
		database.ref('notifications/' + id).set(notif)
		pushNotif(id, notif)
		console.log(`sent <${id}>`)
	})
})

async function pushNotif(id, notif) {
	const secrets = await database.ref('secrets').get().then(x=>x.val())
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
			'Authorization': secrets.messaging,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
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
