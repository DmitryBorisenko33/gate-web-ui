<script>
  import { resetGate, fetchSystem } from '../lib/api.js';
  import { onMount } from 'svelte';

  export let navigate;

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
      systemInfo = await fetchSystem();
      systemLoading = false;
    } catch (e) {
      console.error('[Settings] Failed to load system info:', e);
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

<div class="min-h-screen bg-[#0b1220] text-[#c6d1f0]">
  <h1 class="text-2xl font-bold mb-4">Настройки</h1>

  {#if error}
    <div class="text-red-400 mb-4">Ошибка: {error}</div>
  {/if}
  {#if message}
    <div class="text-green-400 mb-4">{message}</div>
  {/if}

  <!-- System Information -->
  <div class="bg-[#111a2f] border border-[#1f2b4b] rounded-lg p-4 mb-4 max-w-xl">
    <h2 class="text-xl font-semibold mb-3">Системная информация</h2>
    {#if systemLoading}
      <div class="text-[#9fb0e6]">Загрузка...</div>
    {:else if systemInfo}
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-[#9fb0e6]">Свободная память:</span>
          <span class="font-mono">{(systemInfo.heap.free / 1024).toFixed(1)} KB</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#9fb0e6]">Минимум свободной памяти:</span>
          <span class="font-mono">{(systemInfo.heap.min_free / 1024).toFixed(1)} KB</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#9fb0e6]">Самый большой свободный блок:</span>
          <span class="font-mono">{(systemInfo.heap.largest_free / 1024).toFixed(1)} KB</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#9fb0e6]">Всего памяти:</span>
          <span class="font-mono">{(systemInfo.heap.total / 1024).toFixed(1)} KB</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#9fb0e6]">Использовано:</span>
          <span class="font-mono">{(systemInfo.heap.used / 1024).toFixed(1)} KB ({systemInfo.heap.used_percent.toFixed(1)}%)</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#9fb0e6]">Время работы:</span>
          <span class="font-mono">{formatUptime(systemInfo.uptime_ms)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#9fb0e6]">NTP статус:</span>
          <span class={systemInfo.ntc === 'synced' ? 'text-green-400' : 'text-yellow-400'}>
            {systemInfo.ntc === 'synced' ? 'Синхронизировано' : 'Не синхронизировано'}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#9fb0e6]">Время (локальное):</span>
          <span class="font-mono">{formatTime(systemInfo.time)}</span>
        </div>
      </div>
    {:else}
      <div class="text-red-400">Не удалось загрузить информацию</div>
    {/if}
  </div>

  <!-- Factory Reset -->
  <div class="bg-[#111a2f] border border-[#1f2b4b] rounded-lg p-4 max-w-xl">
    <h2 class="text-xl font-semibold mb-2">Сброс данных</h2>
    <p class="text-sm text-[#9fb0e6] mb-4">
      Удаляет всю базу TSDB на гейте и сбрасывает счетчик session_id на 1. Действие необратимо.
    </p>
    <button
      class="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
      on:click={handleReset}
      disabled={loading}
    >
      {loading ? 'Выполняю...' : 'Сбросить базу и счетчик'}
    </button>
  </div>
</div>

