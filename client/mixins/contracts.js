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
      receivedEventTimer: null,
      acceptedEventTimer: null,
      mofidiedEventTimer: null,
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
        case 'homestead':
          return process.env.VUE_APP_HOMESTEAD_ADDR
        case 'rinkeby':
          return process.env.VUE_APP_RINKEBY_ADDR
        case 'goerli':
          return process.env.VUE_APP_GOERLI_ADDR
        case 'matic':
          return process.env.VUE_APP_MATIC_ADDR
        case 'mumbai':
          return process.env.VUE_APP_MUMBAI_ADDR
      }
    },
    originalBlock() {
      switch (this.wallet.network) {
        case 'unknown':
        case 'development':
        case 'test':
          return 0;
        case 'rinkeby':
          // 0xa5915e4a5d683b911410f14b89dcac4b997202e1554037fd27945029217cad89
          return 11109570;
        case 'goerli':
          // 0x5ad7149e6c3ca6f32feb77928fe765ff3aaaed7eb04ef04d2cfa036dac537463
          return 7311314;
        case 'homestead':
          // 0xb0f434f4babc4a1195a589092644ae685e89bcfcf220231597764f3eb762e2f3
          return 15287820;
        case 'matic':
          return 31589278;
          //return 31557572;
        case 'maticmum':
          // 0x53c8bede9a31881d52680efd1898db752f0e21210281d5ab04fa403d8019edbf
          return 27484933;
      }
    },
    algozKey() {
      switch (this.wallet.network) {
        case 'unknown':
        case 'development':
        case 'test':
          return process.env.VUE_APP_ALGOZ_HOMESTEAD_API_KEY
        case 'rinkeby':
          return process.env.VUE_APP_ALGOZ_RINKEBY_API_KEY
        case 'goerli':
          return process.env.VUE_APP_ALGOZ_GOERLI_API_KEY
        case 'homestead':
          return process.env.VUE_APP_ALGOZ_HOMESTEAD_API_KEY
        case 'matic':
          return process.env.VUE_APP_ALGOZ_MATIC_API_KEY
        case 'maticmum':
          return process.env.VUE_APP_ALGOZ_MUMBAI_API_KEY
      }
    }
  },
  methods: {
    async queryPlayerEvents(contract, filter, fromBlock) {
      if (!fromBlock) fromBlock = this.originalBlock;
      const [ incoming, outgoing ] = await Promise.all([
        contract.queryFilter(filter(null, null, this.wallet.address), fromBlock),
        contract.queryFilter(filter(null, this.wallet.address, null), fromBlock)
      ]);
      return [ ...incoming, ...outgoing ];
    },
    async listenForChallenges(cb) {
      const { lobby } = this.contracts;
      let latestEvent = await this.provider.getBlockNumber();
      const eventFilter = lobby.filters.CreatedChallenge;
      const queryEvents = async () => {
        //console.log('query challenges');
        const events = await this.queryPlayerEvents(lobby, eventFilter, latestEvent+1);
        if (!events || events.length == 0) return;
        for (var ev of events) {
          latestEvent = ev.blockNumber;
          const [ challenge, sender, receiver ] = ev.args;
          cb(challenge, sender, receiver);
        }
      };
      this.receivedEventTimer = setInterval(queryEvents, 1000);
    },
    async listenForAccepted(cb) {
      const { lobby } = this.contracts;
      let latestEvent = await this.provider.getBlockNumber();
      const eventFilter = lobby.filters.AcceptedChallenge;
      const queryEvents = async () => {
        //console.log('query accepted');
        const events = await this.queryPlayerEvents(lobby, eventFilter, latestEvent+1);
        if (!events || events.length == 0) return;
        for (var ev of events) {
          latestEvent = ev.blockNumber;
          const [ challenge, sender, receiver ] = ev.args;
          cb(challenge, sender, receiver);
        }
      };
      this.acceptedEventTimer = setInterval(queryEvents, 1000);
    },
    async listenForDeclined(cb) {
      const { lobby } = this.contracts;
      let latestEvent = await this.provider.getBlockNumber();
      const eventFilter = lobby.filters.CanceledChallenge;
      const queryEvents = async () => {
        //console.log('query declined');
        const events = await this.queryPlayerEvents(lobby, eventFilter, latestEvent+1);
        if (!events || events.length == 0) return;
        for (var ev of events) {
          latestEvent = ev.blockNumber;
          const [ challenge, sender, receiver ] = ev.args;
          cb(challenge, sender, receiver);
        }
      };
      this.declinedEventTimer = setInterval(queryEvents, 1000);
    },
    async listenForGames(cb) {
      const { lobby } = this.contracts;
      let latestEvent = await this.provider.getBlockNumber();
      const eventFilter = lobby.filters.GameStarted;
      const queryEvents = async () => {
        //console.log('query new games');
        const events = await this.queryPlayerEvents(lobby, eventFilter, latestEvent+1);
        if (!events || events.length == 0) return;
        for (var ev of events) {
          latestEvent = ev.blockNumber;
          const [ game, white, black ] = ev.args;
          cb(game, white, black);
        }
      };
      this.startedEventTimer = setInterval(queryEvents, 1000);
    },
    async listenForVictory(cb) {
      const { lobby } = this.contracts;
      let latestEvent = await this.provider.getBlockNumber();
      const eventFilter = lobby.filters.GameFinished(null, this.address);
      const queryEvents = async () => {
        //console.log('query victory');
        const events = await lobby.queryFilter(eventFilter, latestEvent+1);
        if (!events || events.length == 0) return;
        for (var ev of events) {
          latestEvent = ev.blockNumber;
          const [ game, winner, loser ] = ev.args;
          cb(game, winner, loser);
        }
      };
      this.victoryEventTimer = setInterval(queryEvents, 1000);
    },
    async listenForDefeat(cb) {
      const { lobby } = this.contracts;
      let latestEvent = await this.provider.getBlockNumber();
      const eventFilter = lobby.filters.GameFinished(null, null, this.address);
      const queryEvents = async () => {
        //console.log('query defeat');
        const events = await lobby.queryFilter(eventFilter, latestEvent+1);
        if (!events || events.length == 0) return;
        for (var ev of events) {
          const [ game, winner, loser ] = ev.args;
          latestEvent = ev.blockNumber;
          cb(game, winner, loser);
        }
      };
      this.defeatEventTimer = setInterval(queryEvents, 1000);
    },
    async listenForDispute(cb) {
      const { lobby } = this.contracts;
      let latestEvent = await this.provider.getBlockNumber();
      const eventFilter = lobby.filters.GameDisputed(null, null, this.address);
      const queryEvents = async () => {
        //console.log('query dispute');
        const events = await lobby.queryFilter(eventFilter, latestEvent+1);
        if (!events || events.length == 0) return;
        for (var ev of games) {
          const [ game, winner, loser ] = ev.args;
          latestEvent = ev.blockNumber;
          cb(game, winner, loser);
        }
      };
      this.disputedEventTimer = setInterval(queryEvents, 1000);
    },
  },
  beforeDestroy() {
    if (this.receivedEventTimer) clearInterval(this.receivedEventTimer);
    if (this.modifiedEventTimer) clearInterval(this.modifiedEventTimer);
    if (this.acceptedEventTimer) clearInterval(this.acceptedEventTimer);
    if (this.declinedEventTimer) clearInterval(this.declinedEventTimer);
    if (this.startedEventTimer) clearInterval(this.startedEventTimer);
    if (this.victoryEventTimer) clearInterval(this.victoryEventTimer);
    if (this.defeatEventTimer) clearInterval(this.defeatEventTimer);
    if (this.disputedEventTimer) clearInterval(this.disputedEventTimer);
  }
});
