import Vue from 'vue';
import VueCompositionAPI from '@vue/composition-api';
import VueRouter from 'vue-router';
import { createPinia, PiniaVuePlugin } from 'pinia';
import { VueReCaptcha } from 'vue-recaptcha-v3';
import App from './App.vue';
import LobbyPage from './pages/UserLobby';
import ProfilePage from './pages/PlayerProfile';
//import UserProfile from './pages/UserProfile';
import PendingChallenge from './pages/PendingChallenge';
import ChessGame from './pages/ChessGame';
import AboutPage from './pages/AboutPage';
import PlayAiPage from './pages/PlayComputer';
import UnderConstruction from './components/UnderConstruction';

Vue.use(VueRouter);
Vue.use(VueCompositionAPI);
Vue.use(VueReCaptcha, { siteKey: '6LcNGzshAAAAAEIcw28um3FqfCHlq5VsjEMpsEUF' });
Vue.use(PiniaVuePlugin);
const pinia = createPinia();

/* eslint-disable no-new */
window.vm = new Vue({
  el: '#app',
  router: new VueRouter({
    routes: [
      { path: '/', redirect: '/ai' },
      { path: '/ai', component: PlayAiPage },
      { path: '/lobby', component: LobbyPage },
      { path: '/profile/:address', component: ProfilePage },
      { path: '/challenge/:contract', component: PendingChallenge },
      { path: '/game/:contract', component: ChessGame },
      { path: '/about', component: AboutPage },
      { path: '/market', component: UnderConstruction },
      { path: '/settings', component: UnderConstruction },
    ]
  }),
  pinia,
  methods: {
    async recaptcha() {
      const token = await this.$recaptcha('login');
      console.log('recaptcha', token)
    }
  },
  render: h => h(App)
});
