# Githereum

[![Build Status](https://travis-ci.com/cardstack/githereum.svg?token=icdHtyWxYqeLi6vwJoV4&branch=master)](https://travis-ci.com/cardstack/githereum)

Githereum is a smart contract and set of tools that aim to be a distributed
replacement for centralized repository hosting such as github or gitlab.

It consists of an ethereum smart contract and a cli for interacting with it.

The contract allows administering and sharing repos, the state of which is tracked
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
  npx truffle exec cli.js <contract> register <repo> [<blob storage>] [options]
  npx truffle exec cli.js <contract> push <path> <repo:tag> [options]
  npx truffle exec cli.js <contract> clone <repo:tag> <path> [options]
  npx truffle exec cli.js <contract> pull <repo:tag> <path> [options]
  npx truffle exec cli.js <contract> head <repo:tag> [options]
  npx truffle exec cli.js <contract> (add|remove) owner <repo> <owner> [options]
  npx truffle exec cli.js <contract> (add|remove) writer <repo> <writer> [options]
  npx truffle exec cli.js <contract> (add|remove) reader <repo> <reader> [options]
  npx truffle exec cli.js keygen <keydir>

Options:
  -f, --from <address>     Address of transaction sender
  -h, --help               Show this screen
  -v, --version            Show version
  -p, --provider <url>     Web3 Provider address, default http://localhost:9545
  --private <keydir>  Directory of private key to use for this operation
  --public <keydir>   Directory of public key to use for this operation

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
```

## Local Setup

You can run and test githereum locally on your computer. Follow these steps to apply the contract to a local network, create a git repository with some commits, and write the commit SHAs to a local blockchain.

1. Clone this `githereum` repo, `cd` into the repo directory, and run `npm install`.
2. Open a second terminal window. There, run `npx truffle dev`.
The truffle dev console will output a bunch of accounts and private keys.
Copy one of the accounts to your clipboard. Leave this process running.
Note that whenever you restart the truffle dev console, you will need to delete the `zos.dev` file and go through all the commands below again.
3. Go back to the first console and save the Account you copied as a variable, e.g. `FROM=0xc57a80df9fea122036981e144d3b504512e85cd9`.
4. `npm run build` - this builds the solidity contract
5. `npx zos push --network development` - this deploys the compiled contract to the fake truffle network running in the other terminal
5. `npx zos create Githereum --network development --no-interactive` - this will create an proxy instance of the contract that you can call functions on.
   It outputs as the last line an address. Save this address in a variable, e.g. `CONTRACT_ADDRESS=0x41f9C54Ba41EB2f1f652fecE6053C4D25E4f33D6`
6. Now you can run githereum commands! For example:
    - First, register a repository name. Run `npx truffle exec cli.js $CONTRACT_ADDRESS register some-name --from $FROM` where `some-name` is any name of your choice.
    - In another directory, create a new git repository `some-name` and add some commits to it. To write those commit SHAs on chain, run `npx truffle exec cli.js $CONTRACT_ADDRESS push /path/to/some-name some-name:my-tag-name --from $FROM`. Here, `my-tag-name` is any name of your choice, not a git tag.
    - Check that your push was successful with `npx truffle exec cli.js $CONTRACT_ADDRESS head some-name:my-tag-name --from $FROM`. The on-chain SHA shown should match the SHA of the last commit you made to your `some-name` repository.
    - Try cloning the repo into a new directory, `npx truffle exec cli.js $CONTRACT_ADDRESS ../clone my-great-repo:one ../new-directory --from $FROM`, `cd ../clone`, and run `git status` to see the commits.

## Remote setup

Usage against a real network is similar to the local steps above. Pass in the `--provider` option with a web3 provider url.

## Testing
1. From the command line execute: `npm run build`. This will clear the `build/` folder and re-generate the ZOS proxy contracts.
2. Then run `npx truffle dev`. This spawns a private blockchain and displays the truffle console. Wait for the prompt to appear.
3. Back in the first terminal window that you ran `npx truffle dev` from, enter the command `test` in the truffle console. This will compile your contracts and run the tests.

You can just leave the truffle console running, and enter `test` from the truffle console in order to re-run your tests. Note that you should re-run `npx truffle build` (in a different terminal) anytime you make a modification to a ZOS contract's implementation in order to redeploy the proxy contract that wraps the implementation contract you modified.

To get a debugger console, you can use `npx -n "--inspect-brk" truffle test` in a different terminal to run with the node debugger.

