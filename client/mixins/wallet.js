import useWalletStore from '../stores/wallet';

export default ({
  setup() {
    const wallet = useWalletStore();
    return { wallet };
  },
  computed: {
    provider() { return this.wallet.provider },
    signer() { return this.wallet.signer },
    isInstalled() { return this.wallet.installed },
    isConnected() { return this.wallet.connected },
    address() { return this.wallet.address },
    network() { return this.wallet.network },
    balance() { return this.wallet.balance },
    nativeToken() {
      switch (this.network) {
        case 'matic':
        case 'maticmum':
          return 'MATIC';
        default:
          return 'ETH';
      }
    }
  }
});
