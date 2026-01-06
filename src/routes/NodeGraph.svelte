<script>
  import { onMount, onDestroy } from 'svelte';
  import { fetchNodeData, fetchSchema } from '../lib/api.js';
  import { formatTs, formatValue } from '../lib/utils.js';
  import { Chart, registerables } from 'chart.js';
  import 'chartjs-adapter-date-fns';

  Chart.register(...registerables);

  export let navigate;
  export let params = {};

  const mac = params.mac || '';
  const deviceId = params.deviceId || '';

  console.log('[NodeGraph] Mounted with params:', { mac, deviceId });

  let schema = null;
  let chart = null;
  let chartCanvas = null;
  let selectedFields = [];
  let loading = false;
  let error = null;
  let offset = 0;
  const limit = 1000;

  onMount(async () => {
    await loadSchema();
    if (schema && schema.fields.length > 0) {
      selectedFields = schema.fields.slice(0, 2).map(f => f.key);
      await loadData();
    }
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });

  async function loadSchema() {
    if (!deviceId) return;
    try {
      schema = await fetchSchema(deviceId);
    } catch (e) {
      console.error('[NodeGraph] Error loading schema:', e);
      error = e.message;
    }
  }

  async function loadData() {
    if (!mac || selectedFields.length === 0) return;
    try {
      loading = true;
      error = null;
      const data = await fetchNodeData(mac, limit, offset);
      console.log('[NodeGraph] Data loaded:', { itemsCount: data.items?.length, firstItem: data.items?.[0] });
      // Use recordId as timestamp if sampleTsMs is 0
      const items = (data.items || []).map(item => ({
        ...item,
        sampleTsMs: item.sampleTsMs || item.recordId * 1000
      }));
      updateChart(items);
    } catch (e) {
      error = e.message;
      console.error('[NodeGraph] Error loading data:', e);
    } finally {
      loading = false;
    }
  }

  function updateChart(items) {
    if (!chartCanvas || !schema) {
      console.log('[NodeGraph] Cannot update chart:', { chartCanvas: !!chartCanvas, schema: !!schema });
      return;
    }

    if (items.length === 0) {
      console.log('[NodeGraph] No items to display');
      return;
    }

    console.log('[NodeGraph] Updating chart with', items.length, 'items, selectedFields:', selectedFields);

    const datasets = selectedFields.map((fieldKey, idx) => {
      const field = schema.fields.find(f => f.key === fieldKey);
      if (!field) {
        console.warn('[NodeGraph] Field not found:', fieldKey);
        return null;
      }

      const colors = ['#2f6df6', '#00c853', '#ff9800', '#e91e63'];
      const color = colors[idx % colors.length];

      const data = items.map(item => ({
        x: item.sampleTsMs,
        y: item.values?.[fieldKey] || 0,
      })).filter(d => d.x > 0); // Filter out invalid timestamps

      console.log('[NodeGraph] Dataset for', fieldKey, ':', data.length, 'points');

      return {
        label: field.label || field.key,
        data,
        borderColor: color,
        backgroundColor: color + '22',
        borderWidth: 2,
        fill: true,
      };
    }).filter(Boolean);

    if (datasets.length === 0) {
      console.warn('[NodeGraph] No valid datasets');
      return;
    }

    if (chart) {
      chart.destroy();
    }

    chart = new Chart(chartCanvas, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                minute: 'MM/dd HH:mm',
              },
            },
            ticks: {
              color: '#c6d1f0',
              maxRotation: 45,
            },
            grid: {
              color: '#1f2b4b',
            },
          },
          y: {
            ticks: {
              color: '#c6d1f0',
            },
            grid: {
              color: '#1f2b4b',
            },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: '#c6d1f0',
            },
          },
        },
      },
    });

    console.log('[NodeGraph] Chart created successfully');
  }

  function toggleField(fieldKey) {
    if (selectedFields.includes(fieldKey)) {
      if (selectedFields.length > 1) {
        selectedFields = selectedFields.filter(k => k !== fieldKey);
        loadData();
      }
    } else {
      selectedFields = [...selectedFields, fieldKey];
      loadData();
    }
  }
</script>

<div class="min-h-screen bg-[#0b1220] text-[#c6d1f0] p-4">
  <div class="mb-4">
    <button
      class="px-4 py-2 bg-[#2f6df6] rounded hover:bg-[#1e4fc4]"
      on:click={() => navigate('dashboard')}
    >
      ← Dashboard
    </button>
  </div>

  <h1 class="text-2xl font-bold mb-4">Node {mac} - Graph</h1>

  {#if error}
    <div class="text-red-400 mb-4">Error: {error}</div>
  {/if}

  {#if loading && !schema}
    <div class="text-center py-8">Loading schema...</div>
  {:else if error}
    <div class="text-red-400 mb-4">Error: {error}</div>
  {:else if schema}
    <div class="mb-4 flex gap-2 flex-wrap">
      {#each schema.fields as field}
        <button
          class="px-3 py-1 rounded border {selectedFields.includes(field.key) ? 'bg-[#2f6df6] border-[#2f6df6]' : 'bg-[#111a2f] border-[#1f2b4b]'}"
          on:click={() => toggleField(field.key)}
        >
          {field.label || field.key}
        </button>
      {/each}
    </div>

    {#if loading}
      <div class="text-center py-4">Loading data...</div>
    {/if}

    <div class="bg-[#111a2f] border border-[#1f2b4b] rounded-lg p-4" style="height: 500px;">
      <canvas bind:this={chartCanvas}></canvas>
    </div>
  {:else}
    <div class="text-center py-8">Loading schema...</div>
  {/if}
</div>

