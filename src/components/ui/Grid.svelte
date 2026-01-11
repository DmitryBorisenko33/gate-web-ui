<script>
  export let columns = 1; // number of columns
  export let gap = 'medium'; // small, medium, large
</script>

<div
  class="grid"
  style="grid-template-columns: repeat({columns}, 1fr);"
  class:gap-small={gap === 'small'}
  class:gap-medium={gap === 'medium'}
  class:gap-large={gap === 'large'}
>
  <slot />
</div>

<style>
  .grid {
    display: grid;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .gap-small {
    gap: 0.5rem;
  }

  .gap-medium {
    gap: 1rem;
  }

  .gap-large {
    gap: 1.5rem;
  }

  /* Responsive columns */
  @media (max-width: 767px) {
    .grid {
      grid-template-columns: 1fr !important;
    }
  }
</style>

