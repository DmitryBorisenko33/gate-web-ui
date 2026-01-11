import Dashboard from './routes/Dashboard.svelte';
import NodeTable from './routes/NodeTable.svelte';
import NodeGraph from './routes/NodeGraph.svelte';
import Settings from './routes/Settings.svelte';

// Route definitions
export const routes = {
  '/': Dashboard,
  '/dashboard': Dashboard,
  '/table/:mac/:deviceId': NodeTable,
  '/graph/:mac/:deviceId': NodeGraph,
  '/settings': Settings,
};

