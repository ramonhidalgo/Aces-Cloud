const fetch = require('node-fetch')
const FormData = require('form-data')
const { db, value } = require('./database')

/**
 * Uploads an image to ImgBB.com
 * @param {*} data URL or image file
 * @returns {urlSet}
 */
exports.imgbb = async ( data ) => {
	const body = new FormData()
	body.append('image',data)
	const response = await fetch(
		'https://' + await db.child('secrets').child('imgbb').get().then(value),
		{ method: 'POST', body }
	)
	const { data: { image, medium, thumb } } = await response.json()
	return {
		imageURL: medium ? medium.url : image.url,
		thumbURL: thumb.url,
	}
}
