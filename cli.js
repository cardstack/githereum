const Githereum          = require('./githereum');

const neodoc = require('neodoc');

const help =

// There is a helpful webapp to generate this spec:
// https://felixschl.github.io/neodoc
`Githereum

Usage:
  githereum <contract> register <repo> [<blob options>] [--from <address>]
  githereum <contract> push <path> <repo:tag> [--from <address>]
  githereum <contract> clone <repo:tag> <path>
  githereum <contract> pull <repo:tag> <path>
  githereum <contract> head <repo:tag>
  githereum <contract> add owner <repo> <owner> [--from <address>]
  githereum <contract> remove owner <repo> <owner> [--from <address>]
  githereum <contract> add writer <repo> <writer> [--from <address>]
  githereum <contract> remove writer <repo> <writer> [--from <address>]

Options:
  -f, --from <address>  Address of transaction sender
  -h, --help            Show this screen
  -v, --version         Show version

Blob options when registering a repo:
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

let contractAddress, from, log;



async function register(repo) {
  await Githereum.register(repo, contractAddress, from, { log });
}

async function push(path, repoName, tag) {
  let githereum = new Githereum(path, repoName, contractAddress, from, { log });
  await githereum.push(tag);
}

async function addOwner(repo, owner) {
  await Githereum.addOwner(repo, owner, contractAddress, from, { log });
}

async function removeOwner(repo, owner) {
  await Githereum.removeOwner(repo, owner, contractAddress, from, { log });
}

async function addWriter(repo, writer) {
  await Githereum.addWriter(repo, writer, contractAddress, from, { log });
}

async function removeWriter(repo, writer) {
  await Githereum.removeWriter(repo, writer, contractAddress, from, { log });
}

async function clone(repoName, tag, path) {
  let githereum = new Githereum(path, repoName, contractAddress, from, { log });
  await githereum.clone(tag);
}

async function pull(repoName, tag, path) {
  let githereum = new Githereum(path, repoName, contractAddress, from, { log });
  await githereum.pull(tag);
}

async function head(repoName, tag) {
  await Githereum.head(repoName, tag, contractAddress, { log });
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

    contractAddress = args['<contract>'];
    from = args['--from'];

    if (args.register) {
      await register(args['<repo>']);
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

