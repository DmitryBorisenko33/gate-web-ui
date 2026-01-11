<script>
  export let message = 'No data available';
  export let icon = null;
</script>

<div class="empty-state">
  {#if icon}
    <div class="empty-icon">
      <svelte:component this={icon} size={48} color="#9fb0e6" />
    </div>
  {/if}
  <div class="empty-message">{message}</div>
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
    color: #9fb0e6;
  }

  .empty-icon {
    margin-bottom: 1rem;
    opacity: 0.6;
  }

  .empty-message {
    font-size: 0.875rem;
  }
</style>

