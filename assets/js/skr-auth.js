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
    // Session timeout — force re-login after 8 hours
    var SESSION_MAX_AGE = 8 * 60 * 60 * 1000;
    var sessionStart = sessionStorage.getItem('skr_session_start');

    if (sessionStart && (Date.now() - parseInt(sessionStart, 10)) > SESSION_MAX_AGE) {
      await sb.auth.signOut();
      sessionStorage.clear();
      window.location.href = '/admin/?error=session_expired';
      return;
    }
    if (!sessionStart) {
      sessionStorage.setItem('skr_session_start', Date.now().toString());
    }

    var sessionResult = await sb.auth.getSession();
    if (!sessionResult.data.session) {
      window.location.href = '/admin/';
      return;
    }

    var session = sessionResult.data.session;
    // Confirm token validity with getUser()
    var userResult = await sb.auth.getUser();
    var user = userResult && userResult.data ? userResult.data.user : null;
    if (!user) {
      await sb.auth.signOut();
      sessionStorage.clear();
      window.location.href = '/admin/?error=no_user';
      return;
    }

    // SECURITY GATE — Verify team membership on every page load
    var member = null;
    var cached = sessionStorage.getItem('skr_member');
    var cacheTime = sessionStorage.getItem('skr_member_ts');
    var cacheValid = cached && cacheTime && (Date.now() - parseInt(cacheTime, 10)) < 600000;

    if (cacheValid) {
      try { member = normalizeCachedMember(JSON.parse(cached)); } catch (e) { member = null; }
      if (!member) {
        sessionStorage.removeItem('skr_member');
        sessionStorage.removeItem('skr_member_ts');
      }
    }

    if (!member) {
      var dbMember = await lookupTeamMember(sb, user);
      if (!dbMember) {
        await sb.auth.signOut();
        sessionStorage.removeItem('skr_member');
        sessionStorage.removeItem('skr_member_ts');
        window.location.href = '/admin/access-denied/';
        return;
      }
      if (dbMember.is_active === false) {
        await sb.auth.signOut();
        sessionStorage.removeItem('skr_member');
        sessionStorage.removeItem('skr_member_ts');
        window.location.href = '/admin/access-denied/?reason=deactivated';
        return;
      }

      var formatted = formatMember(dbMember);
      member = normalizeCachedMember(formatted);
      sessionStorage.setItem('skr_member', JSON.stringify(member.raw));
      sessionStorage.setItem('skr_member_ts', Date.now().toString());
    }

    window.SKR_USER = {
      id: member.id,
      tenantId: member.tenantId,
      role: member.role || 'agent',
      permissionLevel: member.permissionLevel || 40,
      displayName: member.displayName || member.email || '',
      member: member.raw,
      session: session,
    };

    renderSidebar();

    if (window.SKR_AUTH) window.SKR_AUTH.supabase = sb;

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
      .single();

    if (result.data) return result.data;

    if (user.email) {
      var emailResult = await client
        .from('skr_team_members')
        .select(cols)
        .eq('email', user.email)
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

  function normalizeCachedMember(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // Accept either the "raw" format used by older skr-auth.js (tenant_id, role_name)
    // or the cache format used by the new callback page (tenantId, role, permissionLevel).
    var raw = obj;
    var id = raw.id;
    var tenantId = raw.tenantId || raw.tenant_id;
    var email = raw.email;
    var firstName = raw.firstName || raw.first_name;
    var lastName = raw.lastName || raw.last_name;
    var role = raw.role || raw.role_name || (raw.skr_roles && raw.skr_roles.role_name);
    var permissionLevel = raw.permissionLevel || raw.permission_level || (raw.skr_roles && raw.skr_roles.permission_level);

    if (!id || !tenantId) return null;

    var displayName = ((firstName || '') + ' ' + (lastName || '')).trim() || email || '';

    return {
      id: id,
      tenantId: tenantId,
      email: email,
      displayName: displayName,
      role: role || 'agent',
      permissionLevel: permissionLevel || 40,
      raw: raw,
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
