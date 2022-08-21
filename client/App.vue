<script>
import _ from 'underscore';
import { ethers, Contract } from 'ethers';
import LobbyContract from './contracts/Lobby';
import ChallengeContract from './contracts/Challenge';
import { challengeStatus, gameStatus } from './constants/bcl';
import ethMixin from './mixins/ethereum';
import walletMixin from './mixins/wallet';
import contractsMixin from './mixins/contracts';
import challengeMixin from './mixins/challenges';
import PlayComputer from './pages/PlayComputer.vue';
import ConnectWallet from './components/ConnectWallet.vue';
import Icon from 'bytesize-icons/dist/icons/alert.svg';
import TagIcon from 'bytesize-icons/dist/icons/tag.svg';
import MailIcon from 'bytesize-icons/dist/icons/mail.svg';
import InfoIcon from 'bytesize-icons/dist/icons/info.svg';
import AlertIcon from 'bytesize-icons/dist/icons/alert.svg';
import GithubIcon from 'bytesize-icons/dist/icons/github.svg';
import TwitterIcon from 'bytesize-icons/dist/icons/twitter.svg';
const { Web3Provider } = ethers.providers;

export default {
  name: 'App',
  components: { ConnectWallet, PlayComputer, TagIcon, InfoIcon, MailIcon, AlertIcon, GithubIcon, TwitterIcon },
  mixins: [ ethMixin, walletMixin, contractsMixin, challengeMixin ],
  data () {
    return {
      loading: false
    }
  },
  watch: {
    isConnected(conn) { if (conn) this.init() }
  },
  methods: {
    async init() {
      if (!this.wallet.connected) await this.initMetamask();
      if (!this.wallet.connected) await this.initWalletConnect();
      if (!this.wallet.connected) return;

      console.log('Connected!');
      console.log('Address', this.address);
      console.log('Balance', this.formatBalance(this.balance));
      console.log('Network', this.network);
      console.log('Contract', this.lobbyAddress);

      this.$amplitude.setUserId(this.address);
      const aev = this.$amplitude.logEvent('MetamaskConnected', {
        network: this.network,
        address: this.address,
        lobby: this.lobbyAddress,
      });

      // Try to initialize with the signer, else use provider
      // NOTE Would be better to only connect wallet if the
      //      signer is one of the players
      const lobby = new Contract(this.lobbyAddress
                               , LobbyContract.abi
                               , this.signer || this.provider);
      this.contracts.lobby = lobby;
      const challenges = await this.fetchPlayerData();

      // Global Event Listeners
      this.listenForChallenges((addr, from, to) => {
        if (this.address == to) this.playAudio('Notify');
        this.lobby.newChallenge(addr);
      });
      this.listenForAccepted((addr, from, to) => {
        if (this.address == to) this.playAudio('Notify');
        this.lobby.terminate(addr);
      });
      this.listenForDeclined((addr, from, to) => {
        if (this.address == to) this.playAudio('Explosion');
        this.lobby.terminate(addr);
      });
      this.listenForGames(addr => {
        this.playAudio('Notify')
        this.lobby.newGame(addr);
      });
      this.listenForVictory(addr => {
        this.playAudio('Victory')
        this.lobby.terminate(addr);
      });
      this.listenForDefeat(addr => {
        this.playAudio('Defeat')
        this.lobby.terminate(addr);
      });
      this.listenForDispute(addr => {
        //this.playAudio('Defeat')
      });
    },
    async fetchPlayerData() {
      const { lobby } = this.contracts;
      const games = [];
      const eventFilter = lobby.filters.CreatedChallenge;
      const events = await this.queryPlayerEvents(lobby, eventFilter, this.originalBlock);
      const challenges = await Promise.all(_.map(events, async ev => {
        const [ addr, from, to ] = ev.args;
        const challenge = await this.lobby.newChallenge(addr);
        const status = await challenge.state();
        if (status === challengeStatus.accepted) {
          const game = await challenge.game();
          games.push(game);
        }
        return addr;
      }));

      await Promise.all(_.map(games, this.lobby.newGame));
      this.lobby.games = this.lobby.games;

      return challenges;
    },
    async connectWallet() {
      console.log('Connect wallet');
      this.$amplitude.logEvent('ConnectMetamask');
      await this.provider.send('eth_requestAccounts', [])
                .then(this.init);
    }
  },
  created() {
    this.loading = true;
    this.$recaptchaLoaded().then(() => this.$recaptchaInstance.hideBadge());
    this.init().then(() => this.loading = false);
  }
}
</script>

