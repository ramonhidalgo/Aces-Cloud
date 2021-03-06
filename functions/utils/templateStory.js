const { dbGet } = require('./database')

exports.templateStory = async () => {
	const schema = await dbGet('schemas/story')
	const template = {}
	for (const key in schema)
		template[key] = {
			'Array<String>': [],
			'String': '',
			'Boolean': false,
			'Int': 0,
		}[schema[key]]
	return template
}
