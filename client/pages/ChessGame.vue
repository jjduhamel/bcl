<script>
import _ from 'underscore';
import axios from 'axios';
import humanizeDuration from 'humanize-duration';
import TrashIcon from 'bytesize-icons/dist/icons/trash.svg';
import FlagIcon from 'bytesize-icons/dist/icons/flag.svg';
import BanIcon from 'bytesize-icons/dist/icons/ban.svg';
import walletMixin from '../mixins/wallet';
import gameMixin from '../mixins/games';
import contractsMixin from '../mixins/contracts';
import ChessBoard from '../components/ChessBoard';
import Modal from '../components/Modal';

export default {
  name: 'ChessGame',
  components: { ChessBoard, Modal, TrashIcon, FlagIcon, BanIcon },
  mixins: [ walletMixin, contractsMixin, gameMixin ],
  data() {
    return {
      authenticating: false,
      pending: false,
      waiting: false,
      didChooseMove: false,
      proposedMove: null,
      showModal: false,
      ticks: 0
    };
  },
  computed: {
    disableControls() { return (!this.gameLoaded || this.waiting || !this.inProgress) },
    timeFormat() {
      return humanizeDuration.humanizer({
        language: 'shortEn',
        languages: {
          shortEn: {
            y: () => 'year',
            mo: () => 'months',
            w: () => 'weeks',
            d: () => 'days',
            h: () => 'hours',
            m: () => 'mins',
            s: () => 'secs',
            ms: () => 'ms',
          }
        }
      });
    },
    timerExpired() {
      this.ticks;
      return Date.now()/1000 > this.timeOfExpiry;
    },
    // Need to override this to make it reactive to ticks
    timeUntilExpiry() {
      this.ticks;
      return Math.floor(this.timeOfExpiry - Date.now()/1000);
    },
    playerTimeExpired() {
      this.ticks;
      return this.timerExpired && this.isCurrentMove;
    },
    opponentTimeExpired() {
      this.ticks;
      return this.timerExpired && this.isOpponentsMove;
    },
    displayTimer() {
      if (this.timeUntilExpiry <= 3600) {       // 1 hour
        const mins = Math.floor(this.timeUntilExpiry / 60);
        const secs = this.timeUntilExpiry % 60;
        const out = `${mins}`.padStart(2,0) + ':' + `${secs}`.padStart(2,0);
        return out;
      } else {                                // >1 hour
        return this.timeFormat(this.timeUntilExpiry*1000, { largest: 2, delimiter: ' ' });
      }
    }
  },
  watch: {
    isInCheckmate(isOver) { if (isOver && !this.didChooseMove) this.showModal = true },
    playerHasIllegalMoves(isOver) { this.showModal = true },
    opponentHasIllegalMoves(isOver) { this.showModal = true },
    playerTimeExpired(isOver) { if (isOver) this.showModal = true }
  },
  methods: {
    chooseMove(from, to) {
      console.log('Choose move', from, to);
      const san = this.tryMove(from+to);
      if (!san) return;
      this.$amplitude.logEvent('ChooseMove', { san, from, to });
      this.proposedMove = san;
      this.didChooseMove = true;
      this.playAudio('Move');
    },
    async submitMove() {
      console.log('Submit move', this.proposedMove);
      this.$amplitude.logEvent('SubmitMove', { move: this.proposedMove });

      let algoz;
      if (!this.$recaptcha) await this.$recaptchaLoaded();
      const token = await this.$recaptcha('login');
      this.authenticating = true;
      if ([ 'unknown', 'development', 'test' ].includes(this.wallet.network)) {
        // XXX This is the development endpoint.  We tell what block to use.
        const latestBlock = await this.provider.getBlockNumber();
        algoz = await axios.post('https://api.algoz.xyz/development/', {
          application_id: this.algozKey,
          validation_proof: token,
          flag_as_bot: false,
          blocknumber: 12
        });
      } else {
        this.$amplitude.logEvent('Authenticate', { algoz: this.algozKey });
        algoz = await axios.post('https://api.algoz.xyz/validate/', {
          application_id: this.algozKey,
          validation_proof: token
        });
      }
      this.authenticating = false;

      if (algoz.status != 200) {
        console.error('Algoz failed with', algoz.status, algoz.data);
        return;
      }

      this.pending = true;
      await this.game['move(string,bytes1,bytes32,bytes32,bytes)']
                      (this.proposedMove
                     , '0x00'
                     , algoz.data.expiry_token
                     , algoz.data.auth_token
                     , algoz.data.signature_token);
      this.pending = false;
      this.waiting = true;
      this.playAudio('swell1');
      const eventFilter = this.game.filters.MoveSAN(this.wallet.address);
      this.$amplitude.logEvent('SendTx', { type: 'move' });
      this.game.once(eventFilter, (player, san, flags) => {
        console.log('Move received', san, flags);
        this.$amplitude.logEvent('ReceiveTx', { type: 'move', san, flags });
        this.waiting = false;
        this.didChooseMove = false;
        this.playAudio('Blaster');
        this.refreshGame();
      });
    },
    async resign() {
      console.log('Resigning game', this.game.address);
      this.closeModal();
      this.pending = true;
      await this.game.resign();
      this.pending = false;
      this.waiting = true;
      this.playAudio('swell3');
      const { lobby } = this.contracts;
      const eventFilter = lobby.filters.GameFinished(this.game.address);
      this.$amplitude.logEvent('SendTx', { type: 'resign' });
      lobby.once(eventFilter, game => {
        console.log('Resigned');
        this.$amplitude.logEvent('ReceiveTx', { type: 'resign' });
        this.waiting = false;
        this.refreshGame();
      });
    },
    async claimVictory() {
      console.log('Claiming victory', this.game.address);
      this.closeModal();
      this.pending = true;
      await this.game.claim();
      this.pending = false;
      this.waiting = true;
      this.playAudio('swell2');
      const { lobby } = this.contracts;
      const eventFilter = lobby.filters.GameFinished(this.game.address);
      this.$amplitude.logEvent('SendTx', { type: 'victory' });
      lobby.once(eventFilter, (game, winner) => {
        console.log('Victory', winner);
        this.$amplitude.logEvent('ReceiveTx', { type: 'victory' });
        this.waiting = false;
        this.refreshGame();
      });
    },
    closeModal() { this.showModal = false }
  },
  created() {
    const { contract } = this.$route.params;
    this.initGame(contract)
        .then(() => {
          if (this.inProgress) {
            // Start the timer at the nearest second
            const timeout = 1000 - Date.now()%1000;
            setTimeout(() => setInterval(() => this.ticks++, 1000), timeout);
            if (this.playerTimeExpired) this.showModal = true;
            this.listenForMoves(() => this.playAudio('Blaster'));
          }
        });
  }
}
</script>

