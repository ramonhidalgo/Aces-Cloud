const { https } = require('firebase-functions')
const { dbGet, dbSet } = require('../utils/database')

exports.incrementViews = https.onCall( async ({ id: storyID }) => {
  const path = [ 'storys', storyID, 'views' ]
  dbSet( path, Number( await dbGet(path) + 1 ) )
})

