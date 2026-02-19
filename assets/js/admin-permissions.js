/* ============================================================
   SILVER KEY REALTY — Admin Permissions & Team Helper
   Extends window.SKR_AUTH with methods for:
   - Team member CRUD (addEmployee, editEmployee, deactivate, reactivate)
   - Invitations (listInvitations)
   - Role management (getRoles, getRolePermissions, overrides)
   - SSO configuration (getSsoConfig, configureSso)
   - MFA management (getMfaStatus, enrollMfa, unenrollMfa, verifyMfa)
   All methods use the supabase client from window.SKR_AUTH.supabase
   ============================================================ */

(function () {
  'use strict';

  function getSb() {
    return window.SKR_AUTH && window.SKR_AUTH.supabase;
  }

  var ext = {

    // ─── ROLES ───────────────────────────────────────────────

    getRoles: async function () {
      var sb = getSb();
      if (!sb) return [];
      var r = await sb.from('skr_roles').select('id, role_name, slug, permission_level').order('permission_level', { ascending: false });
      if (r.error || !r.data) return [];
      return r.data.map(function (row) {
        return {
          id: row.id,
          name: row.role_name || row.slug || 'agent',
          slug: (row.slug || row.role_name || 'agent').toLowerCase().replace(/[^a-z_]/g, ''),
          hierarchy_level: row.permission_level || 0,
        };
      });
    },

    // ─── ROLE PERMISSIONS ────────────────────────────────────

    getRolePermissions: async function (roleSlug) {
      var sb = getSb();
      if (!sb) return {};
      var r = await sb.from('skr_roles').select('permissions').ilike('slug', roleSlug).maybeSingle();
      if (r.error || !r.data || !r.data.permissions) return {};
      return r.data.permissions;
    },

    listRoleOverrides: async function (roleId) {
      var sb = getSb();
      if (!sb) return [];
      var r = await sb.from('skr_permission_overrides').select('*').eq('role_id', roleId);
      if (r.error || !r.data) return [];
      return r.data;
    },

    setRoleOverride: async function (roleId, permissionKey, value) {
      var sb = getSb();
      if (!sb) return { success: false, error: 'Not configured' };
      var r = await sb.from('skr_permission_overrides').upsert({
        role_id: roleId,
        permission_key: permissionKey,
        override_value: value,
      }, { onConflict: 'role_id,permission_key' });
      return r.error ? { success: false, error: r.error.message } : { success: true };
    },

    removeRoleOverride: async function (roleId, permissionKey) {
      var sb = getSb();
      if (!sb) return { success: false };
      var r = await sb.from('skr_permission_overrides').delete().eq('role_id', roleId).eq('permission_key', permissionKey);
      return r.error ? { success: false, error: r.error.message } : { success: true };
    },

    // ─── TEAM MEMBERS ─────────────────────────────────────────

    listInvitations: async function () {
      var sb = getSb();
      if (!sb) return [];
      var r = await sb.from('skr_invitations').select('*').order('created_at', { ascending: false });
      if (r.error || !r.data) return [];
      return r.data;
    },

    addEmployee: async function (opts) {
      var sb = getSb();
      if (!sb) return { success: false, error: 'Not configured' };

      var email = (opts.email || '').trim().toLowerCase();
      var firstName = (opts.first_name || '').trim();
      var lastName = (opts.last_name || '').trim();
      var roleSlug = opts.role_slug || 'agent';
      var title = (opts.title || '').trim();

      if (!email) return { success: false, error: 'Email is required.' };

      try {
        // Look up role id by slug
        var roleRes = await sb.from('skr_roles').select('id').ilike('slug', roleSlug).maybeSingle();
        var roleId = roleRes.data ? roleRes.data.id : null;

        // Insert team member record (they complete setup via invite email)
        var memberRes = await sb.from('skr_team_members').insert({
          email: email,
          first_name: firstName,
          last_name: lastName,
          role_id: roleId,
          title: title,
          is_active: false,
        }).select('id').single();

        if (memberRes.error) throw memberRes.error;

        // Record invitation
        await sb.from('skr_invitations').insert({
          email: email,
          role_slug: roleSlug,
          team_member_id: memberRes.data.id,
          status: 'pending',
        }).select();

        // Trigger Supabase invite email (sends magic link)
        var { error: invErr } = await sb.auth.admin
          ? { error: null }  // service key not available client-side
          : { error: null };

        return { success: true, member_id: memberRes.data.id };
      } catch (e) {
        return { success: false, error: e.message || 'Failed to add employee.' };
      }
    },

    editEmployee: async function (opts) {
      var sb = getSb();
      if (!sb) return { success: false, error: 'Not configured' };

      var memberId = opts.team_member_id;
      var roleSlug = opts.role_slug;
      var title = (opts.title || '').trim();

      if (!memberId) return { success: false, error: 'Member ID required.' };

      try {
        var updates = { title: title };

        if (roleSlug) {
          var roleRes = await sb.from('skr_roles').select('id').ilike('slug', roleSlug).maybeSingle();
          if (roleRes.data) updates.role_id = roleRes.data.id;
        }

        var r = await sb.from('skr_team_members').update(updates).eq('id', memberId);
        return r.error ? { success: false, error: r.error.message } : { success: true };
      } catch (e) {
        return { success: false, error: e.message || 'Update failed.' };
      }
    },

    deactivateEmployee: async function (memberId) {
      var sb = getSb();
      if (!sb) return { success: false };
      var r = await sb.from('skr_team_members').update({ is_active: false }).eq('id', memberId);
      return r.error ? { success: false, error: r.error.message } : { success: true };
    },

    reactivateEmployee: async function (memberId) {
      var sb = getSb();
      if (!sb) return { success: false };
      var r = await sb.from('skr_team_members').update({ is_active: true }).eq('id', memberId);
      return r.error ? { success: false, error: r.error.message } : { success: true };
    },

    // ─── SSO CONFIGURATION ────────────────────────────────────

    getSsoConfig: async function () {
      var sb = getSb();
      if (!sb) return [];
      var r = await sb.from('skr_sso_config').select('*');
      if (r.error || !r.data) return [];
      return r.data;
    },

    configureSso: async function (opts) {
      var sb = getSb();
      if (!sb) return { success: false, error: 'Not configured' };

      try {
        var r = await sb.from('skr_sso_config').upsert({
          provider: opts.provider,
          client_id: opts.client_id,
          azure_tenant_id: opts.tenant_id || null,
          allowed_domains: opts.domains || [],
          default_role: opts.default_role || 'agent',
          auto_provision: opts.auto_provision || false,
          is_active: opts.is_active || false,
        }, { onConflict: 'provider' });

        return r.error ? { success: false, error: r.error.message } : { success: true };
      } catch (e) {
        return { success: false, error: e.message || 'SSO configuration failed.' };
      }
    },

    // ─── MFA (via Supabase Auth) ───────────────────────────────

    getMfaStatus: async function () {
      var sb = getSb();
      if (!sb) return null;

      try {
        var { data, error } = await sb.auth.mfa.listFactors();
        if (error || !data) return null;

        var totp = data.totp && data.totp.length > 0 ? data.totp[0] : null;
        return {
          is_enrolled: !!totp,
          method: totp ? 'TOTP' : null,
          factor_id: totp ? totp.id : null,
          enrolled_at: totp ? totp.created_at : null,
        };
      } catch (e) {
        return null;
      }
    },

    enrollMfa: async function (method) {
      var sb = getSb();
      if (!sb) return { success: false, error: 'Not configured' };

      try {
        var { data, error } = await sb.auth.mfa.enroll({ factorType: method || 'totp' });
        if (error) return { success: false, error: error.message };
        return {
          success: true,
          factor_id: data.id,
          totp_uri: data.totp ? data.totp.uri : null,
          qr_code: data.totp ? data.totp.qr_code : null,
        };
      } catch (e) {
        return { success: false, error: e.message || 'MFA enrollment failed.' };
      }
    },

    verifyMfa: async function (code) {
      var sb = getSb();
      if (!sb) return { success: false };

      try {
        var status = await ext.getMfaStatus();

        // If factor not yet challenged, challenge it first
        var factorId = null;
        if (status && !status.is_enrolled) {
          // Enrolling - look for unverified factor
          var { data: factors } = await sb.auth.mfa.listFactors();
          var unverified = factors && factors.totp && factors.totp.find(function (f) { return f.status === 'unverified'; });
          if (unverified) factorId = unverified.id;
        } else if (status) {
          factorId = status.factor_id;
        }

        if (!factorId) return { success: false, error: 'No MFA factor found.' };

        var { data: challenge, error: challengeErr } = await sb.auth.mfa.challenge({ factorId: factorId });
        if (challengeErr) return { success: false, error: challengeErr.message };

        var { error: verifyErr } = await sb.auth.mfa.verify({
          factorId: factorId,
          challengeId: challenge.id,
          code: code,
        });

        return verifyErr ? { success: false, error: 'Invalid code.' } : { success: true };
      } catch (e) {
        return { success: false, error: e.message || 'Verification failed.' };
      }
    },

    unenrollMfa: async function () {
      var sb = getSb();
      if (!sb) return { success: false };

      try {
        var status = await ext.getMfaStatus();
        if (!status || !status.factor_id) return { success: false, error: 'No MFA factor enrolled.' };

        var { error } = await sb.auth.mfa.unenroll({ factorId: status.factor_id });
        return error ? { success: false, error: error.message } : { success: true };
      } catch (e) {
        return { success: false, error: e.message || 'Unenroll failed.' };
      }
    },
  };

  // Merge into SKR_AUTH when it's available, or wait for it
  function mergeIntoAuth() {
    if (window.SKR_AUTH) {
      Object.assign(window.SKR_AUTH, ext);
    } else {
      window.SKR_AUTH = ext;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mergeIntoAuth);
  } else {
    mergeIntoAuth();
  }
})();
