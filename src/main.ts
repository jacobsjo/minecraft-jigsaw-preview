import { createApp } from "vue";

import App from './App.vue'
import { createPinia } from "pinia";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faFileZipper, faFolderOpen, faRotateRight, faBackwardFast, faBackwardStep, faForwardFast, faForwardStep, faBars} from "@fortawesome/free-solid-svg-icons";
import PrimeVue from 'primevue/config';

library.add(faFileZipper, faFolderOpen, faRotateRight, faBackwardFast, faBackwardStep, faForwardFast, faForwardStep, faBars );

const pinia = createPinia()

const app = createApp(App)
app.use(pinia)
app.use(PrimeVue, {unstyled: true})
app.component("font-awesome-icon", FontAwesomeIcon)
app.mount('#app')