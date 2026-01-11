<script>
  export let menuOpen = false;
  export let onMenuToggle = () => {};
</script>

<header class="mobile-header">
  <div class="mobile-header-content">
    <button
      class="mobile-menu-button"
      on:click={onMenuToggle}
      aria-label="Toggle menu"
      aria-expanded={menuOpen}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        {#if menuOpen}
          <path d="M18 6L6 18M6 6l12 12" />
        {:else}
          <path d="M3 12h18M3 6h18M3 18h18" />
        {/if}
      </svg>
    </button>
  </div>
</header>

<style>
  .mobile-header {
    display: none;
    background: #0d1526;
    border-bottom: 1px solid #1f2b4b;
    padding: 12px 16px;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .mobile-header-content {
    display: flex;
    justify-content: flex-start;
    align-items: center;
  }

  .mobile-menu-button {
    background: transparent;
    border: 1px solid #1f2b4b;
    border-radius: 6px;
    color: #c6d1f0;
    padding: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    min-width: 40px;
    min-height: 40px;
  }

  .mobile-menu-button:hover {
    border-color: #2f6df6;
    background: rgba(47, 109, 246, 0.1);
  }

  .mobile-menu-button:active {
    transform: scale(0.95);
  }

  .mobile-menu-button svg {
    transition: transform 0.2s;
  }

  @media (max-width: 767px) {
    .mobile-header {
      display: block;
    }
  }
</style>

