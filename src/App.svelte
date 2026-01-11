<script>
  import Router, { push, location } from 'svelte-spa-router';
  import { routes } from './routes.js';
  import { onMount } from 'svelte';
  import { Sidebar, SidebarNavItem } from './components/layout';
  import { MobileHeader } from './components/layout';
  import MobileMenu from './components/layout/MobileMenu.svelte';
  import { LayoutDashboard, Settings } from 'lucide-svelte';

  let mobileMenuOpen = false;
  let isMobile = false;
  let previousPath = '';
  let sidebarCollapsed = false;

  function checkMobile() {
    isMobile = window.innerWidth < 768;
    if (!isMobile) {
      mobileMenuOpen = false;
    }
  }

  function handleEscape(e) {
    if (e.key === 'Escape' && mobileMenuOpen) {
      closeMenu();
    }
  }

  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('keydown', handleEscape);
    previousPath = $location;
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('keydown', handleEscape);
    };
  });

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMenu() {
    mobileMenuOpen = false;
  }

  function navigateTo(path) {
    push(path);
    closeMenu();
  }

  $: currentPath = $location;
  
  // Close menu when route changes
  $: if (currentPath && currentPath !== previousPath && mobileMenuOpen) {
    previousPath = currentPath;
    setTimeout(() => {
      mobileMenuOpen = false;
    }, 150);
  }
</script>

<div class="app-shell">
  <MobileHeader
    menuOpen={mobileMenuOpen}
    onMenuToggle={toggleMobileMenu}
  />

  <!-- Mobile dropdown menu -->
  <MobileMenu
    open={mobileMenuOpen && isMobile}
    {currentPath}
    onClose={closeMenu}
    onNavigate={navigateTo}
  />

  <!-- Desktop sidebar -->
  <Sidebar 
    open={false}
    collapsed={sidebarCollapsed}
    onToggle={() => sidebarCollapsed = !sidebarCollapsed}
  >
    <SidebarNavItem
      path="/dashboard"
      {currentPath}
      collapsed={sidebarCollapsed && !isMobile}
      icon={LayoutDashboard}
      onClick={() => navigateTo('/dashboard')}
    >
        Дашборд
    </SidebarNavItem>
    <SidebarNavItem
      path="/settings"
      {currentPath}
      collapsed={sidebarCollapsed && !isMobile}
      icon={Settings}
      onClick={() => navigateTo('/settings')}
    >
        Настройки
    </SidebarNavItem>
  </Sidebar>

  <!-- Overlay for mobile menu -->
  {#if mobileMenuOpen && isMobile}
    <div
      class="mobile-overlay"
      role="button"
      tabindex="0"
      on:click={closeMenu}
      on:keydown={(e) => e.key === 'Enter' && closeMenu()}
      aria-label="Close menu"
    ></div>
  {/if}

  <main class="content" class:sidebar-collapsed={sidebarCollapsed && !isMobile}>
    <Router {routes}>
      <div class="loading">Loading...</div>
    </Router>
  </main>
</div>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    width: 100%;
    max-width: 100vw;
  }

  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: #0b1220;
    color: #c6d1f0;
    font-family: system-ui, -apple-system, sans-serif;
    position: relative;
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
  }

  .content {
    flex: 1;
    padding: 16px;
    box-sizing: border-box;
    width: calc(100% - 220px);
    margin-left: 220px;
    transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    max-width: 100%;
    overflow-x: hidden;
  }

  .content.sidebar-collapsed {
    margin-left: 64px;
    width: calc(100% - 64px);
  }

  .mobile-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 98;
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

  :global(.loading) {
    text-align: center;
    padding: 40px;
    color: #9fb0e6;
  }

  /* Mobile styles */
  @media (max-width: 767px) {
    .content {
      margin-left: 0;
      width: 100%;
      padding: 12px;
      max-width: 100vw;
    }

    .mobile-overlay {
      display: block;
    }
  }

  /* Tablet styles */
  @media (min-width: 768px) and (max-width: 1023px) {
    .content {
      margin-left: 200px;
      width: calc(100% - 200px);
    }

    .content.sidebar-collapsed {
      margin-left: 64px;
      width: calc(100% - 64px);
    }
  }
</style>
