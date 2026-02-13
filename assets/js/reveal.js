/* ============================================================
   SILVER KEY REALTY — REVEAL
   IntersectionObserver-based scroll reveal system.
   Add class="reveal" to any element for fade-up on scroll.
   Stagger delay: 80ms between siblings.
   ============================================================ */

(function() {
  var THRESHOLD = 0.12;
  var STAGGER = 80; // ms between sibling reveals

  var reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry, i) {
      if (entry.isIntersecting) {
        setTimeout(function() {
          entry.target.classList.add('visible');
        }, i * STAGGER);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: THRESHOLD });

  reveals.forEach(function(el) {
    observer.observe(el);
  });
})();
