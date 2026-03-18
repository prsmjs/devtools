import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import Overview from './pages/Overview.vue'
import QueuePage from './pages/Queue.vue'
import CronPage from './pages/Cron.vue'
import LimitsPage from './pages/Limits.vue'
import WorkflowsPage from './pages/Workflows.vue'
import WorkflowExecutionsPage from './pages/WorkflowExecutions.vue'
import RealtimePage from './pages/Realtime.vue'
import RoomsView from './pages/realtime/RoomsView.vue'
import ChannelsView from './pages/realtime/ChannelsView.vue'
import CollectionsView from './pages/realtime/CollectionsView.vue'
import RecordsView from './pages/realtime/RecordsView.vue'
import MetadataView from './pages/realtime/MetadataView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Overview },
    {
      path: '/realtime',
      component: RealtimePage,
      redirect: '/realtime/rooms',
      children: [
        { path: 'rooms', component: RoomsView },
        { path: 'channels', component: ChannelsView },
        { path: 'collections', component: CollectionsView },
        { path: 'records', component: RecordsView },
        { path: 'metadata', component: MetadataView },
      ],
    },
    { path: '/queue', component: QueuePage },
    { path: '/cron', component: CronPage },
    { path: '/limits', component: LimitsPage },
    { path: '/workflows', component: WorkflowsPage },
    { path: '/executions', component: WorkflowExecutionsPage },
  ],
})

createApp(App).use(router).mount('#app')
