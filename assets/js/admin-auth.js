/* ============================================================
   SILVER KEY REALTY — ADMIN AUTH (Universal Schema)
   ============================================================
   Detects and handles two database structures:
   
   FULL SCHEMA (existing brokerage):
     first_name, last_name, role_id (UUID), photo_url
   
   SIMPLE SCHEMA (new installs):
     display_name, role (text), avatar_url
   
   The auth normalizes both into a standard member object:
     { id, display_name, email, role, is_active, avatar_url }
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

  // ── SCHEMA DETECTION ──
  var _detectedSchema = null;

  var FULL_COLS = 'id, first_name, last_name, email, role_id, is_active, photo_url, title';
  var SIMPLE_COLS = 'id, display_name, email, role, is_active, avatar_url';

  async function detectSchema() {
    if (_detectedSchema) return _detectedSchema;

    // Try full schema first (first_name + last_name + role_id)
    var r1 = await supabase.from('skr_team_members').select(FULL_COLS).limit(1);
    if (!r1.error) {
      _detectedSchema = 'full';
      console.log('[SKR Auth] Detected full brokerage schema');
      return 'full';
    }

    // Try simple schema (display_name + role text)
    var r2 = await supabase.from('skr_team_members').select(SIMPLE_COLS).limit(1);
    if (!r2.error) {
      _detectedSchema = 'simple';
      console.log('[SKR Auth] Detected simple schema');
      return 'simple';
    }

    console.error('[SKR Auth] Could not detect schema. Table may not exist.');
    return null;
  }

  // ── ROLE RESOLVER ──
  var _roleCache = {};

  async function resolveRole(roleId) {
    if (!roleId) return 'agent';
    if (_roleCache[roleId]) return _roleCache[roleId];

    // Try common role table names
    var tables = ['skr_roles', 'skr_team_roles', 'roles'];
    for (var i = 0; i < tables.length; i++) {
      var r = await supabase
        .from(tables[i])
        .select('id, name, slug, role_name')
        .eq('id', roleId)
        .single();

      if (r.data && !r.error) {
        var name = r.data.slug || r.data.name || r.data.role_name || 'agent';
        _roleCache[roleId] = name.toLowerCase();
        return _roleCache[roleId];
      }
    }

    _roleCache[roleId] = 'team_member';
    return 'team_member';
  }

  // ── NORMALIZE MEMBER ──
  async function normalizeMember(raw, schema) {
    if (schema === 'full') {
      var roleName = await resolveRole(raw.role_id);
      return {
        id: raw.id,
        display_name: ((raw.first_name || '') + ' ' + (raw.last_name || '')).trim() || raw.email,
        first_name: raw.first_name || '',
        last_name: raw.last_name || '',
        email: raw.email,
        role: roleName,
        role_id: raw.role_id,
        is_active: raw.is_active,
        avatar_url: raw.photo_url || null,
        title: raw.title || '',
        _schema: 'full',
      };
    } else {
      return {
        id: raw.id,
        display_name: raw.display_name || raw.email,
        first_name: '',
        last_name: '',
        email: raw.email,
        role: raw.role || 'agent',
        role_id: null,
        is_active: raw.is_active,
        avatar_url: raw.avatar_url || null,
        title: '',
        _schema: 'simple',
      };
    }
  }

  // ── VERIFY TEAM MEMBER ──
  async function verifyTeamMember(user) {
    var schema = await detectSchema();
    if (!schema) return { authorized: false, reason: 'no_table' };

    var cols = schema === 'full' ? FULL_COLS : SIMPLE_COLS;
    var r = await supabase
      .from('skr_team_members')
      .select(cols)
      .eq('email', user.email)
      .single();

    if (r.error || !r.data) return { authorized: false, reason: 'not_found' };
    if (!r.data.is_active) return { authorized: false, reason: 'deactivated' };

    var member = await normalizeMember(r.data, schema);
    return { authorized: true, member: member };
  }

  // ── FETCH ALL TEAM MEMBERS (for dashboard) ──
  async function fetchTeamMembers() {
    var schema = await detectSchema();
    if (!schema) return [];

    var cols = schema === 'full' ? FULL_COLS : SIMPLE_COLS;
    var orderCol = schema === 'full' ? 'last_name' : 'role';

    var r = await supabase
      .from('skr_team_members')
      .select(cols)
      .order(orderCol, { ascending: true });

    if (r.error || !r.data) return [];

    var members = [];
    for (var i = 0; i < r.data.length; i++) {
      members.push(await normalizeMember(r.data[i], schema));
    }
    return members;
  }

  // ── POST-AUTH REDIRECT ──
  function handleAuthorized(member) {
    sessionStorage.setItem('skr_member', JSON.stringify(member));
    window.location.href = '/admin/dashboard/';
  }

  // ── LOGIN FORM ──
  var loginForm = document.getElementById('loginForm');
  var magicBtn = document.getElementById('magicLinkBtn');
  var emailInput = document.getElementById('authEmail');
  var passwordInput = document.getElementById('authPassword');
  var submitBtn = document.getElementById('loginSubmit');
  var feedback = document.getElementById('loginFeedback');

  function showFeedback(msg, type) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.className = 'login-feedback ' + type;
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.classList[loading ? 'add' : 'remove']('loading');
    btn.disabled = loading;
  }

  // Email + Password
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
            no_table: 'Employee portal is being set up. Contact your administrator.',
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

  // Magic Link
  if (magicBtn) {
    magicBtn.addEventListener('click', async function () {
      showFeedback('', '');
      var email = emailInput && emailInput.value.trim();
      if (!email) { showFeedback('Enter your email address first.', 'error'); return; }

      setLoading(magicBtn, true);

      try {
        var mlResult = await supabase.auth.signInWithOtp({
          email: email,
          options: { emailRedirectTo: window.location.origin + '/admin/callback/' },
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

  // Session check on login page
  if (loginForm) {
    (async function () {
      var s = await supabase.auth.getSession();
      if (s.data.session && s.data.session.user) {
        var result = await verifyTeamMember(s.data.session.user);
        if (result.authorized) handleAuthorized(result.member);
      }
    })();
  }

  // ── EXPOSE FOR DASHBOARD + OTHER PAGES ──
  window.SKR_AUTH = {
    supabase: supabase,
    verifyTeamMember: verifyTeamMember,
    fetchTeamMembers: fetchTeamMembers,
    detectSchema: detectSchema,

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
  };

})();
