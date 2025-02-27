<script>
import ChallengeContract from '../contracts/Challenge';
import { challengeStatus } from '../constants/bcl';
import ethMixin from '../mixins/ethereum';
import walletMixin from '../mixins/wallet';
import contractsMixin from '../mixins/contracts';
import challengeMixin from '../mixins/challenges';
import ChallengeModal from '../components/ChallengeModal';
import WhiteKing from '../assets/icons/whiteking.svg';
import BlackKing from '../assets/icons/blackking.svg';

export default {
  name: 'PendingChallenge',
  mixins: [ ethMixin, walletMixin, contractsMixin, challengeMixin ],
  components: { ChallengeModal, WhiteKing, BlackKing },
  data() {
    return {
      waiting: false,
      showModal: false
    };
  },
  computed: {
    disableControls() { return this.waiting || !this.challengeLoaded || !this.isPending }
  },
  methods: {
    async modify() {
      console.log('Modify challenge');
      const { lobby } = this.contracts;
      await this.challenge.modify(this.p1IsWhite
                                , this.wagerAmount
                                , this.timePerMove
                                , { value: `${this.balanceDiff}` });
      this.waiting = true;
      this.$amplitude.logEvent('SendTx', { type: 'ModifyChallenge', contract: this.challenge.address });
      const eventFilter = lobby.filters.ModifiedChallenge(this.challenge.address, this.address);
      this.challenge.once(eventFilter, async player => {
        console.log('Modified challenge', this.challenge.address);
        this.$amplitude.logEvent('ReceiveTx', { type: 'ModifyChallenge', contract: addr });
        this.refreshChallenge();
        this.waiting = false;
      });
    },
    async accept() {
      console.log('Accept challenge');
      const { lobby } = this.contracts;
      await this.challenge.accept({ value: `${this.balanceDiff}` });
      this.waiting = true;
      this.$amplitude.logEvent('SendTx', { type: 'AcceptChallenge', contract: this.challenge.address });
      const eventFilter = lobby.filters.AcceptedChallenge(this.challenge.address, this.address);
      lobby.once(eventFilter, (addr, p1, p2) => {
        console.log('New game created', addr);
        this.$amplitude.logEvent('ReceiveTx', { type: 'AcceptChallenge', contract: addr });
        this.refreshChallenge();
        this.waiting = false;
      });
    },
    async decline() {
      console.log('Decline challenge');
      const { lobby } = this.contracts;
      await this.challenge.decline();
      this.waiting = true;
      this.$amplitude.logEvent('SendTx', { type: 'DeclineChallenge', contract: this.challenge.address });
      const eventFilter = lobby.filters.CanceledChallenge(this.challenge.address, this.address);
      lobby.once(eventFilter, (addr, p1, state) => {
        console.log('Challenge declined', addr);
        this.$amplitude.logEvent('ReceiveTx', { type: 'DeclineChallenge', contract: addr });
        this.refreshChallenge();
        this.waiting = false;
      });
    },
    async cancel() {
      console.log('Cancel challenge');
      await this.challenge.cancel();
      this.waiting = true;
      this.$amplitude.logEvent('SendTx', { type: 'CancelChallenge', contract: this.contract.address });
      const { lobby } = this.contracts;
      const eventFilter = lobby.filters.CanceledChallenge(this.challenge.address, this.address);
      lobby.once(eventFilter, (addr, p1, state) => {
        console.log('Challenge cancelled', addr);
        this.$amplitude.logEvent('ReceiveTx', { type: 'CancelChallenge', contract: addr });
        this.refreshChallenge();
        this.waiting = false;
      });
    },
    async listenForAccepted() {
      const { lobby } = this.contracts;
      let latestEvent = await this.provider.getBlockNumber();
      const eventFilter = lobby.filters.AcceptedChallenge(this.challenge.address);
      const queryEvents = async () => {
        const [ ev ] = await lobby.queryFilter(eventFilter, latestEvent+1);
        if (!ev) return;
        latestEvent = ev.blockNumber;
        const [ challenge, sender, receiver ] = ev.args;
        // Play a sound
        const game = await this.challenge.game();
        this.$router.push('/game/'+game);
      };
      this.acceptedEventTimer = setInterval(queryEvents, 1000);
    },
    async listenForDeclined() {
      const { lobby } = this.contracts;
      let latestEvent = await this.provider.getBlockNumber();
      const eventFilter = lobby.filters.CanceledChallenge(this.challenge.address);
      const queryEvents = async () => {
        const [ ev ] = await lobby.queryFilter(eventFilter, latestEvent+1);
        if (!ev) return;
        latestEvent = ev.blockNumber;
        // Play sound
        this.refreshChallenge();
      };
      this.declinedEventTimer = setInterval(queryEvents, 1000);
    },
    async listenForModified() {
      const { lobby } = this.contracts;
      let latestEvent = await this.provider.getBlockNumber();
      const eventFilter = lobby.filters.ModifiedChallenge(this.challenge.address);
      const queryEvents = async () => {
        const [ ev ] = await lobby.queryFilter(eventFilter, latestEvent+1);
        if (!ev) return;
        latestEvent = ev.blockNumber;
        // Play sound
        this.refreshChallenge();
      };
      this.modifiedEventTimer = setInterval(queryEvents, 1000);
    },
  },
  created() {
    const { contract } = this.$route.params;
    this.initChallenge(contract).then(() => {
      if (this.isPending) {
        this.listenForAccepted();
        this.listenForDeclined();
        this.listenForModified();
      }
    });
  }
}
</script>

