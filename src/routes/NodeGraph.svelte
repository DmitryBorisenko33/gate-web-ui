<script>
  import { onMount, onDestroy } from 'svelte';
  import { fetchNodeData, fetchSchema, fetchMeta } from '../lib/api.js';
  import { formatTs, formatValue } from '../lib/utils.js';
  import { decodePayload } from '../lib/payload-decoder.js';
  import { Chart, registerables } from 'chart.js';
  import 'chartjs-adapter-date-fns';
  import * as LucideIcons from 'lucide-svelte';

  Chart.register(...registerables);

  // Get icon component by name from Lucide (icon names come directly from gate schema)
  function getIconComponent(iconName) {
    // Convert kebab-case to PascalCase (e.g., "thermometer" -> "Thermometer")
    const componentName = iconName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    
    // Get icon from lucide-svelte, fallback to TrendingUp if not found
    return LucideIcons[componentName] || LucideIcons.TrendingUp;
  }

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
  // Постраничная навигация по записям (новые справа)
  const pageSize = 3000;
  let pageIndex = 0; // 0 = самая новая страница
  let totalPages = 1;
  let cachedItems = []; // данные текущей страницы
  let meta = null; // meta от гейта
  let intervalMs = 0;

  onMount(async () => {
    console.log('[NodeGraph] Пользователь открыл график');
    
    await loadSchema();
    // Load meta first to get interval_ms and head_id
    try {
      meta = await fetchMeta();
      intervalMs = meta.interval_ms || 0;
      
      const nowMs = Date.now();
      const currentTime = new Date(nowMs);
      const currentTimeStr = currentTime.toLocaleString('ru-RU', { 
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
      });
      console.log('[NodeGraph] Сейчас такое время:', currentTimeStr, `(${currentTime.toISOString()})`);
      
      if (intervalMs === 0) {
        error = 'Cannot calculate time range: interval_ms is 0. Please use mobile app for this device.';
        return;
      }
      
      // Calculate oldest record time
      const recordsRange = meta.head_id - meta.oldest_id;
      const msRange = recordsRange * intervalMs;
      const oldestTimeMs = nowMs - msRange;
      const oldestTime = new Date(oldestTimeMs);
      const oldestTimeStr = oldestTime.toLocaleString('ru-RU', { 
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
      });
      console.log('[NodeGraph] Считаю время старейшее в базе (oldest_id=' + meta.oldest_id + '):', oldestTimeStr, `(${oldestTime.toISOString()})`);
      
    } catch (e) {
      console.error('[NodeGraph] Error loading meta:', e);
      error = e.message;
      return;
    }
    
    if (schema && schema.fields.length > 0) {
      selectedFields = [schema.fields[0].key]; // Always select first field by default
      await loadPage(0); // newest page
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

  // Загрузка страницы записей (pageIdx: 0 = самые новые)
  async function loadPage(pageIdx) {
    if (!mac || !schema || !meta || selectedFields.length === 0) return;
    try {
      loading = true;
      error = null;

      // Обновляем meta перед запросом
      meta = await fetchMeta();
      intervalMs = meta.interval_ms || 0;
      if (intervalMs === 0) {
        error = 'interval_ms=0, не могу восстановить время';
        loading = false;
        return;
      }

      const nowMs = Date.now();
      const recordsRange = meta.head_id - meta.oldest_id + 1;
      totalPages = Math.max(1, Math.ceil(recordsRange / pageSize));

      // Клайп pageIdx в допустимые границы
      if (pageIdx < 0) pageIdx = 0;
      if (pageIdx > totalPages - 1) pageIdx = totalPages - 1;
      pageIndex = pageIdx;

      const offset = pageIndex * pageSize;
      const data = await fetchNodeData(mac, pageSize, offset);
      console.log('[NodeGraph] Загружена страница:', { pageIndex, offset, items: data.items?.length });

      // Декодируем payload
      const rawItems = (data.items || []).map(item => {
        const values = decodePayload(item.payload, schema);
        return {
          recordId: item.recordId,
          sessionId: item.sessionId,
          dtMs: item.dtMs || 0,
          rssi: item.rssi,
          timestampMs: item.timestampMs || 0,
          sensorTypeId: item.sensorTypeId,
          payload: item.payload,
          values
        };
      }).sort((a, b) => a.recordId - b.recordId);

      console.log('[NodeGraph] Начинаю расчет времени для', rawItems.length, 'записей');

      // Anchor: newest запись этой страницы относительно head_id
      const newestRecordId = rawItems.length > 0 ? Math.max(...rawItems.map(item => item.recordId)) : 0;
      let anchorTime = nowMs;
      if (newestRecordId > 0 && meta.head_id) {
        const recordsFromHead = meta.head_id - newestRecordId;
        anchorTime = nowMs - recordsFromHead * intervalMs;
      }

      const items = [];

      if (rawItems.length > 0 && intervalMs > 0) {
        const sortedDesc = [...rawItems].sort((a, b) => b.recordId - a.recordId);
        let currentTime = anchorTime;

        console.log('[NodeGraph] Расчет времени записей (страница):', {
          anchorTime: new Date(anchorTime).toISOString(),
          totalItems: sortedDesc.length,
          firstRecordId: sortedDesc[0]?.recordId ?? null,
          lastRecordId: sortedDesc[sortedDesc.length - 1]?.recordId ?? null
        });

        sortedDesc.forEach((item, idx) => {
          if (item.sensorTypeId === 0xFFFE) {
            // GAP: payload содержит gap_ms (LE)
            if (item.payload && item.payload.length >= 8) {
              const dv = new DataView(item.payload.buffer, item.payload.byteOffset, item.payload.byteLength);
              const gapMs = Number(dv.getBigUint64(0, true));
              if (gapMs > 0) currentTime -= gapMs;
            }
            return; // не рисуем точку для gap
          }

          if (item.timestampMs && item.timestampMs > 0) {
            currentTime = item.timestampMs;
            items.push({ ...item, sampleTsMs: item.timestampMs });
          } else if (idx === 0) {
            items.push({ ...item, sampleTsMs: currentTime });
          } else {
            currentTime = currentTime - intervalMs;
            items.push({ ...item, sampleTsMs: currentTime });
          }
        });

        items.sort((a, b) => a.sampleTsMs - b.sampleTsMs);

        console.log('[NodeGraph] По логу с какого времени по какое построен график:');
        if (items.length > 0) {
          const firstTime = new Date(items[0].sampleTsMs);
          const lastTime = new Date(items[items.length - 1].sampleTsMs);
          console.log('  От:', firstTime.toISOString());
          console.log('  До:', lastTime.toISOString());
        } else {
          console.log('  Нет данных для отображения');
        }
      } else if (rawItems.length > 0) {
        // fallback по dt_ms
        let currentTs = nowMs;
        for (let i = rawItems.length - 1; i >= 0; i--) {
          const item = rawItems[i];
          items.unshift({
            ...item,
            sampleTsMs: currentTs
          });
          if (i > 0) {
            const prevItem = rawItems[i - 1];
            const gapMs = (item.sessionId !== prevItem.sessionId) ? 60000 : 0;
            currentTs = currentTs - item.dtMs - gapMs;
          }
        }
      }

      cachedItems = items;
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
      const icon = field.icon || 'trending-up';

      const data = items.map(item => ({
        x: item.sampleTsMs,
        y: item.values?.[fieldKey] || 0,
      })).filter(d => d.x > 0); // Filter out invalid timestamps

      console.log('[NodeGraph] Dataset for', fieldKey, ':', data.length, 'points');

      return {
        label: field.label || field.key,
        icon: icon, // Store icon for legend
        data,
        borderColor: color,
        backgroundColor: color + '22',
        borderWidth: 2,
        fill: true,
        pointRadius: 0, // No points
        pointHoverRadius: 0, // No points on hover
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
      }
    } else {
      selectedFields = [...selectedFields, fieldKey];
    }
    // Force chart update by triggering reactive statement
    // The reactive statement will handle the update
  }

  // Переход к более старой странице
  async function prevPage() {
    if (pageIndex >= totalPages - 1) return;
    await loadPage(pageIndex + 1);
  }

  // Переход к более новой странице
  async function nextPage() {
    if (pageIndex <= 0) return;
    await loadPage(pageIndex - 1);
  }

  // Reactive statement to update chart when selectedFields change
  // Data is already filtered by day on the server, so we just need to update when fields change
  $: if (cachedItems.length > 0 && schema && selectedFields.length > 0) {
    updateChart(cachedItems);
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
        {@const iconName = field.icon || 'trending-up'}
        {@const IconComponent = getIconComponent(iconName)}
        {@const isActive = selectedFields.includes(field.key)}
        <button
          class="p-2 rounded border flex items-center justify-center {isActive ? 'bg-[#2f6df6] border-[#2f6df6]' : 'bg-[#111a2f] border-[#1f2b4b] hover:border-[#2f6df6]'}"
          on:click={() => toggleField(field.key)}
          title="{field.label || field.key}"
        >
          <svelte:component this={IconComponent} size={20} color={isActive ? '#fff' : '#c6d1f0'} />
        </button>
      {/each}
    </div>

    <!-- Постраничная навигация: влево старее, вправо новее -->
    <div class="mb-4 flex items-center justify-center gap-4">
      <button
        class="px-4 py-2 bg-[#2f6df6] rounded hover:bg-[#1e4fc4] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        on:click={prevPage}
        disabled={pageIndex >= totalPages - 1}
        title="Более старые записи"
      >
        ←
      </button>
      <div class="text-lg font-semibold min-w-[160px] text-center">
        Страница {pageIndex + 1} / {totalPages}
      </div>
      <button
        class="px-4 py-2 bg-[#2f6df6] rounded hover:bg-[#1e4fc4] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        on:click={nextPage}
        disabled={pageIndex === 0}
        title="Более новые записи"
      >
        →
      </button>
    </div>

    <div class="bg-[#111a2f] border border-[#1f2b4b] rounded-lg p-4 relative" style="height: 500px;">
      {#if loading}
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2f6df6]"></div>
        </div>
      {:else if cachedItems.length === 0 && !error}
        <div class="absolute inset-0 flex items-center justify-center text-[#9fb0e6]">
          No data on this page
        </div>
      {/if}
      <canvas bind:this={chartCanvas}></canvas>
    </div>
  {:else}
    <div class="text-center py-8">Loading schema...</div>
  {/if}
</div>

