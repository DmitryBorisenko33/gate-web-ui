<script>
  import * as LucideIcons from 'lucide-svelte';
  
  export let path = '';
  export let currentPath = '';
  export let onClick = () => {};
  export let collapsed = false;
  export let icon = null; // Icon component from lucide-svelte
  
  // Get text content for tooltip
  let buttonElement;
  $: tooltipText = collapsed && buttonElement ? buttonElement.textContent.trim() : '';
</script>

<button
  bind:this={buttonElement}
  class="nav-item"
  class:selected={currentPath === path || (path === '/dashboard' && (currentPath === '/' || currentPath === '/dashboard'))}
  class:collapsed={collapsed}
  on:click={onClick}
  title={collapsed ? tooltipText : ''}
>
  {#if icon}
    <span class="nav-icon">
      <svelte:component this={icon} size={20} color="currentColor" />
    </span>
  {/if}
  {#if !collapsed}
    <span class="nav-text">
      <slot />
    </span>
  {/if}
</button>

<style>
  .nav-item {
    display: flex;
    align-items: center;
    width: 100%;
    text-align: left;
    padding: 12px 24px;
    color: rgba(198, 209, 240, 0.788);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition-duration: 0.25s;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
    border: none;
    background: transparent;
    gap: 12px;
  }

  .nav-item.collapsed {
    text-align: center;
    padding: 12px 24px;
    justify-content: center;
  }

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .nav-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-item:hover {
    background-color: rgba(47, 109, 246, 0.15);
  }

  .nav-item.selected {
    background-color: rgba(47, 109, 246, 0.25);
    color: #c6d1f0;
  }
</style>

