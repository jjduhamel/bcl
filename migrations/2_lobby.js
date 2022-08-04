const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
var Lobby = artifacts.require('Lobby');

module.exports = async function(deployer, network, accounts) {
  console.log('Deploying to', network);
  let arbiter;
  if ([ 'development', 'test' ].includes(network)) {
    arbiter = accounts[0];
  } else if (network == 'rinkeby') {
    arbiter = '0x1C0c9C6D9f24048fBdF88865F8f967C3004e93EF';
  } else if (network == 'goerli') {
    arbiter = '0x1C0c9C6D9f24048fBdF88865F8f967C3004e93EF';
  } else {
    arbiter = '0x6D33531f7fe1059e64E1FC573C0Bc66C6d246E6c';
  }
  const lobby = await deployProxy(Lobby, [ arbiter ], { deployer });
  console.log('Deployed Lobby at', lobby.address);
};
