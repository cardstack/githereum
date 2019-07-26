const util   = require('util');
const exec   = util.promisify(require('child_process').exec);

async function shellCommand(command) {
  let result = await exec(command);
  return result.stdout;
}
module.exports = { shellCommand };
