// promise to send a file and callback when sent
const util = require('util')
function _getSendFilePromise(res, path) {
  const sendFilePromise = util
    .promisify(res.sendFile)
    .bind(res)
  
    return sendFilePromise(path)

}

module.exports = _getSendFilePromise
