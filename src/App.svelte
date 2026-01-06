<script>
  import Dashboard from './routes/Dashboard.svelte';
  import NodeTable from './routes/NodeTable.svelte';
  import NodeGraph from './routes/NodeGraph.svelte';
  import { onMount } from 'svelte';

  let currentRoute = 'dashboard';
  let routeParams = {};

  function navigate(route, params = {}) {
    currentRoute = route;
    routeParams = params;
  }

  $: component = {
    dashboard: Dashboard,
    table: NodeTable,
    graph: NodeGraph,
  }[currentRoute] || Dashboard;

  onMount(() => {
    console.log('[App] Mounted, route:', currentRoute);
  });
</script>

<svelte:component this={component} {navigate} params={routeParams} />


