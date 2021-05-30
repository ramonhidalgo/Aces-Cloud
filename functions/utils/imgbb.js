const fetch = require('node-fetch')
const FormData = require('form-data')
const { dbGet } = require('./database')

/**
 * Uploads an image to ImgBB.com
 * @param {URL} URL
 * @returns {urlSet}
 */
exports.imgbb = async ( url ) => {
	try {
		const body = new FormData()
		body.append('image', url)
		const response = await fetch(
			'https://' + await dbGet('secrets/imgbb-aces-cloud'),
			{ method: 'POST', body }
		)
		const { data: { image, medium, thumb } } = await response.json()
		return {
			imageURL: medium ? medium.url : image.url,
			thumbURL: thumb.url,
		}
	} catch (error) {
		// placeholder photo
		return {
			imageURL: url,
			thumbURL: url,
		}
	}
}
