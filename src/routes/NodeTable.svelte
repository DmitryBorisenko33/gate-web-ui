<script>
  import { onMount } from 'svelte';
  import { location, push } from 'svelte-spa-router';
  import { fetchNodeData, fetchSchema } from '../lib/api.js';
  import { formatTs, formatValue } from '../lib/utils.js';
  import { decodePayload } from '../lib/payload-decoder.js';
  import {
    PageTitle,
    Button,
    ErrorMessage,
    LoadingSpinner
  } from '../components/ui';

  // Get route parameters from URL
  $: routeParts = $location.split('/').filter(p => p);
  $: mac = routeParts[1] || '';
  $: deviceId = routeParts[2] || '';

  console.log('[NodeTable] Mounted with params:', { mac, deviceId });

  let rows = [];
  let schema = null;
  let loading = false;
  let error = null;
  let offset = 0;
  const limit = 200;
  let hasMore = true;

  onMount(async () => {
    console.log('[NodeTable] onMount, mac:', mac, 'deviceId:', deviceId);
    await loadSchema();
    if (schema) {
      await loadData();
    }
  });
  
  // Reload data when schema becomes available (reactive statement)
  $: if (schema && mac && rows.length === 0 && !loading) {
    loadData();
  }

  async function loadSchema() {
    if (!deviceId) return;
    try {
      schema = await fetchSchema(deviceId);
      console.log('[NodeTable] Schema loaded:', schema);
    } catch (e) {
      console.error('[NodeTable] Error loading schema:', e);
      error = e.message;
    }
  }

  async function loadData() {
    if (!mac || !schema) return;
    try {
      loading = true;
      error = null;
      const data = await fetchNodeData(mac, limit, offset);
      console.log('[NodeTable] Data loaded:', { itemsCount: data.items?.length, hasMore: data.hasMore, offset });
      console.log('[NodeTable] First item (raw):', data.items?.[0]);
      
      // Decode payload for each item
      const rawItems = (data.items || []).map(item => {
        const values = decodePayload(item.payload, schema);
        return {
          recordId: item.recordId,
          sessionId: item.sessionId,
          dtMs: item.dtMs || 0,
          rssi: item.rssi,
          timestampMs: item.timestampMs || 0,
          values
        };
      });
      
      // Sort by recordId to ensure correct order
      rawItems.sort((a, b) => a.recordId - b.recordId);
      
      // Calculate absolute timestamps: предпочитаем timestampMs (NTP), иначе восстанавливаем по dtMs
      const nowMs = Date.now();
      const decodedItems = [];
      if (rawItems.length > 0) {
        // Start from last record (most recent)
        let currentTs = rawItems[rawItems.length - 1].timestampMs || nowMs;
        for (let i = rawItems.length - 1; i >= 0; i--) {
          const item = rawItems[i];
          const ts = item.timestampMs && item.timestampMs > 0 ? item.timestampMs : currentTs;
          decodedItems.unshift({
            ...item,
            sampleTsMs: ts
          });
          if (i > 0) {
            const prevItem = rawItems[i - 1];
            const gapMs = (item.sessionId !== prevItem.sessionId) ? 60000 : 0;
            currentTs = ts - item.dtMs - gapMs;
          }
        }
      }
      
      console.log('[NodeTable] First item (decoded):', decodedItems[0]);
      
      if (offset === 0) {
        rows = decodedItems;
      } else {
        rows = [...rows, ...decodedItems];
      }
      hasMore = data.hasMore || false;
      console.log('[NodeTable] Rows count:', rows.length);
    } catch (e) {
      error = e.message;
      console.error('[NodeTable] Error loading data:', e);
    } finally {
      loading = false;
    }
  }

  function loadMore() {
    if (!hasMore || loading) return;
    offset += limit;
    loadData();
  }

  $: columns = schema ? [
    { key: 'time', label: 'Time', isMeta: true },
    { key: 'session_id', label: 'Session', isMeta: true },
    { key: 'record_id', label: 'Record', isMeta: true },
    ...(schema.fields || []).map(f => ({
      key: f.key,
      label: f.label || f.key,
      unit: f.unit,
      isMeta: false,
    })),
    { key: 'rssi', label: 'RSSI', isMeta: true },
  ] : [];
  
  $: console.log('[NodeTable] Reactive update:', { 
    schema: !!schema, 
    columnsCount: columns.length, 
    rowsCount: rows.length,
    hasSchema: !!schema,
    schemaFields: schema?.fields?.length || 0
  });
</script>

<div class="node-table-container">
  <div class="mb-4">
    <Button variant="secondary" size="small" on:click={() => push('/dashboard')}>
      ← Dashboard
    </Button>
  </div>

  <PageTitle>Node {mac}</PageTitle>

  <ErrorMessage message={error} />

  <div class="mb-4 text-sm text-[#9fb0e6]">
    Debug: schema={schema ? 'yes' : 'no'}, columns={columns.length}, rows={rows.length}, loading={loading}, deviceId={deviceId}, mac={mac}
  </div>

  {#if loading && rows.length === 0 && !schema}
    <LoadingSpinner text="Loading schema and data..." />
  {:else if !schema}
    <LoadingSpinner text="Loading schema..." />
  {:else if schema && columns.length === 0}
    <div class="text-center py-8">
      <div>Schema loaded but no columns</div>
      <div class="text-sm text-[#9fb0e6] mt-2">Schema fields: {schema.fields?.length || 0}</div>
    </div>
  {:else if schema && columns.length > 0}
    {#if rows.length === 0}
      <div class="text-center py-8">No data available (mac: {mac || 'missing'})</div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-[#1f2b4b]">
              {#each columns as col}
                <th class="px-4 py-2 text-left font-semibold">{col.label} {#if col.unit}({col.unit}){/if}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each rows as row}
              <tr class="border-b border-[#111a2f]">
                {#each columns as col}
                  <td class="px-4 py-2">
                    {#if col.isMeta}
                      {#if col.key === 'time'}
                        {formatTs(row.sampleTsMs || row.recordId * 1000)}
                      {:else if col.key === 'session_id'}
                        {row.sessionId}
                      {:else if col.key === 'record_id'}
                        {row.recordId}
                      {:else if col.key === 'rssi'}
                        {row.rssi}
                      {/if}
                    {:else}
                      {formatValue(row.values?.[col.key])}
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if hasMore}
      <div class="mt-4">
        <Button
        on:click={loadMore}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Load Older'}
        </Button>
      </div>
    {/if}
  {:else}
    <div class="text-center py-8">Loading schema...</div>
  {/if}
</div>

<style>
  .node-table-container {
    min-height: 100%;
    padding: 0;
  }

  .overflow-x-auto {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  thead tr {
    border-bottom: 1px solid #1f2b4b;
  }

  th {
    padding: 0.5rem 1rem;
    text-align: left;
    font-weight: 600;
    color: #c6d1f0;
    white-space: nowrap;
  }

  tbody tr {
    border-bottom: 1px solid #111a2f;
  }

  td {
    padding: 0.5rem 1rem;
    color: #c6d1f0;
    word-break: break-word;
  }

  /* Mobile: make table scrollable horizontally */
  @media (max-width: 767px) {
    .overflow-x-auto {
      display: block;
      width: 100%;
      overflow-x: auto;
    }

    table {
      min-width: 600px;
    }

    th, td {
      padding: 0.5rem 0.75rem;
      font-size: 0.8125rem;
    }
  }
</style>

