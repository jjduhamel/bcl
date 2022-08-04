import walletMixin from './wallet';
import useContractStore from '../stores/contracts';

export default ({
  mixins: [ walletMixin ],
  setup() {
    const contracts = useContractStore();
    return { contracts };
  },
  data() {
    return {
      acceptedEventTimer: null,
      declinedEventTimer: null,
      startedEventTimer: null,
      victoryEventTimer: null,
      defeatEventTimer: null,
      disputedEventTimer: null,
    };
  },
  computed: {
    lobbyAddress() {
      switch (this.wallet.network) {
        case 'development':
        case 'unknown':
          return process.env.VUE_APP_LOCAL_ADDR
        case 'rinkeby':
          return process.env.VUE_APP_RINKEBY_ADDR
        case 'goerli':
          return process.env.VUE_APP_GOERLI_ADDR
        /* TODO
        case 'homestead':
          return process.env.VUE_APP_HOMESTEAD_ADDR
        */
      }
    },
    algozKey() {
      switch (this.wallet.network) {
        case 'development':
        case 'development':
        case 'test':
          return process.env.VUE_APP_ALGOZ_HOMESTEAD_API_KEY
        case 'rinkeby':
          return process.env.VUE_APP_ALGOZ_RINKEBY_API_KEY
        case 'goerli':
          return process.env.VUE_APP_ALGOZ_GOERLI_API_KEY
        case 'homestead':
          return process.env.VUE_APP_ALGOZ_HOMESTEAD_API_KEY
      }
    }
  },
  methods: {
    async queryEvents(contract, filter) {
      return contract.queryFilter(filter);
    },
    async queryPlayerEvents(contract, filter) {
      const [ incoming, outgoing ] = await Promise.all([
        contract.queryFilter(filter(null, null, this.wallet.address)),
        contract.queryFilter(filter(null, this.wallet.address, null))
      ]);
      return [ ...incoming, ...outgoing ];
    },
    async listenForVictory(cb) {
      const { lobby } = this.contracts;
      let latestEvent = await this.provider.getBlockNumber();
      const eventFilter = lobby.filters.GameFinished(null, this.address);
      const queryMoves = () => {
        lobby.queryFilter(eventFilter, latestEvent+1).then(games => {
          for (var ev of games) {
            const [ game, winner, loser ] = ev.args;
            console.log('Won Game!', game);
            latestEvent = ev.blockNumber;
            cb(game, winner, loser);
          }
        });
      };
      this.victoryEventTimer = setInterval(queryMoves, 1000);
    },
    async listenForDefeat(cb) {
      const { lobby } = this.contracts;
      let latestEvent = await this.provider.getBlockNumber();
      const eventFilter = lobby.filters.GameFinished(null, null, this.address);
      const queryMoves = () => {
        lobby.queryFilter(eventFilter, latestEvent+1).then(games => {
          for (var ev of games) {
            const [ game, winner, loser ] = ev.args;
            console.log('Lost game', game);
            latestEvent = ev.blockNumber;
            cb(game, winner, loser);
          }
        });
      };
      this.defeatEventTimer = setInterval(queryMoves, 1000);
    },
  },
  beforeDestroy() {
    if (this.victoryEventTimer) clearInterval(this.victoryEventTimer);
    if (this.defeatEventTimer) clearInterval(this.defeatEventTimer);
  }
});
