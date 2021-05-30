/**
 * Checks if an array includes any of the subset
 * @param {any[]} array 
 * @param  {...any} subset 
 * @returns {Boolean}
 */
 exports.someIn = (array,...subset) => array.some(element=>subset.includes(element))

/**
 * Checks if an array includes all of the subset
 * @param {any[]} array 
 * @param  {...any} subset 
 * @returns {Boolean}
 */
exports.allIn = (array,...subset) => array.every(element=>subset.includes(element))

/**
 * Returns list of properties whose values are different between two objects 
 * @param {Object} a 
 * @param {Object} b 
 * @returns {Array}
 */
exports.diff = (a,b) => Object.keys({ ...a, ...b })
.filter( k => JSON.stringify(a[k]) !== JSON.stringify(b[k]) )

/**
 * Returns a formatted list of properties and their before and after values
 * @param {Object} a 
 * @param {Object} b 
 * @returns {String}
 */
 exports.formattedDiff = (a,b) => exports.diff(a,b)
.map( k =>
	[k,a[k],b[k]]
	.map( s => s === undefined ? null : s )
	.map( JSON.stringify )
	.map( s => s.length > 16 ? s.substring(0,16) + '...' : s )
)
.map(([k,a,b])=>`${k}: ${a} → ${b}`)
.join('\n')

