# Githereum

[![Build Status](https://travis-ci.com/cardstack/githereum.svg?token=icdHtyWxYqeLi6vwJoV4&branch=master)](https://travis-ci.com/cardstack/githereum)

Githereum is a smart contract and set of tools that aim to be a distributed
replacement for centralized repository hosting such as github or gitlab.

It consists of an ethereum smart contract and a cli for interacting with it.

The contract allows administring and sharing repos, the state of which is tracked
on-chain allowing setting owners and writers, allowing distributed control of
who has access to a repository along with cryptographically guaranteeing that
different users have the same view of the state of the repo.

Storage is off-chain, with a pluggable storage backend that supports S3, IPFS,
google-drive [and more](https://www.npmjs.com/package/abstract-blob-store#some-modules-that-use-this)

Distributing the repo content can be accomplished via any method including
through offline distribution through the "sneakernet", allowing coordination of
repository state even in scenarios where communication is unreliable or of low
bandwidth


## Installation

We recommend using `npm`, not yarn, to install this package. This package relies on ZOS ([OpenZeppelin](https://openzeppelin.com/sdk/)), which relies on `npm`.

To install this project locally, execute:
1. `git clone <repository url>`
2. `cd githereum`
3. `npm install`


## Usage

After deploying the contract, this is how to use the CLI.

In the examples below, `<contract>` is the
address of the contract you deployed, `<path>` is the local path to your git repo,
and `<tag>` is the name of the tag to push to or clone from.

```
Githereum

Usage:
  npx truffle exec cli.js <contract> register <repo> [<blob options>] [--from <address>]
  npx truffle exec cli.js <contract> push <path> <repo:tag> [--from <address>]
  npx truffle exec cli.js <contract> clone <repo:tag> <path>
  npx truffle exec cli.js <contract> pull <repo:tag> <path>
  npx truffle exec cli.js <contract> head <repo:tag>
  npx truffle exec cli.js <contract> add owner <repo> <owner> [--from <address>]
  npx truffle exec cli.js <contract> remove owner <repo> <owner> [--from <address>]
  npx truffle exec cli.js <contract> add writer <repo> <writer> [--from <address>]
  npx truffle exec cli.js <contract> remove writer <repo> <writer> [--from <address>]

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
```

## Testing
1. From the command line execute: `npm run build`. This will clear the `build/` folder and re-generate the ZOS proxy contracts.
2. Then run `npx truffle dev`. This spawns a private blockchain and displays the truffle console. Wait for the prompt to appear.
3. Back in the first terminal window that you ran `npx truffle dev` from, enter the command `test` in the truffle console. This will compile your contracts and run the tests.

You can just leave the truffle console running, and enter `test` from the truffle console in order to re-run your tests. Note that you should re-run `npx truffle build` (in a different terminal) anytime you make a modification to a ZOS contract's implementation in order to redeploy the proxy contract that wraps the implementation contract you modified.

To get a debugger console, you can use `npx -n "--inspect-brk" truffle test` in a different terminal to run with the node debugger.

