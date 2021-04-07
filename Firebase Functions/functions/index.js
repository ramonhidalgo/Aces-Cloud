const functions = require("firebase-functions");
const admin = require('firebase-admin');

// Switch Database to ahs-app
const ahsApp = Object.assign({}, functions.config().firebase)
ahsApp.databaseURL = 'https://ahs-app.firebaseio.com/'
admin.initializeApp(ahsApp);

exports.checkPendingNotifs = functions.pubsub.schedule('every 1 minutes').onRun((context) => {
  console.log('Check Messages!');
  var currentTime = Math.trunc(Date.now()/1000);
  getMessagingSecret();
  const pendingRef = admin.database().ref("pendingNotifs");
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
          var childData = child.val();
          console.log(child.key +": "+"timestamp: "+childData.notifTimestamp);
          // If the notifTimestamp is in the past, then swap data and send notif        
          if(Number(childData.notifTimestamp) >= currentTime){
            console.log("Transfer Ready "+ child.key);
            // Swap Data
            dataBaseOps.push(admin.database().ref('pendingNotifs/'+child.key).set(null));
            dataBaseOps.push(admin.database().ref('notifications/'+child.key).set(childData));
            // Send Notif
            sendNotif(articleData, child.key);

	const pendingRef = admin.database().ref("pendingNotifs");
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
				var childData = child.val();
				console.log(child.key + ": " + "timestamp: " + childData.notifTimestamp);
				// If the notifTimestamp is in the past, then swap data and send notif        
				if (Number(childData.notifTimestamp) >= currentTime) {
					console.log("Transfer Ready " + child.key);
					// Swap Data
					dataBaseOps.push(admin.database().ref('pendingNotifs/' + child.key).remove());
					dataBaseOps.push(admin.database().ref('notifications/' + child.key).set(childData));
					// Send Notif
					sendNotif(articleData, child.key);
				}
			})
			// Execute all the queued database operations
			Promise.all(dataBaseOps);
		})

})

async function sendNotif(articleData, key) {
  admin.database().ref('secrets/messaging').once('value', 
  snapshot => {
    var messagingSecret = snapshot.val();

  });
  
}

async function getMessagingSecret(){
  return admin.database().ref('secrets/messaging').once('value', 
  snapshot => {
    // Get secrets
    var messagingSecret = snapshot.val();
    // Construct the message
    var message = {
      notification:{title: articleData.title, body: articleData.notif},
      data:{articleID: key},
      to: '/topics/' + articleData.categoryID
    };
    // Convert message into string
    var body = JSON.stringify(message);
    // Post request with fetch()
    fetch('https://fcm.googleapis.com/fcm/send',
      { method: 'POST',
        headers: {'Authorization': messagingSecret,'Content-Type': 'application/json'
        },
        body: body}
    )
    });
}
