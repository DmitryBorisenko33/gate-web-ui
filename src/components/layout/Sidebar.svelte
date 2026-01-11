<script>
  export let open = false; // For mobile
  export let collapsed = false; // For desktop
  export let onToggle = () => {};
</script>

<aside 
  class="sidebar" 
  class:mobile-open={open}
  class:collapsed={collapsed && !open}
>
  <div class="sidebar-header">
    <button
      class="menu__btn"
      on:click={onToggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Развернуть' : 'Свернуть'}
    >
      <span></span>
    </button>
  </div>
  <nav class="sidebar-nav">
    <slot />
  </nav>
</aside>

<style>
  .sidebar {
    width: 220px;
    background: #0d1526;
    border-right: 1px solid #1f2b4b;
    padding: 12px;
    box-sizing: border-box;
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 50;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                padding 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform, width, padding;
    max-width: 100vw;
  }

  .sidebar.collapsed {
    width: 64px;
    padding: 12px 8px;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin-bottom: 12px;
    padding-top: 4px;
    position: relative;
    width: 100%;
  }

  .sidebar.collapsed .sidebar-header {
    justify-content: center;
  }

  .menu__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 32px;
    height: 32px;
    cursor: pointer;
    background: transparent;
    border: 1px solid #1f2b4b;
    border-radius: 6px;
    padding: 0;
    transition: border-color 0.2s, background 0.2s;
  }

  .menu__btn:hover {
    border-color: #2f6df6;
    background: rgba(47, 109, 246, 0.1);
  }

  .menu__btn > span,
  .menu__btn > span::before,
  .menu__btn > span::after {
    display: block;
    position: absolute;
    width: 18px;
    height: 2px;
    background-color: #c6d1f0;
    transition-duration: 0.25s;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  .menu__btn > span::before {
    content: "";
    top: -6px;
  }

  .menu__btn > span::after {
    content: "";
    top: 6px;
  }

  .sidebar.collapsed .menu__btn > span {
    transform: rotate(45deg);
  }

  .sidebar.collapsed .menu__btn > span::before {
    top: 0;
    transform: rotate(0);
  }

  .sidebar.collapsed .menu__btn > span::after {
    top: 0;
    transform: rotate(90deg);
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* Mobile styles */
  @media (max-width: 767px) {
    .sidebar {
      transform: translateX(-100%);
      width: 280px;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
    }

    .sidebar.mobile-open {
      transform: translateX(0);
    }

    .sidebar.collapsed {
      width: 280px;
      padding: 12px;
    }

    .menu__btn {
      display: none;
    }
  }

  /* Tablet styles */
  @media (min-width: 768px) and (max-width: 1023px) {
    .sidebar {
      width: 200px;
    }

    .sidebar.collapsed {
      width: 64px;
    }
  }
</style>
