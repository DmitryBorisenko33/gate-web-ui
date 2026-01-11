<script>
  export let hover = false;
  export let padding = 'medium'; // small, medium, large
</script>

<div
  class="card"
  class:card-hover={hover}
  class:card-padding-small={padding === 'small'}
  class:card-padding-medium={padding === 'medium'}
  class:card-padding-large={padding === 'large'}
>
  <slot />
</div>

<style>
  .card {
    background: #111a2f;
    border: 1px solid #1f2b4b;
    border-radius: 8px;
    transition: border-color 0.2s;
  }

  .card-hover:hover {
    border-color: #2f6df6;
  }

  .card-padding-small {
    padding: 0.75rem;
  }

  .card-padding-medium {
    padding: 1rem;
  }

  .card-padding-large {
    padding: 1.5rem;
  }
</style>

