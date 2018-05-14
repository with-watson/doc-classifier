// promise to execute a rm -rf
const rimraf = require('rimraf')
const util = require('util')

const rimrafPromise = util.promisify(rimraf)

function _getRimrafPromise(path) {
  // remove the temp directory and files
  // return a promise
  return rimrafPromise(path).then(() => {;}, (reason) => {
    console.error(`unable to remove ${path}`)
    console.error(reason)
  })
}

module.exports = _getRimrafPromise
