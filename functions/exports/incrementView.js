const { dbGet, dbSet } = require('../utils/database')

exports.incrementView = async ({ id: storyID }) => {
  const path = [ 'storys', storyID, 'views' ]
  dbSet( path, Number( await dbGet(path) + 1 ) )
}

