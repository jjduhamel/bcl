const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
var Lobby = artifacts.require('Lobby');

module.exports = async function(deployer, network, accounts) {
  console.log('Deploying to', network);
  let arbiter, algoz;
  if ([ 'development', 'test' ].includes(network)) {
    arbiter = accounts[0];
    algoz = '0x90F7d47A535f513aD6268fF8ba5157b6B1E7e8fE';
  } else if (network == 'rinkeby') {
    arbiter = '0x1C0c9C6D9f24048fBdF88865F8f967C3004e93EF';
    algoz = '0x5B12a452042aF8a86C395677348734eFfb521A2d';
  } else if (network == 'goerli') {
    arbiter = '0x1C0c9C6D9f24048fBdF88865F8f967C3004e93EF';
    algoz = '0xEBC643cf64b52cA884Bc366BE3aD0A5e92B19641';
  } else {
    arbiter = '0x6D33531f7fe1059e64E1FC573C0Bc66C6d246E6c';
    algoz = '0x89241d6686B37F191969b96aFCe6225B1A7838De';
  }
  const lobby = await deployProxy(Lobby, [ arbiter ], { deployer });
  console.log('Deployed', lobby.address);
  // TODO Set based on the network
  await lobby.setAlgozAddr(algoz);
  const algozAddr = await lobby.algozSigningAddress();
  console.log('Set algoz signing address', algozAddr);
};
