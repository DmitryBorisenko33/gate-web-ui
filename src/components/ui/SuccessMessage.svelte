<script>
  export let message = '';
</script>

{#if message}
  <div class="success-message" role="status">
    {message}
  </div>
{/if}

<style>
  .success-message {
    color: #10b981;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 6px;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }
</style>

