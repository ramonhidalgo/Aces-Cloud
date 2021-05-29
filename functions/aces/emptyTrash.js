const { pubsub } = require('firebase-functions')
const { db, value } = require('./database')

exports.emptyTrash = pubsub.schedule('0 0 * * *').onRun(async () => {
	const now = Math.trunc(Date.now()/1000)
})
