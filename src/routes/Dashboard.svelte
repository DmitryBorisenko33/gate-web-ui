<script>
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { fetchNodes, deleteNode } from '../lib/api.js';
  import { formatTs, formatValue } from '../lib/utils.js';
  import { Table, TrendingUp, Trash2 } from 'lucide-svelte';
  import {
    PageTitle,
    LoadingSpinner,
    ErrorMessage,
    EmptyState,
    Card,
    Grid
  } from '../components/ui';

  let nodes = [];
  let loading = true;
  let error = null;
  let deletingMac = null; // Track which node is being deleted

  // Debug logging (disabled in production build)
  const DEV_LOG = import.meta.env.DEV;
  const log = (...args) => { if (DEV_LOG) console.log(...args); };

  onMount(async () => {
    try {
      loading = true;
      error = null;
      log('[Dashboard] Fetching nodes...');
      nodes = await fetchNodes();
      log('[Dashboard] Nodes loaded:', nodes);
    } catch (e) {
      error = e.message || String(e);
      console.error('[Dashboard] Error loading nodes:', e);
    } finally {
      loading = false;
    }
  });

  function handleTableClick(mac, sensorTypeId, event) {
    event.stopPropagation();
    log('[Dashboard] Navigate to table:', { mac, deviceId: sensorTypeId });
    push(`/table/${mac}/${sensorTypeId}`);
  }

  function handleGraphClick(mac, sensorTypeId, event) {
    event.stopPropagation();
    log('[Dashboard] Navigate to graph:', { mac, deviceId: sensorTypeId });
    push(`/graph/${mac}/${sensorTypeId}`);
  }

  async function handleDeleteClick(mac, event) {
    event.stopPropagation();
    
    // Confirm deletion
    if (!confirm(`Delete node ${mac} and all its data? This action cannot be undone.`)) {
      return;
    }

    try {
      deletingMac = mac;
      await deleteNode(mac);
      // Remove node from local list
      nodes = nodes.filter(n => n.mac !== mac);
      log('[Dashboard] Node deleted:', mac);
    } catch (e) {
      error = e.message || String(e);
      console.error('[Dashboard] Error deleting node:', e);
      alert(`Failed to delete node: ${error}`);
    } finally {
      deletingMac = null;
    }
  }
</script>

<div class="dashboard-container">
  <PageTitle>Gate Dashboard</PageTitle>

  {#if loading}
    <LoadingSpinner text="Loading nodes..." />
  {:else if error}
    <ErrorMessage message={error} />
  {:else if nodes.length === 0}
    <EmptyState message="No nodes found" />
  {:else}
    <Grid columns={3} gap="medium">
      {#each nodes as node}
        <Card hover={true}>
          <div class="node-mac">{node.mac}</div>
          {#if node.latest}
            <div class="node-last-update">
              Last: {formatTs(node.latest.sampleTsMs)}
            </div>
            {#if node.latest.values}
              <div class="node-values">
                {#each Object.entries(node.latest.values) as [key, value]}
                  <div class="node-value-item">
                    <span class="node-value-key">{key}:</span> {formatValue(value)}
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
          <div class="node-actions">
            <button
              class="action-icon"
              title="Table"
              on:click={(e) => handleTableClick(node.mac, node.sensorTypeId, e)}
            >
              <Table size={20} />
            </button>
            <button
              class="action-icon"
              title="Graph"
              on:click={(e) => handleGraphClick(node.mac, node.sensorTypeId, e)}
            >
              <TrendingUp size={20} />
            </button>
            <button
              class="action-icon action-icon-danger"
              title="Delete node and all data"
              on:click={(e) => handleDeleteClick(node.mac, e)}
              disabled={deletingMac === node.mac}
            >
              <Trash2 size={20} />
            </button>
          </div>
        </Card>
      {/each}
    </Grid>
  {/if}
</div>

<style>
  .dashboard-container {
    min-height: 100%;
    padding: 0;
  }

  .node-mac {
    font-weight: 600;
    font-size: 1.125rem;
    margin-bottom: 0.5rem;
    color: #c6d1f0;
    word-break: break-all;
  }

  .node-last-update {
    font-size: 0.875rem;
    color: #9fb0e6;
    margin-bottom: 0.5rem;
  }

  .node-values {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
  }

  .node-value-item {
    font-size: 0.875rem;
  }

  .node-value-key {
    color: #9fb0e6;
  }

  .node-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    justify-content: center;
  }

  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: #1f2b4b;
    color: #c6d1f0;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-icon:hover {
    background: #2f6df6;
    color: #ffffff;
  }

  .action-icon:active {
    transform: scale(0.95);
  }

  .action-icon:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-icon-danger {
    background: #1f2b4b;
  }

  .action-icon-danger:hover {
    background: #e91e63;
    color: #ffffff;
  }
</style>
