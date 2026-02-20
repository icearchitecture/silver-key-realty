window.SKR_SHELL = {
  injectLoader: function() {
    if (document.querySelector('.skr-loader')) return;
    var loader = document.createElement('div');
    loader.className = 'skr-loader';
    loader.id = 'skr-loader';
    loader.innerHTML = '<div class="skr-loader-logo">Silver Key <em>Realty</em></div>'
      + '<div class="skr-loader-bar"><div class="skr-loader-fill"></div></div>'
      + '<div class="skr-loader-text">Loading...</div>';
    document.body.prepend(loader);
  },

  injectErrorState: function() {
    if (document.querySelector('.skr-error-state')) return;
    var err = document.createElement('div');
    err.className = 'skr-error-state';
    err.id = 'skr-error-state';
    err.innerHTML = '<div class="skr-loader-logo">Silver Key <em>Realty</em></div>'
      + '<h2>Something went wrong</h2>'
      + '<p>The page didn\'t load correctly. This usually fixes itself — try refreshing.</p>'
      + '<button class="skr-btn skr-btn-primary" onclick="window.location.reload()">Refresh Page</button>'
      + '<button class="skr-btn skr-btn-ghost" onclick="window.location.href=\'/admin/\'" style="margin-top:8px">Back to Login</button>';
    document.body.appendChild(err);
  },

  buildSidebar: function(member, activePage) {
    var role = member ? member.role : '';
    var permLevel = member ? (member.permissionLevel || member.permission_level || 0) : 0;
    var firstName = member ? (member.firstName || member.first_name || '') : '';
    var lastName = member ? (member.lastName || member.last_name || '') : '';

    var nav = '';

    nav += '<div class="skr-sidebar-section">Core</div>';
    nav += SKR_SHELL._link('/admin/dashboard/', 'Command Center', '◆', activePage);
    nav += SKR_SHELL._link('/admin/leads/', 'Leads', '◎', activePage);
    nav += SKR_SHELL._link('/admin/deals/', 'Deals', '◇', activePage);
    nav += SKR_SHELL._link('/admin/properties/', 'Properties', '△', activePage);

    nav += '<div class="skr-sidebar-section">Tools</div>';
    nav += SKR_SHELL._link('/admin/workspace/', 'Workspace', '▦', activePage);
    nav += SKR_SHELL._link('/admin/source-drive/', 'Source Drive', '◈', activePage);
    nav += SKR_SHELL._link('/admin/email/', 'Email', '▷', activePage);
    nav += SKR_SHELL._link('/admin/meetings/', 'Meetings', '◑', activePage);
    nav += SKR_SHELL._link('/admin/documents/', 'Documents', '▤', activePage);

    if (permLevel >= 50) {
      nav += '<div class="skr-sidebar-section">Admin</div>';
      nav += SKR_SHELL._link('/admin/team/', 'Team', '●', activePage);
      nav += SKR_SHELL._link('/admin/settings/', 'Settings', '✦', activePage);
    }

    if (permLevel >= 70) {
      nav += SKR_SHELL._link('/admin/permissions/', 'Permissions', '◉', activePage);
      nav += SKR_SHELL._link('/admin/security/', 'Security', '⊕', activePage);
    }

    var sidebar = '<aside class="skr-sidebar" id="skr-sidebar">'
      + '<div class="skr-sidebar-logo">Silver Key <em>Realty</em></div>'
      + '<nav class="skr-sidebar-nav">' + nav + '</nav>'
      + '<div class="skr-sidebar-user">'
      + '<div class="skr-sidebar-user-name">' + firstName + ' ' + lastName + '</div>'
      + '<div class="skr-sidebar-user-role">' + (role || 'Team Member') + '</div>'
      + '<button class="skr-sidebar-signout" onclick="SKR_SHELL.signOut()">Sign Out</button>'
      + '</div>'
      + '</aside>';

    return sidebar;
  },

  _link: function(href, label, icon, activePage) {
    var isActive = activePage && href.indexOf(activePage) > -1;
    return '<a href="' + href + '" class="skr-sidebar-link' + (isActive ? ' active' : '') + '">'
      + '<span class="icon">' + icon + '</span>' + label + '</a>';
  },

  init: function(options) {
    var opts = options || {};
    var activePage = opts.activePage || '';

    SKR_SHELL.injectLoader();
    SKR_SHELL.injectErrorState();

    SKR_SHELL._timeout = setTimeout(function() {
      SKR_SHELL.showError();
    }, 8000);

    return {
      render: function(member) {
        if (SKR_SHELL._timeout) clearTimeout(SKR_SHELL._timeout);

        var existing = document.getElementById('skr-sidebar');
        if (existing) existing.remove();

        var shell = document.querySelector('.skr-shell');
        if (shell) {
          shell.insertAdjacentHTML('afterbegin', SKR_SHELL.buildSidebar(member, activePage));
        }

        SKR_SHELL.ready();
      }
    };
  },

  ready: function() {
    if (SKR_SHELL._timeout) clearTimeout(SKR_SHELL._timeout);
    document.body.classList.add('skr-ready');
    var loader = document.getElementById('skr-loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(function() { loader.remove(); }, 300);
    }
  },

  showError: function() {
    var loader = document.getElementById('skr-loader');
    if (loader) loader.remove();
    var err = document.getElementById('skr-error-state');
    if (err) err.classList.add('visible');
  },

  signOut: function() {
    sessionStorage.clear();
    if (window.SKR_SUPA) {
      window.SKR_SUPA.auth.signOut().then(function() {
        window.location.href = '/admin/';
      });
    } else if (window.sb) {
      window.sb.auth.signOut().then(function() {
        window.location.href = '/admin/';
      });
    } else {
      window.location.href = '/admin/';
    }
  }
};