<template>
  <div v-if='gameLoaded' id='chess-game' class='margin-lg-tb'>
    <div v-if='gameStatus > 0' class='text-xl margin-tb'>Archived Game</div>

    <div class='flex-row'>
      <ChessBoard
        id='chessboard'
        class='margin-lg-rl'
        v-bind='{ fen, orientation, currentMove, possibleMoves }'
        @onMove='chooseMove'
      />

      <div id='game-sidebar' class='flex flex-down'>
        <div id='game-info' class='flex-shrink bordered padded container margin-rl text-center'>
          <div id='game-status' class='text-center text-ml'>
            <div v-if='isWinner' class='text-sentance'>You Won!</div>
            <div v-else-if='isLoser' class='text-sentance'>You Lost</div>
            <div v-else-if='inProgress' class='text-sentance'>In Progress</div>
            <div v-else class='text-sentance'>{{ formatGameStatus(gameStatus) }}</div>
          </div>

          <div class='text-ms margin-tb'>
            <div id='action-indicator' class='flex flex-center align-center'>
              <div v-if='gameOver' class='text-sentance'>Game Over</div>
              <div v-else-if='authenticating || waiting' id='pending-tx' class='text-sentance' />
              <div v-else-if='pending'>Submit Move</div>
              <div v-else-if='didChooseMove' class='text-sentance'>Submit Move</div>
              <div v-else-if='isCurrentMove' class='text-sentance'>Your Move</div>
              <div v-else-if='isOpponentsMove' class='text-sentance'>Opponent's Move</div>
              <div v-else class='text-sentance'>Spectating</div>
            </div>

            <div v-if='authenticating'>Authenticating</div>
              <div v-else-if='waiting'>Pending...</div>
            <div v-else>{{ truncAddress(opponent) }}</div>
          </div>

          <div id='timer'>
            <div v-if='!timerExpired'>{{ displayTimer }}</div>
            <div v-else>Time Expired</div>
          </div>
        </div>

        <div id='controls' v-if='isPlayer' class='flex-1 flex-down flex-center justify-end margin-lg'>
          <div id='icon-bar' class='flex-between margin'>
            <button
              :disabled='!didChooseMove'
              @click='() => { undoMove(); didChooseMove=false }'
            >
              <TrashIcon />
            </button>

            <button :disabled='true'>
              <FlagIcon />
            </button>
          </div>

          <button
            v-if='inProgress && opponentTimeExpired'
            class='margin-tb'
            @click='claimVictory'
            :disabled='disableControls'
          >Victory!</button>
          <button
            v-else
            class='margin-tb'
            @click='submitMove'
            :disabled='disableControls || !didChooseMove'
          >Move</button>

          <button
            class='margin-tb'
            @click='resign'
            :disabled='disableControls || isWinner'
          >Resign</button>
        </div>
      </div>
    </div>

    <div v-if='showModal'>
      <Modal
          v-if='inProgress && isInCheckmate'
          title='Checkmate!'
          @close='closeModal'>
        <div class='margin-lg-tb'>
        Oh no, you're in checkmate!  That's ok, you can try again.  Please resign now and save your opponent some time and gas fees.
        </div>

        <template #controls>
          <button
            class='margin margin-lg-rl'
            @click='resign'
            :disabled='disableControls'
          >Resign</button>
        </template>
      </Modal>

      <Modal v-else-if='playerTimeExpired' title='Out of Time!' @close='closeModal'>
        <div class='margin-lg-tb'>
        Oh no, you ran out of time!  That's ok, you can try again.  Please resign now and save your opponent some gas fees.
        </div>

        <template #controls>
          <button
            class='margin margin-lg-rl'
            @click='resign'
            :disabled='disableControls'
          >Resign</button>
        </template>
      </Modal>

      <Modal v-else-if='playerHasIllegalMoves' title='Whoops...' @close='closeModal'>
        <div class='margin-lg-tb'>
        You submitted an illegal move.  If you encountered this in error, please contact the arbiters and we'll look into the issue.  Please resign now.
        </div>

        <template #controls>
          <button class='margin-rl'>Resign</button>
        </template>
      </Modal>

      <Modal v-else-if='opponentHasIllegalMoves' title='Oh My God!' @close='closeModal'>
        <div class='margin-lg-tb'>
        Your opponent submitted an illegal move.  Please dispute the move and an arbiter will review the game and declare you the winner.  We're sorry for the inconvenience.  Please play again.
        </div>

        <template #controls>
          <button class='margin-rl'>Dispute</button>
        </template>
      </Modal>
    </div>
  </div>
</template>

<style lang='scss'>
@import '~spinthatshit/src/loaders';

#chess-game {
  #game-sidebar {
    width: 12em;

    #pending-tx {
      @include loader11($color: black
                      , $size: 6px
                      , $gap: 6px
                      , $duration: .6s);
    }

    #action-indicator {
      height: 1.2em;
    }

    #icon-bar {
      button {
        margin: 0;
        padding: 0;
        border: none;
        background-color: transparent;

        svg {
          width: 2em;
          height: 2em;
        }
      }
    }
  }
}
</style>
