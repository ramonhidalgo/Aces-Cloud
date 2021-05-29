const { config } = require('firebase-functions')
const admin = require('firebase-admin')

const dbConfig = config().firebase
const app = admin.initializeApp({
	...dbConfig,
	databaseURL: 'https://ahs-app.firebaseio.com'
},'main')

exports.db = admin.database(app).ref()

const appLegacy = admin.initializeApp({
	...dbConfig,
	databaseURL: 'https://arcadia-high-mobile.firebaseio.com'
},'legacy')

exports.dbLegacy = admin.database(appLegacy).ref()
exports.auth = admin.auth(app)

exports.value = snapshot => snapshot.val()
