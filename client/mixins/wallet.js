import { ethers, providers } from 'ethers';
import WalletConnectProvider from '@walletconnect/web3-provider';
import useWalletStore from '../stores/wallet';
const { Web3Provider } = providers;

export default ({
  data() {
    return {
      walletConnectURI: null
    };
  },
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
  },
  methods: {
    async handleConnection(provider) {
      console.log('Handle wallet connection');
      const accounts = await provider.listAccounts();
      if (accounts.length == 0) {
        console.warn('Wallet is NOT connected');
        this.$amplitude.logEvent('WalletNotConnected');
        return;
      }
      this.wallet.provider = provider;
      this.wallet.signer = this.provider.getSigner();
      [ this.wallet.address
      , this.wallet.network
      , this.wallet.balance ] = await Promise.all([
          this.signer.getAddress()
        , this.provider.getNetwork().then(n => n.name)
        , this.signer.getBalance().then(BigInt)
      ]);
      this.wallet.connected = true;
    },
    async initMetamask() {
      console.log('Initialize Metamask');
      this.$amplitude.logEvent('InitMetamask');
      if (typeof window.ethereum === 'undefined') {
        console.warn('Metamask is NOT installed!');
        this.$amplitude.logEvent('MetamaskNotInstalled');
        this.wallet.installed = false;
        return;
      }
      const provider = new Web3Provider(window.ethereum);
      this.wallet.installed = true;
      this.wallet.metamask = provider;
      await this.handleConnection(provider);
    },
    async connectToMetamask() {
      console.log('Connect Metamask');
      if (!this.isInstalled) throw new Error('Metamask isn\'t installed');
      this.$amplitude.logEvent('ConnectMetamask');
      const provider = this.wallet.metamask;
      await provider.send('eth_requestAccounts', []);
      await this.handleConnection(provider);
    },
    async initWalletConnect() {
      console.log('Initialize Wallet Connect');
      this.$amplitude.logEvent('InitWalletConnect');
      if (this.wallet.walletConnect) {
        console.error('WalletConnect already initialized');
        return;
      }
      const provider = new WalletConnectProvider({
        infuraId: '2185ad08ea904e85b06c383c4cd6b902',
        qrcode: false
      });
      //this.wallet.installed = true;
      this.wallet.walletConnect = provider;

      /*
      provider.on('accountsChanged', (chainId) => {});
      provider.on('chainChanged', (chainId) => {});
      */

      provider.connector.on('display_uri', (err, data) => {
        const uri = data.params[0];
        this.wallet.walletConnectURI = uri;
      });

      provider.on('connect', () => {
        console.log('WalletConnect finished');
        this.$amplitude.logEvent('WalletConnectConnected');
        const w3p = new Web3Provider(provider);
        this.handleConnection(w3p);
      });

      provider.on('disconnect', (code, reason) => {
        console.log('WalletConnect disconnected');
        this.$amplitude.logEvent('WalletConnectDisconnected');
        this.wallet.connected = false;
      });

      provider.enable();
      if (provider.connected) {
        this.$amplitude.logEvent('WalletConnectLoaded');
        const w3p = new Web3Provider(provider);
        this.handleConnection(w3p);
      }
    }
  }
});
