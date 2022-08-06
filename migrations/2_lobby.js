const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
var Lobby = artifacts.require('Lobby');

module.exports = async function(deployer, network, accounts) {
  console.log('Deploying to', network);
  let arbiter;
  if ([ 'development', 'test' ].includes(network)) {
    arbiter = accounts[0];
  } else if ([ 'rinkeby', 'goerli', 'mumbai' ].includes(network)) {
    arbiter = '0x1C0c9C6D9f24048fBdF88865F8f967C3004e93EF';
  } else if ([ 'homestead', 'matic' ].includes(network)) {
    arbiter = '0x1C0c9C6D9f24048fBdF88865F8f967C3004e93EF';
    //arbiter = '0x1E354B468a3bADa71Adc9813b7b18b92992129F8';
  } else {
    throw Error('Unsupported network: '+network);
  }
  const lobby = await deployProxy(Lobby, [ arbiter ], { deployer });
  console.log('Deployed Lobby at', lobby.address);
};
