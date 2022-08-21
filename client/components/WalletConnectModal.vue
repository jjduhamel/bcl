<script>
import Modal from './Modal';
//import QrCode from 'qrcode.vue';
import VueQR from 'vue-qr';

export default {
  components: { Modal, VueQR },
  props: [ 'uri' ]
}
</script>

<template>
  <Modal title='WalletConnect' @close='$emit("close")'>
    <div v-if='uri' class='flex justify-center'>
      <VueQR :text='uri' :size='324' />
    </div>

    <div class='margin-lg-rl text-center'>
      Please scan this QR Code from a WalletConnect enabled wallet.
    </div>
  </Modal>
</template>
