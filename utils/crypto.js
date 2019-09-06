const crypto          = require('crypto');

const algorithm = 'aes-256-cbc';


function randomKey() {
  return crypto.randomBytes(32).toString('hex');
}

function encrypt(text, key) {
  let cipher = crypto.createCipher(algorithm, key);
  let crypted = cipher.update(text, 'utf8', 'hex');
  return crypted + cipher.final('hex');
}

function decrypt(text, key) {
  var decipher = crypto.createDecipher(algorithm, key);
  let decrypted = decipher.update(text, 'hex', 'utf8');
  return decrypted + decipher.final('utf8');
}


module.exports = { randomKey, encrypt, decrypt };