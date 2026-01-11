<script>
  export let size = 'large'; // small, medium, large
</script>

<h1
  class="page-title"
  class:title-small={size === 'small'}
  class:title-medium={size === 'medium'}
  class:title-large={size === 'large'}
>
  <slot />
</h1>

<style>
  .page-title {
    font-weight: 700;
    margin-bottom: 1rem;
    color: #c6d1f0;
    word-break: break-word;
  }

  .title-small {
    font-size: 1.125rem;
  }

  .title-medium {
    font-size: 1.25rem;
  }

  .title-large {
    font-size: 1.5rem;
  }
</style>

