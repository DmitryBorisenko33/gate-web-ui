<script>
  import { resetGate } from '../lib/api.js';

  export let navigate;

  let loading = false;
  let message = '';
  let error = '';

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

