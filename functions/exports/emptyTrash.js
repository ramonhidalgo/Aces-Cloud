const { pubsub } = require('firebase-functions')
const { dbGet, dbSet } = require('../utils/database')

exports.emptyTrash = async () => {
	const now = Math.trunc(Date.now()/1000)
}
