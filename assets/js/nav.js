/* ============================================================
   SILVER KEY REALTY — NAV
   Scroll state detection + mobile menu overlay toggle
   ============================================================ */

(function() {
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');

  if (!nav) return;

  var SCROLL_TRIGGER = 60;

  function updateNav() {
    nav.classList.toggle('scrolled', window.scrollY > SCROLL_TRIGGER);
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  if (toggle) {
    toggle.addEventListener('click', function() {
      var existing = document.getElementById('mobileMenu');
      if (existing) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      var href = a.getAttribute('href');
      if (href === '#') return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        closeMobileMenu();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMobileMenu();
  });
})();

function _getMobileMenuHTML() {
  var p = window.location.pathname;
  var isPathway = /\/(buyer|seller|investor|rentals)\//i.test(p);
  var pre = isPathway ? '../' : '';

  var nav = '';
  if (isPathway) {
    nav += '<a href="' + pre + '" class="mobile-menu-link" style="border-bottom:1px solid rgba(58,148,100,.15)"><span class="mobile-menu-number">&larr;</span><span class="mobile-menu-label" style="color:#3A9464">Back to Home</span></a>';
    nav += '<a href="' + pre + 'buyer/" class="mobile-menu-link"><span class="mobile-menu-number">01</span><span class="mobile-menu-label">Buying a Home</span></a>';
    nav += '<a href="' + pre + 'seller/" class="mobile-menu-link"><span class="mobile-menu-number">02</span><span class="mobile-menu-label">Selling a Property</span></a>';
    nav += '<a href="' + pre + 'investor/" class="mobile-menu-link"><span class="mobile-menu-number">03</span><span class="mobile-menu-label">Investing in Assets</span></a>';
    nav += '<a href="' + pre + 'rentals/" class="mobile-menu-link"><span class="mobile-menu-number">04</span><span class="mobile-menu-label">Renting a Space</span></a>';
  } else {
    nav += '<a href="#pathways" class="mobile-menu-link" onclick="closeMobileMenu()"><span class="mobile-menu-number">01</span><span class="mobile-menu-label">Find Your Pathway</span></a>';
    nav += '<a href="buyer/" class="mobile-menu-link"><span class="mobile-menu-number">02</span><span class="mobile-menu-label">Buying a Home</span></a>';
    nav += '<a href="seller/" class="mobile-menu-link"><span class="mobile-menu-number">03</span><span class="mobile-menu-label">Selling a Property</span></a>';
    nav += '<a href="investor/" class="mobile-menu-link"><span class="mobile-menu-number">04</span><span class="mobile-menu-label">Investing in Assets</span></a>';
    nav += '<a href="rentals/" class="mobile-menu-link"><span class="mobile-menu-number">05</span><span class="mobile-menu-label">Renting a Space</span></a>';
  }

  return '<div class="mobile-menu-content">'
    + '<div class="mobile-menu-brand"><div class="mobile-menu-logo">SKR</div><div class="mobile-menu-tagline">Lifestyle Investment Architecture</div></div>'
    + '<nav class="mobile-menu-nav">' + nav + '</nav>'
    + '<div class="mobile-menu-divider"></div>'
    + '<div class="mobile-menu-actions"><a href="#" class="mobile-menu-cta" onclick="closeMenuAndLogin(); return false;">Login / Get Started</a></div>'
    + '<div class="mobile-menu-footer"><div class="mobile-menu-footer-text">silverkeyrealty.llc &middot; Pontiac, Michigan</div></div>'
    + '</div>';
}

function openMobileMenu() {
  var existing = document.getElementById('mobileMenu');
  if (existing) existing.remove();

  var menu = document.createElement('div');
  menu.id = 'mobileMenu';
  menu.className = 'mobile-menu open';
  menu.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; z-index:999; background:rgba(10,10,10,0.98); align-items:center; justify-content:center; flex-direction:column;';
  menu.innerHTML = _getMobileMenuHTML();
  document.body.appendChild(menu);

  var navToggle = document.getElementById('navToggle');
  if (navToggle) navToggle.classList.add('active');
  document.body.classList.add('menu-open');
}

function closeMobileMenu() {
  var menu = document.getElementById('mobileMenu');
  if (menu) menu.remove();

  var navToggle = document.getElementById('navToggle');
  if (navToggle) navToggle.classList.remove('active');
  document.body.classList.remove('menu-open');
}
