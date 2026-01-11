<script>
  export let open = false;
  export let currentPath = '';
  export let onClose = () => {};
  export let onNavigate = () => {};
</script>

{#if open}
  <div class="mobile-menu" role="menu" aria-label="Navigation menu">
    <div class="mobile-menu-content">
      <button
        class="mobile-menu-item"
        class:selected={currentPath === '/' || currentPath === '/dashboard'}
        on:click={() => {
          onNavigate('/dashboard');
          onClose();
        }}
        role="menuitem"
      >
        Дашборд
      </button>
      <button
        class="mobile-menu-item"
        class:selected={currentPath === '/settings'}
        on:click={() => {
          onNavigate('/settings');
          onClose();
        }}
        role="menuitem"
      >
        Настройки
      </button>
    </div>
  </div>
{/if}

<style>
  .mobile-menu {
    position: fixed;
    top: 60px; /* Height of mobile header */
    left: 0;
    right: 0;
    background: #0d1526;
    border-bottom: 1px solid #1f2b4b;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    z-index: 99;
    animation: slideDown 0.2s ease;
    max-height: calc(100vh - 60px);
    overflow-y: auto;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .mobile-menu-content {
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 4px;
  }

  .mobile-menu-item {
    width: 100%;
    text-align: left;
    padding: 12px 16px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #c6d1f0;
    cursor: pointer;
    font-size: 16px;
    font-family: inherit;
    transition: background 0.2s;
  }

  .mobile-menu-item:hover {
    background: rgba(47, 109, 246, 0.1);
  }

  .mobile-menu-item.selected {
    background: #2f6df6;
    color: #fff;
  }

  .mobile-menu-item:active {
    transform: scale(0.98);
  }
</style>

