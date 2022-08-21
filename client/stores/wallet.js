import { defineStore } from 'pinia';

export default defineStore({
  id: 'wallet',
  state: () => ({
    metamask: null,
    walletConnect: null,
    walletConnectURI: null,
    signer: null,
    provider: null,
    installed: false,
    connected: false,
    address: null,
    balance: 0
  })
});
