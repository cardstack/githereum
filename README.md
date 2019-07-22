# Githereum

[![Build Status](https://travis-ci.com/cardstack/githereum.svg?token=icdHtyWxYqeLi6vwJoV4&branch=master)](https://travis-ci.com/cardstack/githereum)

Gitchain implementation in ethereum

## Installation
We leverage ZOS for our smart contracts. ZOS really likes to use `npm`, so instead of trying to fight the system, we're using `npm` for this project instead of `yarn`.
To install this project locally, execute:
1. `git clone <repository url>`
2. `cd githereum`
3. `npm install`

## Testing
1. From the command line execute: `npm run build`. This will clear the `build/` folder and re-generate the ZOS proxy contracts.
2. Then run `truffle dev`. This spawns a private blockchain and displays the truffle console. Wait for the prompt to appear.
3. Back in the first terminal window that you ran `truffle dev` from, enter the command `test` in the truffle console. This will compile your contracts and run the tests.

You can just leave the truffle console running, and enter `test` from the truffle console in order to re-run your tests. Note that you should re-run `truffle build` (in a different terminal) anytime you make a modification to a ZOS contract's implementation in order to redeploy the proxy contract that wraps the implementation contract you modified.

To get a debugger console, you can use `npx -n "--inspect-brk" truffle test` in a different terminal to run with the node debugger

