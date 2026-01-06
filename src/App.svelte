<script>
  import Dashboard from './routes/Dashboard.svelte';
  import NodeTable from './routes/NodeTable.svelte';
  import NodeGraph from './routes/NodeGraph.svelte';
  import Settings from './routes/Settings.svelte';
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
    settings: Settings,
  }[currentRoute] || Dashboard;

  onMount(() => {
    console.log('[App] Mounted, route:', currentRoute);
  });
</script>

<div class="app-shell">
  <aside class="sidebar">
    <div class="sidebar-title">Gate</div>
    <nav class="sidebar-nav">
      <button class:selected={currentRoute === 'dashboard'} on:click={() => navigate('dashboard')}>
        Дашборд
      </button>
      <button class:selected={currentRoute === 'settings'} on:click={() => navigate('settings')}>
        Настройки
      </button>
    </nav>
  </aside>
  <main class="content">
    <svelte:component this={component} {navigate} params={routeParams} />
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
  }
  .app-shell {
    display: flex;
    min-height: 100vh;
    background: #0b1220;
    color: #c6d1f0;
    font-family: system-ui, -apple-system, sans-serif;
  }
  .sidebar {
    width: 220px;
    background: #0d1526;
    border-right: 1px solid #1f2b4b;
    padding: 16px;
    box-sizing: border-box;
  }
  .sidebar-title {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 16px;
  }
  .sidebar-nav button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    margin-bottom: 8px;
    border: 1px solid #1f2b4b;
    border-radius: 8px;
    background: #111a2f;
    color: #c6d1f0;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  .sidebar-nav button:hover {
    border-color: #2f6df6;
  }
  .sidebar-nav button.selected {
    border-color: #2f6df6;
    background: #2f6df6;
    color: #fff;
  }
  .content {
    flex: 1;
    padding: 16px;
    box-sizing: border-box;
  }
</style>


