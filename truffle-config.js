module.exports = {
  compilers: {
    solc: {
      version: "0.5.10",
    },
  },
  networks: {
    development: {
      host: 'localhost',
      port: 9545,
      gas: 6500000,
      gasPrice: 5e9,
      network_id: '*',
    },
    rinkeby: {
      host: process.env.JSON_RPC_HOST || 'localhost',
      port: process.env.JSON_RPC_PORT || 8545,
      gas: 6500000,
      gasPrice: 15e9, // 15 gwei
      network_id: '4',
    },
    mainnet: {
      host: 'localhost',
      port: 8545,
      gas: 6500000,
      gasPrice: 15e9, //15 gwei
      network_id: '1',
    }
  }
};
