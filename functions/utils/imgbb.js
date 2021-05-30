const fetch = require('node-fetch')
const FormData = require('form-data')
const { dbGet } = require('./database')

/**
 * Uploads an image to ImgBB.com
 * @param {*} data URL or image file
 * @returns {urlSet}
 */
exports.imgbb = async ( data ) => {
	const body = new FormData()
	body.append('image',data)
	const response = await fetch(
		'https://' + await dbGet('secrets/imgbb-aces-cloud'),
		{ method: 'POST', body }
	)
	const { data: { image, medium, thumb } } = await response.json()
	return {
		imageURL: medium ? medium.url : image.url,
		thumbURL: thumb.url,
	}
}
