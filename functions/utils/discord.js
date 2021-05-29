const fetch = require('node-fetch')
const { db, value } = require('./database')

/**
 * Sends a message to the Discord webhook
 * @param {string} id 
 * @param {string} title 
 * @param {string} description 
 */
exports.discord = async function discord({ id, author, title, description }) {
	const url = 'https://' + await db.child('secrets/webhook').get().then(value)
	const payload = {
		username: 'Aces Cloud',
		avatar_url: 'https://edit.ahs.app/icon.png',
		content: '',
		embeds: [{
			author: { name: author },
			color: 0x995eff,
			url: 'https://editor.ahs.app/' + id,
			title,
			description,
		}],
	}
	return await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	})
}
