const { config } = require('firebase-functions')
const admin = require('firebase-admin')

const dbConfig = config().firebase
const app = admin.initializeApp({
	...dbConfig,
	databaseURL: 'https://ahs-app.firebaseio.com'
},'main')

const db = admin.database(app).ref()

const appLegacy = admin.initializeApp({
	...dbConfig,
	databaseURL: 'https://arcadia-high-mobile.firebaseio.com'
},'legacy')

const dbLegacy = admin.database(appLegacy).ref()

const path = paths => Array.isArray(paths) ? paths.join('/') : paths

exports.auth = admin.auth(app)
exports.dbGet = paths => db.child(path(paths)).get().then(snapshot=>snapshot.val())
exports.dbSet = (paths,val) => db.child(path(paths).join('/')).set(val)
exports.dbSetLegacy = (paths,val) => dbLegacy.child(path(paths).join('/')).set(val)
