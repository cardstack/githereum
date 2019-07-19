# Githereum

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
3. After `truffle dev` has displayed a prompt, in a separate terminal window run `npm run oraclize`, and wait until you see the message "successfully deployed all contracts" (its kinda buried in the output).
4. Back in the first terminal window that you ran `truffle dev` from, enter the command `test` in the truffle console. This will compile your contracts and run the tests.

You can just leave the truffle console running, and enter `test` from the truffle console in order to re-run your tests. Note that you should re-run `truffle build` (in a different terminal) anytime you make a modification to a ZOS contract's implementation in order to redeploy the proxy contract that wraps the implementation contract you modified (no need to restart oraclize or `truffle dev`, those can remain running in their own respective terminal windows).

To get a debugger console, you can use `npx -n "--inspect-brk" truffle test` in a different terminal to run with the node debugger

