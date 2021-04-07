onst functions = require("firebase-functions");
const admin = require('firebase-admin');

// Switch Database to ahs-app
const ahsApp = Object.assign({}, functions.config().firebase)

ahsApp.databaseURL = 'https://ahs-app.firebaseio.com/'
admin.initializeApp(ahsApp);

const database = admin.database()

let secrets
database.ref('secrets').once('value',snapshot=>secrets=snapshot.val())

exports.checkPendingNotifs = functions.pubsub.schedule('every 10 minutes').onRun((context) => {
	console.log('Check Messages!');
	const currentTime = Math.trunc(Date.now() / 1000);

	const pendingRef = database.ref("pendingNotifs")
	console.log("Current Time: " + currentTime);
	return pendingRef.once('value',
		snapshot => {
			console.log(snapshot.numChildren());
			// List of database operations (acts like a queue)
			const dataBaseOps = [];
			// Loop through each child
			snapshot.forEach(child => {
				console.log(child.key);
				// childData - hold the values of the notif (can access properties ex. childData.notifTimestamp)
				const childData = child.val()
				console.log(child.key + ": " + "timestamp: " + childData.notifTimestamp)
				
				// If the notifTimestamp is in the past, then swap data and send notif        
				if (Number(childData.notifTimestamp) < currentTime) return false
				
				console.log("Transfer Ready " + child.key);
				// Change notif timestamp to time of push
				childData.notifTimestamp = currentTime
				// Swap Data
				dataBaseOps.push(database.ref('pendingNotifs/' + child.key).remove())
				dataBaseOps.push(database.ref('notifications/' + child.key).set(childData))
				// Send Notif
				sendNotif(childData, child.key);
			})
			// Execute all the queued database operations
			Promise.all(dataBaseOps);
		})

})

function sendNotif(articleData, key) {
	// Construct the message
	const message = {
		notification: {
			title: articleData.title,
			body: articleData.blurb
		},
		data: {
			articleID: key
		},
		to: '/topics/' + articleData.categoryID
	};
	// Convert message into string
	const body = JSON.stringify(message);
	// Post request with fetch()
	const result = fetch('https://fcm.googleapis.com/fcm/send', {
		method: 'POST',
		headers: {
			'Authorization': secrets.messaging,
			'Content-Type': 'application/json'
		},
		body
	})
	console.log(result)
}


// VIEW COUNTER FUNCTION

exports.incrementViews = functions.https.onCall((data, context) => {
  const articleID = data.id;
  admin.database().ref('/articles/'+articleID+'/views').once('value', 
    snapshot =>{
      // List of database operations (acts like a queue)
      const dataBaseOps = [];
      dataBaseOps.push(admin.database().ref('/articles/'+articleID+'/views').set(Number(snapshot.val()+1)));
      // Execute all the queued database operations
      Promise.all(dataBaseOps);
      return {status: "Good"};
    });
});
