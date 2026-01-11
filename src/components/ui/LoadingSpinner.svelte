<script>
  export let size = 'medium'; // small, medium, large
  export let text = '';
</script>

<div class="loading-container">
  <div
    class="spinner"
    class:spinner-small={size === 'small'}
    class:spinner-medium={size === 'medium'}
    class:spinner-large={size === 'large'}
  ></div>
  {#if text}
    <div class="loading-text">{text}</div>
  {/if}
</div>

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .spinner {
    border: 2px solid #1f2b4b;
    border-top-color: #2f6df6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .spinner-small {
    width: 1.5rem;
    height: 1.5rem;
    border-width: 2px;
  }

  .spinner-medium {
    width: 3rem;
    height: 3rem;
    border-width: 3px;
  }

  .spinner-large {
    width: 4rem;
    height: 4rem;
    border-width: 4px;
  }

  .loading-text {
    color: #9fb0e6;
    font-size: 0.875rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>

