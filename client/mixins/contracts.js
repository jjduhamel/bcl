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
      // TODO add to data
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
      // TODO add to data
      this.defeatEventTimer = setInterval(queryMoves, 1000);
    },
  },
  beforeDestroy() {
    if (this.victoryEventTimer) {
      console.warn('Destroy timer');
      clearInterval(this.victoryEventTimer);
    }
    if (this.defeatEventTimer) clearInterval(this.defeatEventTimer);
  }
});
