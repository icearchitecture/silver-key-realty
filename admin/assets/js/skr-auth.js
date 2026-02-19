(function () {
  var skrAuth = {
  lookupTeamMember: async function(sb, user) {
    var { data: member } = await sb
      .from('skr_team_members')
      .select('id, tenant_id, first_name, last_name, email, role_id, title, is_active, skr_roles!inner(role_name, permission_level)')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!member) {
      var { data: memberByEmail } = await sb
        .from('skr_team_members')
        .select('id, tenant_id, first_name, last_name, email, role_id, title, is_active, skr_roles!inner(role_name, permission_level)')
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      if (memberByEmail) {
        member = memberByEmail;
        await sb.from('skr_team_members')
          .update({ auth_user_id: user.id })
          .eq('id', memberByEmail.id);
      }
    }

    return member;
  },

  formatMember: function(member) {
    return {
      id: member.id,
      tenant_id: member.tenant_id,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      role_name: member.skr_roles ? member.skr_roles.role_name : (member.role_name || 'agent'),
      permission_level: member.skr_roles ? member.skr_roles.permission_level : (member.permission_level || 40),
      title: member.title,
    };
  },

  displayName: function(member) {
    return ((member.first_name || '') + ' ' + (member.last_name || '')).trim() || member.email || '';
  },

  guard: async function(callback) {
    var url = window.SKR_CONFIG ? window.SKR_CONFIG.SUPABASE_URL : null;
    var key = window.SKR_CONFIG ? window.SKR_CONFIG.SUPABASE_ANON_KEY : null;

    if (!url || !key || url.indexOf('%%') > -1) {
      window.location.href = '/admin/';
      return;
    }

    var sb = window.supabase.createClient(url, key);
    window.sb = sb;

    var { data } = await sb.auth.getSession();
    if (!data.session) {
      window.location.href = '/admin/';
      return;
    }

    var cached = sessionStorage.getItem('skr_member');
    if (cached) {
      try {
        var member = JSON.parse(cached);
        if (callback) callback(member, sb);
        return;
      } catch(e) {
        sessionStorage.removeItem('skr_member');
      }
    }

    var member = await skrAuth.lookupTeamMember(sb, data.session.user);
    if (!member) {
      await sb.auth.signOut();
      sessionStorage.removeItem('skr_member');
      window.location.href = '/admin/';
      return;
    }

    sessionStorage.setItem('skr_member', JSON.stringify(skrAuth.formatMember(member)));
    if (callback) callback(skrAuth.formatMember(member), sb);
  }
  };

  if (window.SKR_AUTH) {
    window.SKR_AUTH.guard = skrAuth.guard;
    window.SKR_AUTH.lookupTeamMember = skrAuth.lookupTeamMember;
    window.SKR_AUTH.formatMember = skrAuth.formatMember;
    window.SKR_AUTH.displayName = skrAuth.displayName;
  } else {
    window.SKR_AUTH = skrAuth;
  }
})();
