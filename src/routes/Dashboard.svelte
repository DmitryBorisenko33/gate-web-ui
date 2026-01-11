<script>
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { fetchNodes } from '../lib/api.js';
  import { formatTs, formatValue } from '../lib/utils.js';
  import {
    PageTitle,
    LoadingSpinner,
    ErrorMessage,
    EmptyState,
    Card,
    Button,
    Grid
  } from '../components/ui';

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
    push(`/table/${mac}/${sensorTypeId}`);
  }

  function handleGraphClick(mac, sensorTypeId, event) {
    event.stopPropagation();
    console.log('[Dashboard] Navigate to graph:', { mac, deviceId: sensorTypeId });
    push(`/graph/${mac}/${sensorTypeId}`);
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
            <Button
              size="small"
              fullWidth={true}
              on:click={(e) => handleTableClick(node.mac, node.sensorTypeId, e)}
            >
              Table
            </Button>
            <Button
              size="small"
              fullWidth={true}
              on:click={(e) => handleGraphClick(node.mac, node.sensorTypeId, e)}
            >
              Graph
            </Button>
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
  }
</style>
