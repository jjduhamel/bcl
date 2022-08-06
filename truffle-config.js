const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const mnemonic = fs.readFileSync('.mnemonic').toString().trim();

module.exports = {
  networks: {
    // Useful for testing. The `development` name is special - truffle uses it by default
    // if it's defined here and no other network is specified at the command line.
    // You should run a client (like ganache, geth, or parity) in a separate terminal
    // tab if you use this network and you must also set the `host`, `port` and `network_id`
    // options below to some value.
    //
    development: {
      provider: () => new HDWalletProvider(mnemonic, 'http://localhost:8545'),
      network_id: "*",       // Any network (default: none)
    },
    test: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 9545,
      network_id: "*",       // Any network (default: none)
    },
    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, 'wss://rinkeby.infura.io/ws/v3/2185ad08ea904e85b06c383c4cd6b902'),
      network_id: 4,
      gas: 5500000,
      gasPrice: 20000000000,  // 20 gwei (in wei) (default: 100 gwei)
      confirmations: 2,
      timeoutBlocks: 200,
      networkCheckTimeout: 60000,
      skipDryRun: true
    },
    goerli: {
      provider: () => new HDWalletProvider(mnemonic, 'wss://goerli.infura.io/ws/v3/2185ad08ea904e85b06c383c4cd6b902'),
      network_id: 5,
      gas: 5500000,
      gasPrice: 5000000000,  // 5 gwei (in wei) (default: 100 gwei)
      confirmations: 2,
      timeoutBlocks: 200,
      networkCheckTimeout: 60000,
      skipDryRun: true
    },
    matic: {
      provider: () => new HDWalletProvider(mnemonic, 'wss://polygon-mainnet.g.alchemy.com/v2/Sv3cls4E24PIJWx4lZG0k98dLAgTOeZF'),
      network_id: 137,
      gas: 5500000,
      gasPrice: 36000000000,  // 5 gwei (in wei) (default: 100 gwei)
      confirmations: 2,
      timeoutBlocks: 200,
      networkCheckTimeout: 60000,
      skipDryRun: true
    },
    mumbai: {
      provider: () => new HDWalletProvider(mnemonic, 'wss://polygon-mumbai.g.alchemy.com/v2/x6KKPW5ddPT9YSOm0kxSKnu_FsbmyDZ7'),
      network_id: 80001,
      //gas: 5500000,
      //gasPrice: 5000000000,  // 5 gwei (in wei) (default: 100 gwei)
      confirmations: 2,
      timeoutBlocks: 200,
      networkCheckTimeout: 60000,
      skipDryRun: true
    },
    //
    // Useful for deploying to a public network.
    // Note: It's important to wrap the provider as a function to ensure truffle uses a new provider every time.
    // ropsten: {
    //   provider: () => new HDWalletProvider(mnemonic, 'https://ropsten.infura.io/v3/YOUR-PROJECT-ID'),
    //   network_id: 3,       // Ropsten's id
    //   gas: 5500000,        // Ropsten has a lower block limit than mainnet
    //   confirmations: 2,    // # of confirmations to wait between deployments. (default: 0)
    //   timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
    //   skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    // },
    //
    // Useful for private networks
    // private: {
    //   provider: () => new HDWalletProvider(mnemonic, 'https://network.io'),
    //   network_id: 2111,   // This network is yours, in the cloud.
    //   production: true    // Treats this network as if it was a public net. (default: false)
    // }
  },

  // Set default mocha options here, use special reporters, etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.15",      // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
       optimizer: {
         enabled: true,
         //runs: 200
         runs: 100
       },
       //evmVersion: "byzantium"
      }
    }
  },

  // Truffle DB is currently disabled by default; to enable it, change enabled:
  // false to enabled: true. The default storage location can also be
  // overridden by specifying the adapter settings, as shown in the commented code below.
  //
  // NOTE: It is not possible to migrate your contracts to truffle DB and you should
  // make a backup of your artifacts to a safe location before enabling this feature.
  //
  // After you backed up your artifacts you can utilize db by running migrate as follows:
  // $ truffle migrate --reset --compile-all
  //
  // db: {
  //   enabled: false,
  //   host: "127.0.0.1",
  //   adapter: {
  //     name: "sqlite",
  //     settings: {
  //       directory: ".db"
  //     }
  //   }
  // }
};
