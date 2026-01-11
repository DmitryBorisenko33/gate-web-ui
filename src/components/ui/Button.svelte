<script>
  export let variant = 'primary'; // primary, secondary, danger
  export let size = 'medium'; // small, medium, large
  export let disabled = false;
  export let fullWidth = false;
  export let type = 'button';
</script>

<button
  class="btn"
  class:btn-primary={variant === 'primary'}
  class:btn-secondary={variant === 'secondary'}
  class:btn-danger={variant === 'danger'}
  class:btn-small={size === 'small'}
  class:btn-medium={size === 'medium'}
  class:btn-large={size === 'large'}
  class:btn-full={fullWidth}
  {disabled}
  {type}
  on:click
>
  <slot />
</button>

<style>
  .btn {
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn:active:not(:disabled) {
    transform: scale(0.98);
  }

  /* Sizes */
  .btn-small {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }

  .btn-medium {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .btn-large {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  .btn-full {
    width: 100%;
  }

  /* Variants */
  .btn-primary {
    background: #2f6df6;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1e4fc4;
  }

  .btn-secondary {
    background: #111a2f;
    color: #c6d1f0;
    border: 1px solid #1f2b4b;
  }

  .btn-secondary:hover:not(:disabled) {
    border-color: #2f6df6;
  }

  .btn-danger {
    background: #dc2626;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #b91c1c;
  }
</style>

