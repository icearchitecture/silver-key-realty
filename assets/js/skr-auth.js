// assets/js/skr-auth.js — Centralized admin auth, sidebar, and API helper
// Expects: admin-config.js loaded first (sets window.SKR_CONFIG)
// Expects: Supabase UMD loaded first
// Expects: HTML has #skr-loader and #skr-main elements
// Fires: 'skr-ready' custom event on window when auth is complete
(function () {
  var cfg = window.SKR_CONFIG;
  if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#111;color:#e74c3c;font-family:sans-serif;font-size:14px">Configuration error. Contact your administrator.</div>';
    return;
  }

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  window.SKR_SUPA = sb;

  (async function () {
    var sessionResult = await sb.auth.getSession();
    if (!sessionResult.data.session) {
      window.location.href = '/admin/';
      return;
    }

    var session = sessionResult.data.session;
    var user = session.user;

    var cached = sessionStorage.getItem('skr_member');
    var member = null;
    if (cached) {
      try { member = JSON.parse(cached); } catch (e) { sessionStorage.removeItem('skr_member'); }
    }

    if (!member) {
      member = await lookupTeamMember(sb, user);
      if (!member) {
        await sb.auth.signOut();
        sessionStorage.removeItem('skr_member');
        window.location.href = '/admin/?error=not_authorized';
        return;
      }
      member = formatMember(member);
      sessionStorage.setItem('skr_member', JSON.stringify(member));
    }

    window.SKR_USER = {
      id: member.id,
      tenantId: member.tenant_id,
      role: member.role_name || 'agent',
      permissionLevel: member.permission_level || 40,
      displayName: ((member.first_name || '') + ' ' + (member.last_name || '')).trim() || member.email || '',
      member: member,
      session: session,
    };

    renderSidebar();

    var loader = document.getElementById('skr-loader');
    var main = document.getElementById('skr-main');
    if (loader) loader.style.display = 'none';
    if (main) main.style.display = '';

    window.dispatchEvent(new CustomEvent('skr-ready'));
  })();

  async function lookupTeamMember(client, user) {
    var cols = 'id, tenant_id, first_name, last_name, email, role_id, title, is_active, skr_roles!inner(role_name, permission_level)';

    var result = await client
      .from('skr_team_members')
      .select(cols)
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single();

    if (result.data) return result.data;

    if (user.email) {
      var emailResult = await client
        .from('skr_team_members')
        .select(cols)
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      if (emailResult.data) {
        await client.from('skr_team_members')
          .update({ auth_user_id: user.id })
          .eq('id', emailResult.data.id);
        return emailResult.data;
      }
    }

    return null;
  }

  function formatMember(m) {
    return {
      id: m.id,
      tenant_id: m.tenant_id,
      first_name: m.first_name,
      last_name: m.last_name,
      email: m.email,
      role_name: m.skr_roles ? m.skr_roles.role_name : (m.role_name || 'agent'),
      permission_level: m.skr_roles ? m.skr_roles.permission_level : (m.permission_level || 40),
      title: m.title,
    };
  }

  function renderSidebar() {
    var sidebar = document.getElementById('skr-sidebar');
    if (!sidebar) return;

    var currentPath = window.location.pathname;
    var userLevel = (window.SKR_USER && window.SKR_USER.permissionLevel) || 0;

    var navItems = [
      { href: '/admin/dashboard/', icon: '\u25C6', label: 'Command Center' },
      { href: '/admin/leads/', icon: '\u25CE', label: 'Leads' },
      { href: '/admin/deals/', icon: '\u2B21', label: 'Deals' },
      { href: '/admin/properties/', icon: '\u2302', label: 'Properties' },
      { href: '/admin/workspace/', icon: '\u25A6', label: 'Workspace' },
      { href: '/admin/source-drive/', icon: '\u25C8', label: 'Source Drive' },
      { href: '/admin/email/', icon: '\u25B7', label: 'Email' },
      { href: '/admin/meetings/', icon: '\u25D1', label: 'Meetings' },
      { href: '/admin/documents/', icon: '\u25A4', label: 'Documents' },
      { href: '/admin/team/', icon: '\u25C9', label: 'Team' },
      { href: '/admin/settings/', icon: '\u2699', label: 'Settings', minRole: 50 },
    ];

    var html = navItems.map(function (item) {
      if (item.minRole && userLevel < item.minRole) return '';
      var isActive = currentPath === item.href || (item.href !== '/admin/dashboard/' && currentPath.startsWith(item.href));
      return '<a href="' + item.href + '" class="sidebar-item' + (isActive ? ' active' : '') + '">'
        + '<span class="sidebar-icon">' + item.icon + '</span>'
        + '<span class="sidebar-label">' + item.label + '</span>'
        + '</a>';
    }).join('');

    var signOutBtn = '<button class="sidebar-signout" onclick="(async function(){sessionStorage.removeItem(\'skr_member\');await SKR_SUPA.auth.signOut();window.location.href=\'/admin/\'})()">Sign Out</button>';

    var userBlock = '';
    if (window.SKR_USER) {
      userBlock = '<div class="sidebar-user">'
        + '<div class="sidebar-user-name">' + (window.SKR_USER.displayName || '') + '</div>'
        + '<div class="sidebar-user-role">' + (window.SKR_USER.role || '').toUpperCase() + '</div>'
        + signOutBtn
        + '</div>';
    }

    sidebar.innerHTML = '<div class="sidebar-brand"><a href="/admin/dashboard/" style="text-decoration:none;color:inherit"><span style="font-family:\'Cormorant Garamond\',serif;font-size:16px;font-weight:300;color:#F0EBE3">Silver <em style="color:#C9B99A">Key</em></span></a></div>'
      + '<div class="sidebar-nav">' + html + '</div>' + userBlock;
  }

  window.skrAPI = async function (url, opts) {
    opts = opts || {};
    var session = window.SKR_USER && window.SKR_USER.session;
    var token = session ? session.access_token : null;

    var fetchOpts = {
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) fetchOpts.headers['Authorization'] = 'Bearer ' + token;
    if (opts.body) fetchOpts.body = JSON.stringify(opts.body);

    var response = await fetch(url, fetchOpts);
    if (!response.ok) {
      var errBody = {};
      try { errBody = await response.json(); } catch (e) {}
      throw new Error(errBody.error || 'Request failed: ' + response.status);
    }
    return response.json();
  };
})();
