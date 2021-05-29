const { pubsub } = require('firebase-functions')
const { discord } = require('./discord')
const { db, value } = require('./database')

exports.publishFeed = pubsub.schedule('0 0 * * *').onRun(async () => {
	
})
