<script>
import _ from 'underscore';
import { ThirdwebSDK, RemoteStorage } from '@thirdweb-dev/sdk';
import ethMixin from '../mixins/ethereum';
import walletMixin from '../mixins/wallet';
import contractsMixin from '../mixins/contracts';
import WelcomeMessage from '../components/WelcomeMessage';

export default {
  components: { WelcomeMessage },
  mixins: [ ethMixin, walletMixin, contractsMixin ],
  data() {
    return {
      eventTimer: null,
      loading: false,
      playerMoved: false,
      firstMove: null,
      drop: null,
      claimedNFT: false,
      nfts: []
    };
  },
  computed: {
    canClaim() {
      return !this.claimedNFT && this.playerMoved;
    },
    marketAddress() {
      switch (this.wallet.network) {
        case 'homestead':
          return process.env.VUE_APP_THIRDWEB_HOMESTEAD
        case 'goerli':
          return process.env.VUE_APP_THIRDWEB_GOERLI
        case 'matic':
          return process.env.VUE_APP_THIRDWEB_MATIC
        default:
          return null;
      }
    },
    //networkEnabled() { return false },
    networkEnabled() { return [ 'homestead', 'goerli' ].includes(this.network) },
    claimed() {
      return _.filter(this.nfts, nft => nft.owner != '0x0000000000000000000000000000000000000000');
    },
    unclaimed() {
      return _.filter(this.nfts, nft => nft.owner == '0x0000000000000000000000000000000000000000');
    },
    next() {
      return _.first(this.unclaimed);
    },
    displayNFT() {
      if (this.claimedNFT) return this.claimedNFT;
      else return this.next;
    }
  },
  methods: {
    normalize(nft) { return !nft ? null : ({ owner: nft.owner, ...nft.metadata }) },
    async init() {
      console.log('Initialize Marketplace', this.marketAddress);
      if (!this.networkEnabled) return;

      this.scanForMoves().then(moves => {
        if (moves.length > 0) {
          this.playerMoved = true;
          this.firstMove = _.first(moves).blockNumber;
        }
      });

      const sdk = new ThirdwebSDK(this.signer);
      this.drop = sdk.getNFTDrop(this.marketAddress);
      const signer = sdk.getSignerOrProvider(this.wallet.network);

      [ this.claimedNFT, this.nfts ] = await Promise.all([
        this.drop.getOwned(this.address).then(_.first).then(this.normalize),
        this.drop.getAll().then(nfts => _.map(nfts, this.normalize))
      ]);
    },
    async scanForMoves() {
      const { lobby } = this.contracts;
      const eventFilter = lobby.filters.PlayerMoved(null, this.address);
      const moves = await lobby.queryFilter(eventFilter, this.originalBlock);
      return moves;
    },
    async listenForClaimed() {
      let latestEvent = await this.provider.getBlockNumber();
      const queryEvents = async () => {
        const owned = await this.drop.getOwned(this.address).then(_.first);
        if (!owned) return;
        console.log('Claimed NFT');
        clearInterval(this.eventTimer);
        this.claimedNFT = this.normalize(owned);
      };
      this.eventTimer = setInterval(queryEvents, 1000);
    },
    async claim(id) {
      console.log('Claim NFT', id);
      await this.drop.claim(1);
    },
    sample() { return _.sample(this.claimed, 12) },
    redirect() { this.$router.push('/lobby') }
  },
  created() {
    this.loading = true;
    this.init().then(() => {
      this.loading = false
      if (this.networkEnabled && this.canClaim) {
        console.log('Listen for claimed NFT');
        this.listenForClaimed();
      }
    });
  },
  beforeDestroy() {
    if (this.eventTimer) clearInterval(this.eventTimer);
  }
}
</script>

<template>
  <div v-if='!loading && networkEnabled' id='marketplace'>
    <div class='text-xl margin-tb'>The Blockchain Chess Lounge</div>

    <div class='flex'>
      <div class='flex-shrink padded bordered container margin'>
        <div class='text-center text-ml bold'>{{ displayNFT.name }}</div>

        <div class='margin-tb'>
          <video width='192' height='192' loop autoplay>
            <source :src='displayNFT.animation_url' type='video/mp4'>
          </video>
        </div>

        <div class='flex flex-center margin-rl'>
          <div v-if='claimedNFT'
               class='flex-1 padded bordered container text-center'
          >
            {{ truncAddress(this.address) }}
          </div>
          <button v-else-if='canClaim' class='flex-1' @click='claim'>Claim</button>
          <button v-else class='flex-1' @click='redirect'>Play</button>
        </div>
      </div>

      <div class='flex-1 margin-lg'>
        <div v-if='claimedNFT || canClaim'>
          <div>
            Thank you for trying out The Blockchain Chess Lounge.  We hope to see you this Christmas at our chess tournament.  Please follow us on Twitter to stay up to date with the latest happenings @TheChessLounge.
          </div>
          <div class='margin-lg-tb' />
          <div v-if='claimedNFT'>
            <div class='bold text-lg'>Membership Details</div>
            <div class='margin-lg-tb' />
            <div class='flex align-bottom'>
              <div class='flex-1 text-ml bold'>Status</div>
              <div class='flex-2'>Lifetime Member</div>
            </div>
            <div class='margin-tb' />
            <div class='flex align-bottom'>
              <div class='flex-1 text-ml bold'>Account</div>
              <div class='flex-2'>{{ truncAddress(this.address) }}</div>
            </div>
            <div class='margin-tb' />
            <div class='flex align-bottom'>
              <div class='flex-1 text-ml bold'>First Move</div>
              <div class='flex-2'>Block {{ this.firstMove }}</div>
            </div>
          </div>
          <div v-else-if='canClaim'>
            Alas, don't leave without claiming your Founders Edition NFT.  With this NFT, you'll get a unique profile badge, be permanently exempt from all platform fees, and qualify for NFT airdrops in the future.  Don't miss out!
          </div>
        </div>
        <WelcomeMessage v-else />
      </div>
    </div>

    <div class='text-lg margin-tb'>Recently Claimed</div>
    <div class='flex flex-wrap'>
      <div v-for='nft in sample()' class='pad-sm bordered container margin'>
        <div class='text-center margin-tb bold'>{{ nft.name }}</div>

        <div class='margin-sm-tb'>
          <video width='128' height='128' loop autoplay>
            <source :src='nft.animation_url' type='video/mp4'>
          </video>
        </div>

        <div class='flex flex-center'>
          <div class='flex-1 text-sm text-center'>{{ truncAddress(nft.owner) }}</div>
        </div>
      </div>
    </div>
  </div>
  <div v-else id='marketplace'>
    <div class='text-xl margin-tb'>The Blockchain Chess Lounge</div>
    <div v-if='!networkEnabled' class='pad-lg bordered text-center margin-lg-tb margin-xl-rl'>
      The Marketplace is not supported on this network.  If you'd like an NFT, please play on one of the following networks:
      <div class='flex flex-around margin-tb text-lg margin-xl-rl'>
        <div>Ethereum</div>
      </div>
    </div>
    <div v-else-if='loading' class='pad-lg bordered text-center margin-lg-tb margin-xl-rl'>
      The Marketplace is loading.  Please wait a moment...
    </div>
    <WelcomeMessage class='padded' />
    <div class='flex flex-center margin-lg-tb'>
      <div class='flex-2' />
      <button class='flex-1' @click='redirect'>Play</button>
      <div class='flex-2' />
    </div>
  </div>
</template>

<style lang='scss'>
#marketplace {
}
</style>
