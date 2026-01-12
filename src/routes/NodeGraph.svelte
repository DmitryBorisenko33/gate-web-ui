<script>
  import { onMount, onDestroy, tick } from 'svelte';
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

  import { location, push } from 'svelte-spa-router';
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

  // Debug logging (disabled in production build)
  const DEV_LOG = import.meta.env.DEV;
  const log = (...args) => { if (DEV_LOG) console.log(...args); };
  const warn = (...args) => { if (DEV_LOG) console.warn(...args); };

  log('[NodeGraph] Mounted with params:', { mac, deviceId });

  let schema = null;
  let chart = null;
  let chartCanvas = null;
  let selectedFields = [];
  let loading = false;
  let error = null;
  // Постраничная навигация по записям (новые справа)
  // Calculate page size to show 24 hours of data
  function calculatePageSize(intervalMs) {
    if (intervalMs <= 0) return 3000; // fallback
    const hoursPerPage = 24;
    const msPerPage = hoursPerPage * 60 * 60 * 1000; // 24 hours in ms
    return Math.ceil(msPerPage / intervalMs);
  }
  let pageSize = 3000; // Initial value, will be recalculated based on interval_ms
  let pageIndex = 0; // 0 = самая новая страница
  let totalPages = 1;
  let cachedItems = []; // данные текущей страницы
  let meta = null; // meta от гейта
  let intervalMs = 0;

  onMount(async () => {
    log('[NodeGraph] Пользователь открыл график');
    
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
      log('[NodeGraph] Сейчас такое время:', currentTimeStr, `(${currentTime.toISOString()})`);
      
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
      log('[NodeGraph] Считаю время старейшее в базе (oldest_id=' + meta.oldest_id + '):', oldestTimeStr, `(${oldestTime.toISOString()})`);
      
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

      // Recalculate pageSize to always show 24 hours
      pageSize = calculatePageSize(intervalMs);

      const nowMs = Date.now();
      
      // Calculate hours per page (should be ~24 hours)
      const hoursPerPage = (pageSize * intervalMs) / (1000 * 60 * 60);

      // Клайп pageIdx в допустимые границы
      if (pageIdx < 0) pageIdx = 0;
      if (pageIdx > totalPages - 1) pageIdx = totalPages - 1;
      pageIndex = pageIdx;

      const offset = pageIndex * pageSize;

      const data = await fetchNodeData(mac, pageSize, offset);
      
      // Calculate totalPages from total records for this MAC (from first request)
      if (data.total && data.total > 0) {
        totalPages = Math.max(1, Math.ceil(data.total / pageSize));
      }
      
      // Adjust totalPages based on actual API response (fallback if total not available)
      // Priority: empty page > hasMore=false > hasMore=true
      if (data.items && data.items.length === 0) {
        // No data on this page - this page is beyond available data
        // Last page with data was pageIndex - 1, so totalPages = pageIndex
        totalPages = Math.max(1, pageIndex);
      } else if (!data.hasMore) {
        // No more data available - this is the last page with data
        // pageIndex is 0-based, so if pageIndex=4 is last, totalPages should be 5 (pages 0,1,2,3,4)
        totalPages = pageIndex + 1;
      } else if (data.hasMore) {
        // There's more data available
        // If we're at or beyond current totalPages estimate, increase it
        if (pageIndex >= totalPages - 1) {
          totalPages = pageIndex + 2; // At least one more page
        }
        // Ensure totalPages is at least pageIndex + 1 (current page + at least one more)
        totalPages = Math.max(totalPages, pageIndex + 1);
      }

      log('[NodeGraph] Загружена страница:', { pageIndex, offset, items: data.items?.length });

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

      log('[NodeGraph] Начинаю расчет времени для', rawItems.length, 'записей');

      // Anchor: newest запись этой страницы относительно head_id
      const newestRecordId = rawItems.length > 0 ? Math.max(...rawItems.map(item => item.recordId)) : 0;
      const oldestRecordId = rawItems.length > 0 ? Math.min(...rawItems.map(item => item.recordId)) : 0;
      let anchorTime = nowMs;
      if (newestRecordId > 0 && meta.head_id) {
        const recordsFromHead = meta.head_id - newestRecordId;
        anchorTime = nowMs - recordsFromHead * intervalMs;
      }

      const items = [];

      if (rawItems.length > 0 && intervalMs > 0) {
        const sortedDesc = [...rawItems].sort((a, b) => b.recordId - a.recordId);
        let currentTime = anchorTime;

        log('[NodeGraph] Расчет времени записей (страница):', {
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

        log('[NodeGraph] По логу с какого времени по какое построен график:');
        if (items.length > 0) {
          const firstTime = new Date(items[0].sampleTsMs);
          const lastTime = new Date(items[items.length - 1].sampleTsMs);
          log('  От:', firstTime.toISOString());
          log('  До:', lastTime.toISOString());
        } else {
          log('  Нет данных для отображения');
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
      // Chart will be updated by reactive statement when chartCanvas is ready
      // But also try to update immediately if chartCanvas is already bound
      if (chartCanvas) {
        updateChart(items);
      }
    } catch (e) {
      error = e.message;
      console.error('[NodeGraph] Error loading data:', e);
    } finally {
      loading = false;
    }
  }

  function updateChart(items) {
    if (!chartCanvas || !schema) {
      log('[NodeGraph] Cannot update chart:', { chartCanvas: !!chartCanvas, schema: !!schema });
      return;
    }

    if (items.length === 0) {
      log('[NodeGraph] No items to display');
      return;
    }

    log('[NodeGraph] Updating chart with', items.length, 'items, selectedFields:', selectedFields);

    const datasets = selectedFields.map((fieldKey, idx) => {
      const field = schema.fields.find(f => f.key === fieldKey);
      if (!field) {
        warn('[NodeGraph] Field not found:', fieldKey);
        return null;
      }

      const colors = ['#2f6df6', '#00c853', '#ff9800', '#e91e63'];
      const color = colors[idx % colors.length];
      const icon = field.icon || 'trending-up';

      const data = items.map(item => ({
        x: item.sampleTsMs,
        y: item.values?.[fieldKey] || 0,
      })).filter(d => d.x > 0); // Filter out invalid timestamps

      log('[NodeGraph] Dataset for', fieldKey, ':', data.length, 'points');

      return {
        label: field.label || field.key,
        icon: icon, // Store icon for legend
        data,
        borderColor: color,
        backgroundColor: color + '22',
        borderWidth: 2,
        fill: true,
        pointRadius: 2.5,
        pointHoverRadius: 4,
        pointHitRadius: 6,
        pointBorderWidth: 0,
        pointBackgroundColor: color,
      };
    }).filter(Boolean);

    if (datasets.length === 0) {
      warn('[NodeGraph] No valid datasets');
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
                millisecond: 'HH:mm:ss.SSS',
                second: 'HH:mm:ss',
                minute: 'HH:mm',
                hour: 'HH:mm',
                day: 'dd.MM HH:mm',
                week: 'dd.MM',
                month: 'MMM yyyy',
                quarter: 'MMM yyyy',
                year: 'yyyy',
              },
              tooltipFormat: 'dd.MM.yyyy HH:mm:ss',
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

    log('[NodeGraph] Chart created successfully');
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
  $: if (cachedItems.length > 0 && schema && selectedFields.length > 0 && chartCanvas) {
    // Use tick to ensure chartCanvas is bound to DOM
    tick().then(() => {
      updateChart(cachedItems);
    });
  }
</script>

<div class="node-graph-container">
  <div class="mb-4">
    <Button variant="secondary" size="small" on:click={() => push('/dashboard')}>
      ← Dashboard
    </Button>
  </div>

  <PageTitle>Node {mac} - Graph</PageTitle>

  <ErrorMessage message={error} />

  {#if loading && !schema}
    <LoadingSpinner text="Loading schema..." />
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
    <div class="mb-4 pagination">
      <Button
        on:click={prevPage}
        disabled={pageIndex >= totalPages - 1}
        title="Более старые записи"
      >
        ←
      </Button>
      <div class="pagination-info">
        Страница {pageIndex + 1} / {totalPages}
      </div>
      <Button
        on:click={nextPage}
        disabled={pageIndex === 0}
        title="Более новые записи"
      >
        →
      </Button>
    </div>

    <div class="chart-container">
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

<style>
  .node-graph-container {
    min-height: 100%;
    padding: 0;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .pagination-info {
    font-size: 1.125rem;
    font-weight: 600;
    min-width: 160px;
    text-align: center;
    color: #c6d1f0;
  }

  .chart-container {
    background: #111a2f;
    border: 1px solid #1f2b4b;
    border-radius: 8px;
    padding: 1rem;
    position: relative;
    height: 500px;
  }

  /* Mobile styles */
  @media (max-width: 767px) {
    .chart-container {
      height: 400px;
      padding: 0.75rem;
    }

    canvas {
      max-width: 100%;
    }
  }
</style>

