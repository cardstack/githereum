const Githereum          = require('./githereum');

const neodoc = require('neodoc');
const TruffleContract = require("truffle-contract");
const GithereumContract = require("./build/contracts/Githereum.json");

const help =

// There is a helpful webapp to generate this spec:
// https://felixschl.github.io/neodoc
`Githereum

Usage:
  githereum <contract> register <repo> [<blob storage>] [options]
  githereum <contract> push <path> <repo:tag> [options]
  githereum <contract> clone <repo:tag> <path> [options]
  githereum <contract> pull <repo:tag> <path> [options]
  githereum <contract> head <repo:tag> [options]
  githereum <contract> add owner <repo> <owner> [options]
  githereum <contract> remove owner <repo> <owner> [options]
  githereum <contract> add writer <repo> <writer> [options]
  githereum <contract> remove writer <repo> <writer> [options]

Options:
  -f, --from <address> Address of transaction sender
  -h, --help           Show this screen
  -v, --version        Show version
  -p, --provider <url> Web3 Provider address, default http://localhost:9545

Blob storage when registering a repo:
  This should be a json string containing a description of where the blobs for
  this repo are stored. This is written publically to the blockchain so should
  not contain secrets.

  Default:
    {"type":"tmpfile","path":"tmp/blobs"}

  S3:
    {"type":"s3","bucket":"my-s3-bucket"}

    S3 credentials can be provided with environment variables AWS_ACCESS_KEY_ID
    and AWS_SECRET_ACCESS KEY, or implicitly with security groups within AWS.
`;

let contract, from, log;



async function register(repo, blobStorageJSON) {
  let blobStorageConfig;
  if (blobStorageJSON) { blobStorageConfig = JSON.parse(blobStorageJSON); }
  await Githereum.register(repo, contract, from, { log, blobStorageConfig });
}

async function push(path, repoName, tag) {
  let githereum = new Githereum(path, repoName, contract, from, { log });
  await githereum.push(tag);
}

async function addOwner(repo, owner) {
  await Githereum.addOwner(repo, owner, contract, from, { log });
}

async function removeOwner(repo, owner) {
  await Githereum.removeOwner(repo, owner, contract, from, { log });
}

async function addWriter(repo, writer) {
  await Githereum.addWriter(repo, writer, contract, from, { log });
}

async function removeWriter(repo, writer) {
  await Githereum.removeWriter(repo, writer, contract, from, { log });
}

async function clone(repoName, tag, path) {
  let githereum = new Githereum(path, repoName, contract, from, { log });
  await githereum.clone(tag);
}

async function pull(repoName, tag, path) {
  let githereum = new Githereum(path, repoName, contract, from, { log });
  await githereum.pull(tag);
}

async function head(repoName, tag) {
  await Githereum.head(repoName, tag, contract, { log });
}

module.exports = async function (done) {
  let argv;

  if (arguments.length > 1) {
    [, argv, log] = arguments;
  } else {
    argv = process.argv.slice(process.argv.indexOf('cli.js') + 1);
  // eslint-disable-next-line no-console
    log = console.log.bind(console);
  }


  const { version }  = require('./package.json');

  try {
    const args = neodoc.run(help, { argv, version, smartOptions: true });

    let contractAddress = args['<contract>'];
    let providerUrl = args['--provider'] || "http://localhost:9545";

    from = args['--from'];

    let Githereum = TruffleContract(GithereumContract);
    Githereum.setProvider(providerUrl);
    contract = await Githereum.at(contractAddress);


    if (args.register) {
      await register(args['<repo>'], args['<blob storage>']);
    }

    if (args.add && args.owner) {
      await addOwner(args['<repo>'], args['<owner>']);
    }

    if (args.remove && args.owner) {
      await removeOwner(args['<repo>'], args['<owner>']);
    }

    if (args.add && args.writer) {
      await addWriter(args['<repo>'], args['<writer>']);
    }

    if (args.remove && args.writer) {
      await removeWriter(args['<repo>'], args['<writer>']);
    }

    if (args.push) {
      let [repoName, tag] = args['<repo:tag>'].split(":");
      await push(args['<path>'], repoName, tag);
    }

    if (args.clone) {
      let [repoName, tag] = args['<repo:tag>'].split(":");
      await clone(repoName, tag, args['<path>']);
    }

    if (args.pull) {
      let [repoName, tag] = args['<repo:tag>'].split(":");
      await pull(repoName, tag, args['<path>']);
    }

    if (args.head) {
      let [repoName, tag] = args['<repo:tag>'].split(":");
      await head(repoName, tag);
    }
  } catch(e) {
    done(e);
  }

  done();
};

