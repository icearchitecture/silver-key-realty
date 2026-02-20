// admin/assets/js/skr-auth.js — Auth guard for shell pattern
// Expects: admin-config.js loaded first (sets window.SKR_CONFIG)
// Expects: Supabase UMD loaded first
// Usage: SKR_AUTH.guard(function(member, sb) { ... })

window.SKR_AUTH = {
  guard: async function(callback) {
    var cfg = window.SKR_CONFIG;
    if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
      SKR_SHELL.showError();
      return;
    }

    var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    window.SKR_SUPA = sb;
    window.sb = sb;

    try {
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
      var userResult = await sb.auth.getUser();
      var user = userResult && userResult.data ? userResult.data.user : null;

      if (!user) {
        await sb.auth.signOut();
        sessionStorage.clear();
        window.location.href = '/admin/?error=no_user';
        return;
      }

      var member = null;
      var cached = sessionStorage.getItem('skr_member');
      var cacheTime = sessionStorage.getItem('skr_member_ts');
      var cacheValid = cached && cacheTime && (Date.now() - parseInt(cacheTime, 10)) < 600000;

      if (cacheValid) {
        try { member = SKR_AUTH._normalize(JSON.parse(cached)); } catch (e) { member = null; }
        if (!member) {
          sessionStorage.removeItem('skr_member');
          sessionStorage.removeItem('skr_member_ts');
        }
      }

      if (!member) {
        var dbMember = await SKR_AUTH._lookup(sb, user);
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

        var formatted = SKR_AUTH._format(dbMember);
        member = SKR_AUTH._normalize(formatted);
        sessionStorage.setItem('skr_member', JSON.stringify(member));
        sessionStorage.setItem('skr_member_ts', Date.now().toString());
      }

      window.SKR_USER = member;

      if (callback && typeof callback === 'function') {
        callback(member, sb);
      }

    } catch (err) {
      console.error('SKR_AUTH error:', err);
      SKR_SHELL.showError();
    }
  },

  _lookup: async function(client, user) {
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
  },

  _format: function(m) {
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
  },

  _normalize: function(obj) {
    if (!obj || typeof obj !== 'object') return null;

    var id = obj.id;
    var tenantId = obj.tenantId || obj.tenant_id;
    var email = obj.email;
    var firstName = obj.firstName || obj.first_name;
    var lastName = obj.lastName || obj.last_name;
    var role = obj.role || obj.role_name || (obj.skr_roles && obj.skr_roles.role_name);
    var permissionLevel = obj.permissionLevel || obj.permission_level || (obj.skr_roles && obj.skr_roles.permission_level);

    if (!id || !tenantId) return null;

    return {
      id: id,
      tenantId: tenantId,
      tenant_id: tenantId,
      email: email,
      first_name: firstName,
      last_name: lastName,
      firstName: firstName,
      lastName: lastName,
      role: role || 'agent',
      permissionLevel: permissionLevel || 40,
      permission_level: permissionLevel || 40,
    };
  }
};

window.skrAPI = async function(url, opts) {
  opts = opts || {};
  var sb = window.SKR_SUPA;
  var session = sb ? (await sb.auth.getSession()).data.session : null;
  var token = session ? session.access_token : null;

  var fetchOpts = {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
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