<template>
  <div id='app'>
    <div id='body'>
      <div id='sidebar'>
        <div class='bordered container'>
          <div id='brand'>
            <div>The Blockchain</div>
            <div>Chess Lounge</div>
          </div>

          <div id='wallet'>
            <div class='flex pad-sm align-bottom border-bottom border-sm'>
              <div class='flex-shrink'>Network</div>
              <div class='flex-1 flex-end text-caps text-ms'>
                {{ isConnected ? wallet.network : '---' }}
              </div>
            </div>

            <div class='flex pad-sm align-bottom border-bottom border-sm'>
              <div class='flex-shrink'>Account</div>
              <div class='flex-1 flex-end text-ms'>
                {{ isConnected ? truncAddress(wallet.address) : '---' }}
              </div>
            </div>

            <div class='flex pad-sm align-bottom'>
              <div class='flex-shrink text-md'>Balance</div>
              <div v-if='isConnected' class='flex-1 flex-end text-ms'>
                <div class='margin-sm-rl'>
                  {{ formatBalance(balance) }}
                </div>
                <div class='flex-shrink'>{{ nativeToken }}</div>
              </div>
              <div v-else class='flex-1 flex-end'>---</div>
            </div>
          </div>

          <div id='navigation'>
            <router-link tag='button' to='/lobby' class='flex align-center' :disabled='!wallet.connected'>
              <div class='flex-1 flex'>
                <MailIcon class='pad-rl'
                         viewBox='0 0 32 32'
                         width='16' height='16'
                />
              </div>
              <div class='flex-2 flex-center'>
                Lounge
              </div>
              <div class='flex-1' />
            </router-link>

            <router-link tag='button' to='/market' class='flex align-center' :disabled='!wallet.connected'>
              <div class='flex-1 flex'>
                <TagIcon class='pad-rl'
                         viewBox='0 0 32 32'
                         width='16' height='16'
                />
              </div>
              <div class='flex-2 flex-center'>
                Market
              </div>
              <div class='flex-1' />
            </router-link>

            <router-link tag='button' to='/about' class='flex align-center' :disabled='!wallet.connected'>
              <div class='flex-1 flex'>
                <InfoIcon class='pad-rl'
                         viewBox='0 0 32 32'
                         width='16' height='16'
                />
              </div>
              <div class='flex-2 flex-center'>
                About
              </div>
              <div class='flex-1' />
            </router-link>
          </div>
        </div>
      </div>

      <div v-if='!loading' id='page' class='flex'>
        <router-view v-if='wallet.connected' class='flex-1' />
        <PlayComputer v-else class='flex-1' />
      </div>
    </div>

    <div id='footer'>
      <div class='flex flex-grow'>
        <div class='text-sm margin-sm'>
          This site is protected from bots by <a href='https://algoz.xyz/'>algoz.xyz</a>
        </div>
      </div>
      <a href='https://twitter.com/TheChessLounge'>
        <TwitterIcon
          class='margin-sm'
          viewBox='0 0 64 64'
          width='14'
          height='14'
        />
      </a>
      <a href='https://github.com/jjduhamel/bcl'>
        <GithubIcon
          class='margin-sm'
          viewBox='0 0 64 64'
          width='14'
          height='14'
        />
      </a>
      <a href='https://github.com/jjduhamel/bcl/issues/new?template=bug_report.md'>
        <AlertIcon
          class='margin-sm'
          viewBox='0 0 32 32'
          width='14'
          height='14'
        />
      </a>
    </div>
  </div>
</template>

<style lang='scss'>
@import 'styles';

// Swallow the page
html, body {
  height: 100%;
  margin: 0;

  #app {
    max-width: 56em;
    height: 98%;
    @extend .margin-lg;
    @extend .flex-col;

    #body {
      @extend .flex;
      @extend .flex-grow;
      margin-bottom: 1em;
    }

    #footer {
      @extend .flex-shrink;
      @extend .border-top;
      @extend .border-sm;
      @extend .flex;
      @extend .flex-end;
    }

    #sidebar {
      @extend .flex-col;
      @extend .flex-shrink;
      width: 13em;

      > .container {
        @extend .padded;
        @extend .pad-lg-tb;
      }

      #logo {
        max-width: 69%;
      }

      #brand {
        @extend .bold;
        @extend .text-lg;
        @extend .text-center;
        @extend .margin-tb;
      }

      #wallet {
        @extend .bordered;
        @extend .margin-lg-tb;
        @extend .margin-sm-rl;
        @extend .pad-rl;
        @extend .pad-sm-tb;
      }

      #navigation {
        @extend .flex-col;

        button {
          @extend .margin-tb;
          @extend .margin-lg-rl;
        }
      }
    }

    #page {
      flex: 1;
      margin-left: 1em;
    }
  }
}
</style>
