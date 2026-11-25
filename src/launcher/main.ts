import { createPinia } from 'pinia'
import { createApp } from 'vue'

import '@/ui/styles.css'
import './launcher.css'
import LauncherApp from './LauncherApp.vue'

createApp(LauncherApp).use(createPinia()).mount('#app')
