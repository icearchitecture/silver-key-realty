/* ============================================================
   SILVER KEY REALTY — NAV
   Scroll state detection + mobile menu overlay toggle
   ============================================================ */

(function() {
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');
  var mobileMenu = document.getElementById('mobileMenu');

  if (!nav) return;

  // Scroll state: frosted glass after 60px
  var SCROLL_TRIGGER = 60;

  function updateNav() {
    nav.classList.toggle('scrolled', window.scrollY > SCROLL_TRIGGER);
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // Mobile menu overlay toggle
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', function() {
      var isOpen = mobileMenu.classList.contains('open');
      if (isOpen) {
        closeMobileMenu();
      } else {
        mobileMenu.style.cssText = 'display:flex !important; visibility:visible !important;';
        mobileMenu.classList.add('open');
        toggle.classList.add('active');
        document.body.classList.add('menu-open');
      }
    });
  }

  // Smooth scroll for anchor links + close mobile menu
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

  // Close on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMobileMenu();
  });
})();

function closeMobileMenu() {
  var mobileMenu = document.getElementById('mobileMenu');
  var navToggle = document.getElementById('navToggle');
  if (mobileMenu) {
    mobileMenu.style.cssText = 'display:none !important; visibility:hidden !important;';
    mobileMenu.classList.remove('open');
  }
  if (navToggle) navToggle.classList.remove('active');
  document.body.classList.remove('menu-open');
}
