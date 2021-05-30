const { database, pubsub, https } = require('firebase-functions')

const { publishStory } = require('./exports/publishStory')
const { publishNotif } = require('./exports/publishNotif')
const { publishFeed } = require('./exports/publishFeed')
const { emptyTrash } = require('./exports/emptyTrash')
const { incrementView } = require('./exports/incrementView')

exports.publishStory = database.instance('ahs-app').ref('/storys/{storyID}').onWrite(publishStory)
exports.publishNotif = pubsub.schedule('*/5 * * * *').onRun(publishNotif)
exports.publishFeed = pubsub.schedule('0 0 * * *').onRun(publishFeed)
exports.emptyTrash = pubsub.schedule('0 0 * * *').onRun(emptyTrash)
exports.incrementView = https.onCall(incrementView)
