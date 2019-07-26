const { resolve }           = require('path');
const util                  = require('util');
const writeFile             = util.promisify(require('fs').writeFile);
const { shellCommand }      = require('./utils/async');
const logger                = require('debug')('gitchain-cli');
const { Gitchain }          = require('./gitchain');

const program = require('commander');

const { version } = require('./package.json');


function setupCli(log, wrapCommand) {
  program
    .version(version)
    .command('push <repo-path> <tag>')
    .option('-n, --network=<network>', 'The network to send transactions to')
    .action(wrapCommand(async function(repoPath, tag, cmd) {

      let gitchain = new Gitchain(repoPath, { network, log });
      await gitchain.push(tag);
    }))
    .command('clone <tag> <repo-path>')
    ;
}





module.exports = async function (done) {
  let argv, log;

  if (arguments.length > 1) {
    [, argv, log] = arguments;
  } else {
    argv = process.argv.slice(process.argv.indexOf('cli.js') + 1);
  // eslint-disable-next-line no-console
    log = console.log.bind(console);
  }


  await program.parse(['', ''].concat(argv));

  return await new Promise ((resolve,reject) => {

    function wrapCommand(func) {
      return async function(...args) {
        let cmd = args.pop();
        let network = cmd.network || 'development';
        try {
          return await func(network, ...args);
        } catch (e) {
          log(e);
          reject(e);
          done(e);
        }
        resolve();
        done();
      };
    }

    setupCli(log, wrapCommand);


    if (!argv.length) {
      program.outputHelp();
      log("");
      reject("No arguments provided, exiting");
      done("No arguments provided, exiting");
    }

  });


};









// class CLI {
//   constructor(parsed, log=logger) {
//     this.command    = parsed.args[0];
//     this.arguments  = parsed.args.slice(1);
//     this.options    = parsed.opt;
//     this.log        = log;
//   }

//   async execute() {
//     return await this[this.command].call(this);
//   }

//   async push () {
//     let [repoPath, tag] = this.arguments;

//     let opts = { logger: this.log };

//     let gitchain = new Gitchain(repoPath, opts);

//     return await gitchain.push(tag);
//   }


//   // async clone() {
//   //   let [tag, repoPath] = this.arguments;

//   //   let gitchain = new Gitchain(repoPath, { logger: this.log, keyDir: this.options.keydir });

//   //   await gitchain.clone(tag);
//   // }

//   // async keygen() {
//   //   await shellCommand(`mkdir -p "${this.options.keydir}"`);

//   //   let privateKey = makeSawtoothKey();
//   //   let privateKeyPath = resolve(this.options.keydir, 'sawtooth.priv');


//   //   await writeFile(privateKeyPath, privateKey.privateKeyBytes.hexSlice());
//   // }

//   // async head() {
//   //   let [tag] = this.arguments;

//   //   return await Gitchain.head(tag || "", { logger: this.log});
//   // }

//   // async pull() {
//   //   let [tag, repoPath] = this.arguments;

//   //   let gitchain = new Gitchain(repoPath, { logger: this.log, keyDir: this.options.keydir });

//   //   await gitchain.pull(tag);
//   // }

//   // async url() {
//   //   let [tag] = this.arguments;
//   //   return Gitchain.tagUrl(tag || "", {logger: this.log});
//   // }
// }




// // const opts = {
// //   network: {
// //     required: true,
// //     short: 'n'
// //   }
// // };

// module.exports = async function (done) {
//   let argv, log;

//   if (arguments.length > 1) {
//     [, argv, log] = arguments;
//   } else {
//     argv = process.argv.slice(3);
//   // eslint-disable-next-line no-console
//     log = console.log.bind(console);
//   }

//   try {

//   } catch (e) {
//     done(e);
//   }
//   done();


//   // let parsedOpts = options.parse(opts);

//   // await truffleScript({
//   //   done,
//   //   exec,
//   //   title: 'add-admin',
//   //   description: `This script adds an administrator to the specified contract address.`,
//   //   requiredOptions: ['contract-address', 'admin-address'],
//   //   options: [
//   //     { name: "contract-address", alias: 'c', type: String, description: "The contract address of contract for which to add an admin" },
//   //     { name: "admin-address", alias: 'a', type: String, description: "The Ethereum address of the user to add as an administrator" },
//   //     { name: "from", type: String, description: "The address to send the transaction from." },
//   //   ],
//   //   invokeArgs: arguments
//   // });
// };