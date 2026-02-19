// admin/components/sidebar.js
(function() {
  var currentPath = window.location.pathname;
  var navItems = [
    { href: '/admin/', icon: '\u25C6', label: 'Command Center', page: 'dashboard' },
    { href: '/admin/leads/', icon: '\u25CE', label: 'Leads', page: 'leads' },
    { href: '/admin/deals/', icon: '\u2B21', label: 'Deals', page: 'deals' },
    { href: '/admin/workspace/', icon: '\u25A6', label: 'Workspace', page: 'workspace' },
    { href: '/admin/source-drive/', icon: '\u25C8', label: 'Source Drive', page: 'drive' },
    { href: '/admin/email/', icon: '\u25B7', label: 'Email', page: 'email' },
    { href: '/admin/meetings/', icon: '\u25D1', label: 'Meetings', page: 'meetings' },
    { href: '/admin/team/', icon: '\u25C9', label: 'Team', page: 'team' },
    { href: '/admin/settings/', icon: '\u2699', label: 'Settings', page: 'settings', minRole: 50 },
  ];

  var sidebar = document.getElementById('skr-sidebar');
  if (!sidebar) return;

  var userLevel = (window.SKR_USER && window.SKR_USER.permissionLevel) || 0;

  var html = navItems.map(function(item) {
    if (item.minRole && userLevel < item.minRole) return '';
    var isActive = (currentPath === item.href) ||
      (item.href !== '/admin/' && currentPath.startsWith(item.href));
    return '<a href="' + item.href + '" class="sidebar-item' + (isActive ? ' active' : '') + '">'
      + '<span class="sidebar-icon">' + item.icon + '</span>'
      + '<span class="sidebar-label">' + item.label + '</span>'
      + '</a>';
  }).join('');

  var userBlock = '';
  if (window.SKR_USER) {
    userBlock = '<div class="sidebar-user">'
      + '<div class="sidebar-user-name">' + (window.SKR_USER.displayName || '') + '</div>'
      + '<div class="sidebar-user-role">' + (window.SKR_USER.role || '').toUpperCase() + '</div>'
      + '</div>';
  }

  sidebar.innerHTML = '<div class="sidebar-nav">' + html + '</div>' + userBlock;
})();
