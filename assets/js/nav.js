/* ============================================================
   SILVER KEY REALTY — NAV
   Scroll state detection + mobile menu toggle
   ============================================================ */

(function() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');

  if (!nav) return;

  // Scroll state: frosted glass after 60px
  const SCROLL_TRIGGER = 60;

  function updateNav() {
    nav.classList.toggle('scrolled', window.scrollY > SCROLL_TRIGGER);
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav(); // Initial check

  // Mobile toggle
  if (toggle && links) {
    toggle.addEventListener('click', function() {
      links.classList.toggle('open');
    });
  }

  // Smooth scroll for anchor links + close mobile menu
  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      if (links) links.classList.remove('open');
      var target = document.querySelector(a.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
})();
