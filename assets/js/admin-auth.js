/* ============================================================
   SILVER KEY REALTY — ADMIN AUTH
   ============================================================
   Handles team member verification against skr_team_members.
   Uses auth_user_id (primary) with email fallback.
   Joins skr_roles for role_name and permission_level.
   ============================================================ */

(function () {
  'use strict';

  var SUPABASE_URL = (window.SKR_CONFIG && window.SKR_CONFIG.SUPABASE_URL) || '';
  var SUPABASE_ANON_KEY = (window.SKR_CONFIG && window.SKR_CONFIG.SUPABASE_ANON_KEY) || '';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[SKR Auth] Missing Supabase config.');
    return;
  }

  var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  var MEMBER_SELECT = 'id, tenant_id, first_name, last_name, email, role_id, title, is_active, trust_score, trust_level, skr_roles!inner(role_name, permission_level)';

  async function verifyTeamMember(user) {
    var { data: member, error } = await supabase
      .from('skr_team_members')
      .select(MEMBER_SELECT)
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!member && user.email) {
      var fallback = await supabase
        .from('skr_team_members')
        .select(MEMBER_SELECT)
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      if (fallback.data && !fallback.error) {
        member = fallback.data;
        await supabase.from('skr_team_members')
          .update({ auth_user_id: user.id })
          .eq('id', member.id);
      }
    }

    if (!member) return { authorized: false, reason: 'not_found' };
    if (!member.is_active) return { authorized: false, reason: 'deactivated' };

    var normalized = normalizeMember(member);
    return { authorized: true, member: normalized };
  }

  function normalizeMember(raw) {
    var roleName = raw.skr_roles ? raw.skr_roles.role_name : 'agent';
    var permLevel = raw.skr_roles ? raw.skr_roles.permission_level : 40;
    return {
      id: raw.id,
      tenant_id: raw.tenant_id,
      first_name: raw.first_name || '',
      last_name: raw.last_name || '',
      display_name: ((raw.first_name || '') + ' ' + (raw.last_name || '')).trim() || raw.email,
      email: raw.email,
      role: roleName,
      role_name: roleName,
      permission_level: permLevel,
      role_id: raw.role_id,
      is_active: raw.is_active,
      title: raw.title || '',
    };
  }

  async function fetchTeamMembers() {
    var r = await supabase
      .from('skr_team_members')
      .select(MEMBER_SELECT)
      .order('first_name', { ascending: true });

    if (r.error || !r.data) return [];
    return r.data.map(normalizeMember);
  }

  function handleAuthorized(member) {
    sessionStorage.setItem('skr_member', JSON.stringify(member));
    window.location.href = '/admin/dashboard/';
  }

  var loginForm = document.getElementById('loginForm');
  var magicBtn = document.getElementById('magicLinkBtn');
  var emailInput = document.getElementById('authEmail');
  var passwordInput = document.getElementById('authPassword');
  var submitBtn = document.getElementById('loginSubmit');
  var feedback = document.getElementById('loginFeedback');

  function showFeedback(msg, type) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.className = 'login-feedback ' + (type || '');
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.classList[loading ? 'add' : 'remove']('loading');
    btn.disabled = loading;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      showFeedback('', '');

      var email = emailInput && emailInput.value.trim();
      var pass = passwordInput && passwordInput.value;
      if (!email || !pass) { showFeedback('Email and password are required.', 'error'); return; }

      setLoading(submitBtn, true);

      try {
        var authResult = await supabase.auth.signInWithPassword({ email: email, password: pass });
        if (authResult.error) { showFeedback('Invalid email or password.', 'error'); setLoading(submitBtn, false); return; }

        var result = await verifyTeamMember(authResult.data.user);
        if (!result.authorized) {
          await supabase.auth.signOut();
          var msgs = {
            deactivated: 'Your account has been deactivated. Contact your administrator.',
            not_found: 'This account is not authorized for the Employee Portal.',
          };
          showFeedback(msgs[result.reason] || msgs.not_found, 'error');
          setLoading(submitBtn, false);
          return;
        }

        showFeedback('Welcome back, ' + result.member.display_name + '.', 'success');
        setTimeout(function () { handleAuthorized(result.member); }, 800);

      } catch (err) {
        console.error('[SKR Auth] Login error:', err);
        showFeedback('Something went wrong. Please try again.', 'error');
        setLoading(submitBtn, false);
      }
    });
  }

  if (magicBtn) {
    magicBtn.addEventListener('click', async function () {
      showFeedback('', '');
      var email = emailInput && emailInput.value.trim();
      if (!email) { showFeedback('Enter your email address first.', 'error'); return; }

      setLoading(magicBtn, true);

      try {
        var mlResult = await supabase.auth.signInWithOtp({
          email: email,
          options: { emailRedirectTo: window.location.origin + '/admin/auth/callback/' },
        });

        if (mlResult.error) { showFeedback('Could not send magic link. Try again.', 'error'); setLoading(magicBtn, false); return; }
        showFeedback('Magic link sent. Check your email.', 'success');
        setLoading(magicBtn, false);
      } catch (err) {
        console.error('[SKR Auth] Magic link error:', err);
        showFeedback('Something went wrong. Please try again.', 'error');
        setLoading(magicBtn, false);
      }
    });
  }

  var existing = window.SKR_AUTH || {};
  window.SKR_AUTH = Object.assign(existing, {
    supabase: supabase,
    verifyTeamMember: verifyTeamMember,
    fetchTeamMembers: fetchTeamMembers,
    normalizeMember: normalizeMember,

    async getSession() {
      var s = await supabase.auth.getSession();
      return s.data.session;
    },

    async getCurrentMember() {
      var s = await supabase.auth.getSession();
      if (!s.data.session || !s.data.session.user) return null;
      var result = await verifyTeamMember(s.data.session.user);
      return result.authorized ? result.member : null;
    },

    async signOut() {
      sessionStorage.removeItem('skr_member');
      await supabase.auth.signOut();
      window.location.href = '/admin/';
    },
  });

})();
