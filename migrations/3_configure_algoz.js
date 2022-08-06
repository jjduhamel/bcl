const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
var Lobby = artifacts.require('Lobby');

module.exports = async function(deployer, network) {
  console.log('Configure Algoz on', network);
  const lobby = await Lobby.deployed();
  let algoz, ttl=25;
  if ([ 'development', 'test' ].includes(network)) {
    algoz = '0x90F7d47A535f513aD6268fF8ba5157b6B1E7e8fE';
  } else if (network == 'rinkeby') {
    algoz = '0x5B12a452042aF8a86C395677348734eFfb521A2d';
  } else if (network == 'goerli') {
    algoz = '0xEBC643cf64b52cA884Bc366BE3aD0A5e92B19641';
  } else if (network == 'homestead') {
    algoz = '0x89241d6686B37F191969b96aFCe6225B1A7838De';
    ttl = 5;
  } else if (network == 'matic') {
    algoz = '0xbaD2320334884faA59A72954e4BFD5e9B07cdd44';
    ttl = 250;
  } else if (network == 'maticmum') {
    algoz = '0x1C97E3feAb223b3dB85Df88d20dad6B3e40a4A87';
    ttl = 250;
  } else {
    throw Error('Unsupported network');
  }
  await lobby.setAuthData(algoz, ttl, true);
  const enabled = await lobby.__authEnabled();
  const signer = await lobby.__authSigner();
  const expiry = await lobby.__authTokenTTL().then(Number);
  if (enabled) {
    console.log('Set Algoz TTL to', expiry, 'with signing address', signer);
  } else {
    console.log('Algoz is disabled');
  }
};
