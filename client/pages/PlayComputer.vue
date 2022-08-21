<script>
import walletMixin from '../mixins/wallet';
import AiBoard from '../components/AiBoard';
import WalletConnectModal from '../components/WalletConnectModal';

export default {
  name: 'PlayComputer',
  components: { AiBoard, WalletConnectModal },
  mixins: [ walletMixin ],
  data() {
    return {
      showWCModal: false
    };
  },
  watch: {
    isConnected(conn) { if (conn) this.showWCModal = false }
  },
  methods: {
    async connectWalletConnect() { this.showWCModal = true }
  }
}
</script>

<template>
  <div>
    <div class='text-xl margin-tb'>Please Connect Your Wallet</div>
    <div id='play-ai' class='flex'>

      <AiBoard class='margin-lg-rl' />

      <div id='sidebar' class='flex-1 flex-down'>
        <div id='app-info' class='padded bordered margin-rl text-center'>
          <div class='margin-tb pad-lg-rl'>
            Welcome!  This app requires a supported wallet.  Please choose one of the following.
          </div>

          <div class='flex-down margin-lg-rl'>
            <button class='flex-1 margin-tb' @click='connectToMetamask'>Metamask</button>
            <button
              class='flex-1 margin-tb'
              @click='connectWalletConnect'
            >Wallet Connect</button> </div>
        </div>
      </div>

      <WalletConnectModal
        v-if='showWCModal'
        :uri='wallet.walletConnectURI'
        @close='() => showWCModal = false'
      />
    </div>
  </div>
</template>
