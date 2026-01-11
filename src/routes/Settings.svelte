<script>
  import { resetGate, fetchSystem } from '../lib/api.js';
  import { onMount } from 'svelte';
  import {
    PageTitle,
    Card,
    Button,
    LoadingSpinner,
    ErrorMessage,
    SuccessMessage
  } from '../components/ui';

  let loading = false;
  let message = '';
  let error = '';
  let systemInfo = null;
  let systemLoading = true;

  onMount(async () => {
    await loadSystemInfo();
    // Refresh system info every 5 seconds
    const interval = setInterval(loadSystemInfo, 5000);
    return () => clearInterval(interval);
  });

  async function loadSystemInfo() {
    try {
      const data = await fetchSystem();
      console.log('[Settings] System info received:', data);
      systemInfo = data;
      systemLoading = false;
    } catch (e) {
      console.error('[Settings] Failed to load system info:', e);
      error = e.message || String(e);
      systemLoading = false;
    }
  }

  function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}д ${hours % 24}ч ${minutes % 60}м`;
    } else if (hours > 0) {
      return `${hours}ч ${minutes % 60}м ${seconds % 60}с`;
    } else if (minutes > 0) {
      return `${minutes}м ${seconds % 60}с`;
    } else {
      return `${seconds}с`;
    }
  }

  function formatTime(isoString) {
    if (!isoString) return 'Не синхронизировано';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (e) {
      return isoString;
    }
  }

  async function handleReset() {
    if (loading) return;
    const confirmText = 'Сбросить базу и счетчик? Будут удалены все данные.';
    if (!confirm(confirmText)) return;
    try {
      loading = true;
      message = '';
      error = '';
      await resetGate();
      message = 'База и счетчик сброшены (session_id=1, данные удалены).';
      await loadSystemInfo(); // Refresh system info after reset
    } catch (e) {
      error = e.message || String(e);
    } finally {
      loading = false;
    }
  }
</script>

<div class="settings-container">
  <PageTitle>Настройки</PageTitle>

  <ErrorMessage message={error} />
  <SuccessMessage message={message} />

  <!-- System Information -->
  <Card padding="medium" class="system-info-card">
    <h2 class="card-title">Системная информация</h2>
    {#if systemLoading}
      <LoadingSpinner size="small" text="Загрузка..." />
    {:else if systemInfo}
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Свободная память:</span>
          <span class="info-value">
            {systemInfo.heap?.free ? `${(systemInfo.heap.free / 1024).toFixed(1)} KB` : 'N/A'}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">Минимум свободной памяти:</span>
          <span class="info-value">
            {systemInfo.heap?.min_free ? `${(systemInfo.heap.min_free / 1024).toFixed(1)} KB` : 'N/A'}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">Самый большой свободный блок:</span>
          <span class="info-value">
            {systemInfo.heap?.largest_free ? `${(systemInfo.heap.largest_free / 1024).toFixed(1)} KB` : 'N/A'}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">Всего памяти:</span>
          <span class="info-value">
            {systemInfo.heap?.total ? `${(systemInfo.heap.total / 1024).toFixed(1)} KB` : 'N/A'}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">Использовано:</span>
          <span class="info-value">
            {systemInfo.heap?.used 
              ? `${(systemInfo.heap.used / 1024).toFixed(1)} KB${systemInfo.heap.used_percent ? ` (${systemInfo.heap.used_percent.toFixed(1)}%)` : ''}`
              : 'N/A'}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">Время работы:</span>
          <span class="info-value">
            {systemInfo.uptime_ms !== undefined && systemInfo.uptime_ms !== null 
              ? formatUptime(systemInfo.uptime_ms) 
              : 'N/A'}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">NTP статус:</span>
          <span class="info-value" class:status-synced={systemInfo.ntc === 'synced'}>
            {systemInfo.ntc === 'synced' ? 'Синхронизировано' : systemInfo.ntc === 'not_synced' ? 'Не синхронизировано' : 'N/A'}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">Время (локальное):</span>
          <span class="info-value">{formatTime(systemInfo.time)}</span>
        </div>
      </div>
    {:else if !systemLoading}
      <ErrorMessage message="Не удалось загрузить информацию" />
    {/if}
  </Card>

  <!-- Factory Reset -->
  <Card padding="medium" class="reset-card">
    <h2 class="card-title">Сброс данных</h2>
    <p class="card-description">
      Удаляет всю базу TSDB на гейте и сбрасывает счетчик session_id на 1. Действие необратимо.
    </p>
    <Button
      variant="danger"
      disabled={loading}
      on:click={handleReset}
    >
      {loading ? 'Выполняю...' : 'Сбросить базу и счетчик'}
    </Button>
  </Card>
</div>

<style>
  .settings-container {
    min-height: 100%;
    padding: 0;
  }

  .card-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: #c6d1f0;
  }

  .card-description {
    font-size: 0.875rem;
    color: #9fb0e6;
    margin-bottom: 1rem;
  }

  .system-info-card,
  .reset-card {
    max-width: 42rem;
    margin-bottom: 1rem;
  }

  .info-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    padding: 0.25rem 0;
  }

  .info-label {
    color: #9fb0e6;
  }

  .info-value {
    font-family: monospace;
    color: #c6d1f0;
    text-align: right;
  }

  .status-synced {
    color: #10b981;
  }

  .debug-info {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(31, 43, 75, 0.3);
    border-radius: 6px;
    font-size: 0.75rem;
  }

  .debug-info summary {
    cursor: pointer;
    color: #9fb0e6;
    margin-bottom: 0.5rem;
  }

  .debug-info pre {
    color: #c6d1f0;
    overflow-x: auto;
    font-size: 0.75rem;
    line-height: 1.4;
  }

  /* Mobile styles */
  @media (max-width: 767px) {
    .card-title {
      font-size: 1.125rem;
    }

    .info-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }

    .info-value {
      text-align: left;
    }
  }
</style>
