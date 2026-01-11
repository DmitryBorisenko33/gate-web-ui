<script>
  export let message = '';
</script>

{#if message}
  <div class="error-message" role="alert">
    {message}
  </div>
{/if}

<style>
  .error-message {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }
</style>

