/**
 * SKR Auth Router — Role-Based Access Control
 *
 * Call SKR_ROUTER.init({ minRole: 'agent' }) on any admin page.
 * It checks the user's role and either allows access or redirects.
 *
 * Permission levels:
 *   admin=60, broker=50, agent=40, assistant=30, client=20, applicant=15, lead=10, public=0
 */
window.SKR_ROUTER = (function () {
  var ROLE_LEVELS = {
    admin: 60, broker: 50, agent: 40, assistant: 30,
    client: 20, applicant: 15, lead: 10, public: 0
  };

  async function init(options) {
    options = options || {};
    var minRole = options.minRole || 'viewer';
    var minLevel = ROLE_LEVELS[minRole] || 5;
    var allowClient = options.allowClient || false;

    // Get Supabase client
    var sb = window.SKR_AUTH
      ? window.SKR_AUTH._supabase
      : (window.sb || null);

    if (!sb) {
      // Try to build from config
      if (window.SKR_CONFIG) {
        sb = supabase.createClient(SKR_CONFIG.SUPABASE_URL, SKR_CONFIG.SUPABASE_ANON_KEY);
      } else {
        window.location.href = '/admin/';
        return null;
      }
    }

    // Check session
    var sessionResult = await sb.auth.getSession();
    var session = sessionResult.data.session;

    if (!session) {
      window.location.href = '/admin/';
      return null;
    }

    var user = session.user;

    // Check team member table
    var memberResult = await sb
      .from('skr_team_members')
      .select('id, role_id, display_name, first_name, last_name, email, is_active')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    var member = memberResult.data;

    if (member) {
      // Get role details
      var roleResult = await sb
        .from('skr_roles')
        .select('role_name, permission_level')
        .eq('id', member.role_id)
        .single();

      var role = roleResult.data;

      if (!role || role.permission_level < minLevel) {
        // Team member but insufficient role
        if (role && role.permission_level > 0) {
          return {
            authorized: false,
            reason: 'insufficient_role',
            user: member,
            role: role
          };
        }
        await sb.auth.signOut();
        window.location.href = '/admin/?error=unauthorized';
        return null;
      }

      // Authorized team member
      var userInfo = {
        authorized: true,
        isTeam: true,
        isClient: false,
        id: member.id,
        authId: user.id,
        email: member.email,
        displayName: member.display_name || (member.first_name + ' ' + (member.last_name || '')).trim(),
        firstName: member.first_name,
        role: role.role_name,
        roleName: role.role_name,
        permissionLevel: role.permission_level
      };

      window.SKR_USER = userInfo;
      return userInfo;
    }

    // Not a team member — check if client page allows them
    if (allowClient) {
      var leadResult = await sb
        .from('skr_leads')
        .select('id, first_name, last_name, email, lead_type, status')
        .eq('email', user.email.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      var lead = leadResult.data;

      var clientInfo = {
        authorized: true,
        isTeam: false,
        isClient: true,
        id: lead ? lead.id : null,
        authId: user.id,
        email: user.email,
        displayName: lead ? (lead.first_name + ' ' + (lead.last_name || '')).trim() : user.email.split('@')[0],
        firstName: lead ? lead.first_name : '',
        role: 'client',
        roleName: 'Client',
        permissionLevel: 20,
        leadType: lead ? lead.lead_type : null,
        leadStatus: lead ? lead.status : 'new'
      };

      window.SKR_USER = clientInfo;
      return clientInfo;
    }

    // Not authorized for this page — redirect to client portal
    window.location.href = '/admin/portal/';
    return null;
  }

  return { init: init, ROLE_LEVELS: ROLE_LEVELS };
})();
