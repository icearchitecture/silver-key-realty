/* ============================================================
   SILVER KEY REALTY — ADMIN AUTH
   Client-side Supabase auth for team members.
   Handles: email/password login, magic link, session, role check.
   ============================================================ */

(function () {
  'use strict';

  // ── CONFIG ──
  // These are the PUBLIC (anon) keys — safe for client-side use.
  // Supabase RLS enforces security server-side.
  const SUPABASE_URL = window.SKR_CONFIG?.SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = window.SKR_CONFIG?.SUPABASE_ANON_KEY || '';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[SKR Auth] Missing Supabase config. Set window.SKR_CONFIG.');
    return;
  }

  // ── INIT SUPABASE ──
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── DOM ELEMENTS ──
  const loginForm = document.getElementById('loginForm');
  const magicBtn = document.getElementById('magicLinkBtn');
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const submitBtn = document.getElementById('loginSubmit');
  const feedback = document.getElementById('loginFeedback');

  // ── HELPERS ──
  function showFeedback(msg, type) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.className = 'login-feedback ' + type;
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.classList.add('loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  // ── VERIFY TEAM MEMBER ──
  // After Supabase auth succeeds, check if the user exists in team_members
  async function verifyTeamMember(user) {
    const { data, error } = await supabase
      .from('skr_team_members')
      .select('id, display_name, role, is_active')
      .eq('email', user.email)
      .single();

    if (error || !data) {
      return { authorized: false, reason: 'not_found' };
    }

    if (!data.is_active) {
      return { authorized: false, reason: 'deactivated' };
    }

    return {
      authorized: true,
      member: data,
    };
  }

  // ── POST-AUTH REDIRECT ──
  function handleAuthorized(member) {
    // Store role info for dashboard
    sessionStorage.setItem('skr_member', JSON.stringify(member));
    // Redirect to dashboard
    window.location.href = '/admin/dashboard/';
  }

  // ── EMAIL + PASSWORD LOGIN ──
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      showFeedback('', '');

      const email = emailInput?.value?.trim();
      const password = passwordInput?.value;

      if (!email || !password) {
        showFeedback('Email and password are required.', 'error');
        return;
      }

      setLoading(submitBtn, true);

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          showFeedback('Invalid email or password.', 'error');
          setLoading(submitBtn, false);
          return;
        }

        // Auth succeeded — now verify team membership
        const verification = await verifyTeamMember(data.user);

        if (!verification.authorized) {
          // Sign them out — they authenticated but aren't a team member
          await supabase.auth.signOut();

          if (verification.reason === 'deactivated') {
            showFeedback('Your account has been deactivated. Contact your administrator.', 'error');
          } else {
            showFeedback('This account is not authorized for admin access.', 'error');
          }

          setLoading(submitBtn, false);
          return;
        }

        // Authorized — redirect
        showFeedback('Welcome back, ' + verification.member.display_name + '.', 'success');
        setTimeout(function () {
          handleAuthorized(verification.member);
        }, 800);

      } catch (err) {
        console.error('[SKR Auth] Login error:', err);
        showFeedback('Something went wrong. Please try again.', 'error');
        setLoading(submitBtn, false);
      }
    });
  }

  // ── MAGIC LINK ──
  if (magicBtn) {
    magicBtn.addEventListener('click', async function () {
      showFeedback('', '');

      const email = emailInput?.value?.trim();

      if (!email) {
        showFeedback('Enter your email address first.', 'error');
        return;
      }

      setLoading(magicBtn, true);

      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: email,
          options: {
            emailRedirectTo: window.location.origin + '/admin/callback/',
          },
        });

        if (error) {
          showFeedback('Could not send magic link. Try again.', 'error');
          setLoading(magicBtn, false);
          return;
        }

        showFeedback('Magic link sent. Check your email.', 'success');
        setLoading(magicBtn, false);

      } catch (err) {
        console.error('[SKR Auth] Magic link error:', err);
        showFeedback('Something went wrong. Please try again.', 'error');
        setLoading(magicBtn, false);
      }
    });
  }

  // ── SESSION CHECK (on page load) ──
  // If already logged in, redirect to dashboard
  async function checkExistingSession() {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const verification = await verifyTeamMember(session.user);
      if (verification.authorized) {
        handleAuthorized(verification.member);
      }
    }
  }

  // Only check session on login page, not dashboard
  if (loginForm) {
    checkExistingSession();
  }

  // ── EXPOSE FOR DASHBOARD USE ──
  window.SKR_AUTH = {
    supabase: supabase,
    verifyTeamMember: verifyTeamMember,

    async getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },

    async getCurrentMember() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      const result = await verifyTeamMember(session.user);
      return result.authorized ? result.member : null;
    },

    async signOut() {
      sessionStorage.removeItem('skr_member');
      await supabase.auth.signOut();
      window.location.href = '/admin/';
    },
  };

})();