<template>
  <div v-if='challengeLoaded' id='pending-challenge'>
    <div v-if='challengeStatus === 0' class='text-xl margin-tb'>Pending Challenge</div>
    <div v-else class='text-xl margin-tb'>Challenge</div>

    <div id='player-cards' class='flex flex-around'>
      <div id='current-player' class='bordered padded container text-center'>
        <div class='text-lg bold'>Play As</div>
        <div class='margin-tb'>
          <WhiteKing v-if='startAsWhite' />
          <BlackKing v-else />
        </div>
        <div v-if='playerHandle'>{{ playerHandle }}</div>
        <div v-else>{{ truncAddress(wallet.address) }}</div>
        <div>{{ formatBalance(playerBalance) }} {{ nativeToken }}</div>
      </div>

      <div id='opponent' class='bordered padded container text-center'>
        <div class='text-lg bold'>Opponent</div>
        <div class='margin-tb'>
          <BlackKing v-if='startAsWhite' />
          <WhiteKing v-else />
        </div>
        <div v-if='opponentHandle'>{{ opponentHandle }}</div>
        <div v-else>{{ truncAddress(opponent) }}</div>
        <div>{{ formatBalance(opponentBalance) }} {{ nativeToken }}</div>
      </div>
    </div>

    <div id='universal-options' class='margin-lg'>
      <div id='contract-state' class='flex margin-tb'>
        <div class='flex-shrink center-align text-ml text-bold'>Status</div>
        <div class='flex-1 flex-end center-align'>
          <div class='text-sentance'>{{ formatChallengeStatus(challengeStatus) }}</div>
        </div>
      </div>

      <div id='time-per-move' class='flex margin-tb'>
        <div class='flex-shrink center-align text-ml'>Time Per Move</div>
        <div class='flex-1 flex-end center-align'>
          <div class='text-caps'>{{ displayTPM }} {{ timeUnits }}</div>
        </div>
      </div>

      <div class='flex margin-tb'>
        <div class='flex-shrink center-align text-ml text-bold'>Wager Amount</div>
        <div class='flex-1 flex-end center-align'>
          {{ formatBalance(wagerAmount) }} {{ nativeToken }}
        </div>
      </div>

      <div class='flex margin-tb'>
        <div class='flex-shrink center-align'>Current Balance</div>
        <div class='flex-1 flex-end center-align text-ms'>
          {{ formatBalance(playerBalance) }} {{ nativeToken }}
        </div>
      </div>

      <div v-if='extraBalance>0' class='flex margin-tb'>
        <div class='flex-shrink center-align'>Surplus Balance</div>
        <div class='flex-1 flex-end center-align text-ms'>
          +{{ formatBalance(extraBalance) }} {{ nativeToken }}
        </div>
      </div>

      <div v-if='currentBalance>0 && balanceDiff>0' class='flex margin-tb'>
        <div class='flex-shrink center-align'>Balance Deficit</div>
        <div class='flex-1 flex-end center-align text-ms'>
          -{{ formatBalance(balanceDiff) }} {{ nativeToken }}
        </div>
      </div>
    </div>

    <div v-if='isConnected' id='game-controls' class='flex flex-center margin-lg-tb'>
      <div v-if='isSender' class='flex-1 flex-center'>
        <button
          class='margin-rl'
          @click='cancel'
          :disabled='disableControls'
        >Cancel</button>
        <button
          class='margin-rl'
          @click='showModal = true'
          :disabled='disableControls'
        >Modify</button>
      </div>

      <div v-else-if='isReceiver' class='flex-1 flex-center'>
        <button
          class='margin-rl'
          @click='accept'
          :disabled='disableControls'
        >Accept</button>
        <button
          class='margin-rl'
          @click='decline'
          :disabled='disableControls'
        >Decline</button>
        <button
          class='margin-rl'
          @click='showModal = true'
          :disabled='disableControls'
        >Modify</button>
      </div>
    </div>

    <ChallengeModal
      v-if='showModal'
      title='Modify Challenge'
      :waiting='waiting'
      @close='() => initChallenge(challenge.address).then(showModal = false)'
      @send='() => modify().then(() => showModal = false)'
      v-bind:startAsWhite='startAsWhite'
      @update:color='val => startAsWhite = val'
      v-bind:wagerAmount='displayWager'
      @update:wager='val => displayWager = val'
      :wagerToken='nativeToken'
      v-bind:timePerMove='displayTPM'
      @update:tpm='val => displayTPM = val'
      v-bind:timeUnits='timeUnits'
      @update:time-units='val => timeUnits = val'
    />
  </div>
</template>

<style lang='scss'>
@import '../styles';

#pending-challenge {
  max-width: 25em;

  #current-player, #opponent {
    width: 8em;

    svg {
      height: 4em;
      width: 4em;
    }
  }

  #universal-options {
    @extend .margin-lg-tb;
  }

  #game-controls {
    button { min-width: 6em; }
  }
}
</style>
