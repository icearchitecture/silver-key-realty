/* ============================================================
   SILVER KEY REALTY — PATHWAYS
   Pathway card interactions and routing logic.
   
   Current: Cards link to stub pages (buyer/, seller/, investor/)
   Future: Analytics tracking, pathway-aware session state,
           dynamic CTA updates based on selected pathway.
   ============================================================ */

(function() {
  var cards = document.querySelectorAll('.pathway-card');
  if (!cards.length) return;

  // Track which pathway the user engages with
  cards.forEach(function(card) {
    card.addEventListener('click', function(e) {
      var pathway = card.getAttribute('data-pathway');
      if (pathway) {
        // Future: analytics event
        // gtag('event', 'pathway_select', { pathway: pathway });

        // Future: store in session for pathway-aware CTAs
        // sessionStorage.setItem('skr_pathway', pathway);
      }
    });
  });

  // Keyboard accessibility
  cards.forEach(function(card) {
    card.setAttribute('role', 'link');
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
})();
