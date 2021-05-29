const { pubsub } = require('firebase-functions')
const { dbGet, dbSet } = require('../utils/database')

exports.emptyTrash = pubsub.schedule('0 0 * * *').onRun(async () => {
	const now = Math.trunc(Date.now()/1000)
})
