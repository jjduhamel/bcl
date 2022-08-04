const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
var Lobby = artifacts.require('Lobby');

module.exports = async function(deployer, network) {
  console.log('Configure Algoz on', network);
  const lobby = await Lobby.deployed();

  // TODO Change this before deploying to testnets
  let algoz = '0x90F7d47A535f513aD6268fF8ba5157b6B1E7e8fE';
  await lobby.initAlgoz(algoz, 25, true);

  const enabled = await lobby.__algozEnabled();
  const signer = await lobby.__algozSigner();
  const ttl = await lobby.__algozTTL();
  if (enabled) {
    console.log('Set Algoz TTL to', ttl, 'with signing address', signer);
  } else {
    console.log('Disabled Algoz');
  }
};
