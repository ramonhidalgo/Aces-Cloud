const { https } = require('firebase-functions')
const { db } = require('./database')

exports.incrementViews = https.onCall( ({ id: articleID }) => {
  const ref = db.child('storys').child(articleID).child('views')
  ref.once('value', snapshot => ref.set(Number(snapshot.val()+1)))
})

