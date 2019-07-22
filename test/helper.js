const chai = require('chai');

const {
  NULL_ADDRESS,
  NULL_ADDRESS_REGEX,
  NULL_BYTES32
} = require('../lib/constants');
chai.use(require("chai-as-promised"));

const GAS_LIMIT = 200000;
const DEPLOY_GAS_LIMIT = 6500000;
const PREFIX = 'Returned error: VM Exception while processing transaction: ';

const travisHeartbeat = ms => setInterval(() => console.log("        still processing..."), ms); //eslint-disable-line no-console

const waitForEvent = (_event, _from = 0, _to = 'latest') =>
  new Promise ((resolve,reject) =>
    _event({fromBlock: _from, toBlock: _to}, (e, ev) =>
      e ? reject(e) : resolve(ev)));

const assertMinBalance = async (address, minBalanceEth=1) => {
  let balance = await web3.eth.getBalance(address);
  let balanceInEth = parseInt(web3.utils.fromWei(balance, 'ether'));
  if (balanceInEth < minBalanceEth) {
    throw new Error(`The address ${address} has less than the minimum testing balance ${minBalanceEth} ETH. Please restart your blockchain to reinitialize balances. If this message frequently appears consider initializing ganache with custom balances.`);
  }
};

async function truffleExec(scriptPath, argv="") {
  const script = require(`../scripts/${scriptPath}`);

  let logs = [];

  let logger = {
    log(...args) {
      logs.push(args.join(" "));
    }
  };

  return await new Promise ((resolve,reject) =>
    script(err => err ? reject(err) : resolve(logs.join("\n")), { argv: argv.split(/\s+/), logger })
  );
}

module.exports = {
  travisHeartbeat,
  waitForEvent,
  assertMinBalance,
  NULL_BYTES32,
  NULL_ADDRESS,
  NULL_ADDRESS_REGEX,
  PREFIX,
  GAS_LIMIT,
  DEPLOY_GAS_LIMIT,
  truffleExec
};