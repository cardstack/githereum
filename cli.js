const Githereum          = require('./githereum');

const neodoc = require('neodoc');

const help =

`Githereum

Usage:
  githereum <contract> register --from <address> <repo>
  githereum <contract> push --from <address> <path> <repo:tag>
  githereum <contract> clone <repo:tag> <path>
  githereum <contract> pull <repo:tag> <path>
  githereum <contract> head <repo:tag>
  githereum <contract> add owner --from <address> <repo> <owner>
  githereum <contract> remove owner --from <address> <repo> <owner>
  githereum <contract> add writer --from <address> <repo> <writer>
  githereum <contract> remove writer --from <address> <repo> <writer>

Options:
  -f, --from <address>  Address of transaction sender
  -h, --help            Show this screen
  -v, --version         Show version
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
    log(argv);
    const args = neodoc.run(help, { argv, version, smartOptions: true });

    contractAddress = args['<contract>'];
    from = args['--from'];

    log(args);

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

