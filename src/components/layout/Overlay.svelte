<script>
  export let onClick = () => {};
</script>

<div
  class="overlay"
  role="button"
  tabindex="0"
  on:click={onClick}
  on:keydown={(e) => e.key === 'Enter' && onClick()}
  aria-label="Close menu"
></div>

<style>
  .overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 40;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (max-width: 767px) {
    .overlay {
      display: block;
    }
  }
</style>

