<script>
  import { onMount } from 'svelte';
  import { fetchNodes } from '../lib/api.js';
  import { formatTs, formatValue } from '../lib/utils.js';

  export let navigate;

  let nodes = [];
  let loading = true;
  let error = null;

  onMount(async () => {
    try {
      loading = true;
      error = null;
      console.log('[Dashboard] Fetching nodes...');
      nodes = await fetchNodes();
      console.log('[Dashboard] Nodes loaded:', nodes);
    } catch (e) {
      error = e.message || String(e);
      console.error('[Dashboard] Error loading nodes:', e);
    } finally {
      loading = false;
    }
  });

  function handleTableClick(mac, sensorTypeId, event) {
    event.stopPropagation();
    console.log('[Dashboard] Navigate to table:', { mac, deviceId: sensorTypeId });
    navigate('table', { mac, deviceId: sensorTypeId });
  }

  function handleGraphClick(mac, sensorTypeId, event) {
    event.stopPropagation();
    console.log('[Dashboard] Navigate to graph:', { mac, deviceId: sensorTypeId });
    navigate('graph', { mac, deviceId: sensorTypeId });
  }
</script>

<div class="min-h-screen bg-[#0b1220] text-[#c6d1f0] p-4">
  <h1 class="text-2xl font-bold mb-4">Gate Dashboard</h1>

  {#if loading}
    <div class="text-center py-8">Loading...</div>
  {:else if error}
    <div class="text-red-400 py-8">Error: {error}</div>
  {:else if nodes.length === 0}
    <div class="text-center py-8">No nodes found</div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each nodes as node}
        <div class="bg-[#111a2f] border border-[#1f2b4b] rounded-lg p-4 hover:border-[#2f6df6] transition">
          <div class="font-semibold text-lg mb-2">{node.mac}</div>
          {#if node.latest}
            <div class="text-sm text-[#9fb0e6] mb-2">
              Last: {formatTs(node.latest.sampleTsMs)}
            </div>
            {#if node.latest.values}
              <div class="space-y-1 mb-3">
                {#each Object.entries(node.latest.values) as [key, value]}
                  <div class="text-sm">
                    <span class="text-[#9fb0e6]">{key}:</span> {formatValue(value)}
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
          <div class="flex gap-2 mt-3">
            <button
              class="flex-1 px-3 py-2 bg-[#2f6df6] rounded hover:bg-[#1e4fc4] transition text-sm font-medium"
              on:click={(e) => handleTableClick(node.mac, node.sensorTypeId, e)}
            >
              Table
            </button>
            <button
              class="flex-1 px-3 py-2 bg-[#2f6df6] rounded hover:bg-[#1e4fc4] transition text-sm font-medium"
              on:click={(e) => handleGraphClick(node.mac, node.sensorTypeId, e)}
            >
              Graph
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

