import Vue from 'vue';
import VueCompositionAPI from '@vue/composition-api';
import VueRouter from 'vue-router';
import VueAmplitude from 'vue-amplitude-js';
import { createPinia, PiniaVuePlugin } from 'pinia';
import { VueReCaptcha } from 'vue-recaptcha-v3';
import App from './App.vue';
import LobbyPage from './pages/UserLobby';
import ProfilePage from './pages/PlayerProfile';
import PendingChallenge from './pages/PendingChallenge';
import ChessGame from './pages/ChessGame';
import AboutPage from './pages/AboutPage';
import PlayAiPage from './pages/PlayComputer';
import NftMarketplace from './pages/NftMarketplace';
import UnderConstruction from './components/UnderConstruction';

const router = new VueRouter({
  routes: [
    { path: '/', redirect: '/market' },
    { path: '/ai', component: PlayAiPage },
    { path: '/lobby', component: LobbyPage },
    { path: '/profile/:address', component: ProfilePage },
    { path: '/challenge/:contract', component: PendingChallenge },
    { path: '/game/:contract', component: ChessGame },
    { path: '/about', component: AboutPage },
    { path: '/market', component: NftMarketplace },
    { path: '/settings', component: UnderConstruction },
  ]
});

Vue.use(VueRouter);
Vue.use(VueCompositionAPI);
Vue.use(VueReCaptcha, { siteKey: process.env.VUE_APP_RECAPTCHA_API_KEY });
Vue.use(PiniaVuePlugin);
Vue.use(VueAmplitude, { apiKey: process.env.VUE_APP_AMPLITUDE_API_KEY });
const pinia = createPinia();

window.vm = new Vue({
  el: '#app',
  router,
  pinia,
  render: h => h(App)
});
