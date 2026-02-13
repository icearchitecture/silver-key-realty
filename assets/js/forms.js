/* ============================================================
   SILVER KEY REALTY — FORM HANDLING
   Captures lead data, submits to /api/submit, shows feedback.
   Pathway auto-detected from data-pathway attribute on form.
   ============================================================ */

(function() {
  var API_ENDPOINT = '/api/submit';

  var forms = document.querySelectorAll('.skr-form');
  if (!forms.length) return;

  forms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();

      var btn = form.querySelector('button[type="submit"]');
      var originalText = btn.textContent;
      var feedback = form.querySelector('.form-feedback');

      // Disable and show loading
      btn.disabled = true;
      btn.textContent = 'Submitting...';
      if (feedback) feedback.textContent = '';

      // Collect data
      var data = {
        name: form.querySelector('[name="name"]').value,
        email: form.querySelector('[name="email"]').value,
        phone: form.querySelector('[name="phone"]') ? form.querySelector('[name="phone"]').value : null,
        pathway: form.getAttribute('data-pathway') || 'general',
        message: form.querySelector('[name="message"]') ? form.querySelector('[name="message"]').value : null,
        source: window.location.pathname,
        timestamp: new Date().toISOString()
      };

      fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      .then(function(res) { return res.json(); })
      .then(function(result) {
        if (result.success) {
          // Success state
          form.innerHTML = '<div class="form-success">' +
            '<h3 style="font-family: var(--serif); font-size: 28px; font-weight: 300; color: var(--charcoal); margin-bottom: 12px;">Inquiry <em>received.</em></h3>' +
            '<p style="font-family: var(--sans); font-weight: 200; font-size: 15px; color: var(--warm-gray); line-height: 1.8;">We will review your information and be in touch within 48 hours.</p>' +
            '</div>';
        } else {
          // Validation error
          if (feedback) feedback.textContent = result.error || 'Please check your information and try again.';
          btn.disabled = false;
          btn.textContent = originalText;
        }
      })
      .catch(function() {
        if (feedback) feedback.textContent = 'Something went wrong. Please try again.';
        btn.disabled = false;
        btn.textContent = originalText;
      });
    });
  });
})();
