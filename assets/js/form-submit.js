/* ============================================================
   SILVER KEY REALTY — LEAD FORM SUBMISSION
   Connects homepage/pathway forms to /api/leads/submit.
   Splits full name into firstName + lastName for the new
   lead API. Falls back gracefully on error.
   ============================================================ */

(function () {
  'use strict';

  var ENDPOINT = '/api/leads/submit';

  function splitName(fullName) {
    var parts = (fullName || '').trim().split(/\s+/);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
    };
  }

  var forms = document.querySelectorAll('.skr-form');
  if (!forms.length) return;

  forms.forEach(function (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      var btn = form.querySelector('button[type="submit"]') || form.querySelector('.form-submit');
      var feedback = form.querySelector('.form-feedback');
      var originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending...';
      if (feedback) feedback.textContent = '';

      var nameField = form.querySelector('[name="name"]');
      var emailField = form.querySelector('[name="email"]');
      var phoneField = form.querySelector('[name="phone"]');
      var pathwayField = form.querySelector('[name="pathway"]');
      var messageField = form.querySelector('[name="message"]');

      var name = splitName(nameField ? nameField.value : '');

      var data = {
        firstName: form.querySelector('[name="firstName"]')?.value || form.querySelector('[name="first_name"]')?.value || name.firstName,
        lastName: form.querySelector('[name="lastName"]')?.value || form.querySelector('[name="last_name"]')?.value || name.lastName,
        email: emailField ? emailField.value.trim() : '',
        phone: phoneField ? phoneField.value.trim() : '',
        pathway: (pathwayField ? pathwayField.value : '') || form.getAttribute('data-pathway') || 'general',
        message: messageField ? messageField.value.trim() : '',
        source: 'website_' + (form.getAttribute('data-pathway') || 'homepage'),
      };

      try {
        var response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        var result = await response.json();

        if (result.success) {
          form.innerHTML = '<div style="text-align:center;padding:40px 20px">'
            + '<div style="font-family:var(--serif);font-size:24px;color:var(--cream);margin-bottom:12px">Thank you, ' + data.firstName + '.</div>'
            + '<div style="font-family:var(--sans);font-size:14px;color:var(--silver);line-height:1.7">We received your inquiry and a member of our team will be in touch within 24 hours.</div>'
            + '</div>';
        } else {
          if (feedback) feedback.textContent = result.error || 'Something went wrong. Please try again.';
          btn.textContent = originalText;
          btn.disabled = false;
        }
      } catch (err) {
        if (feedback) feedback.textContent = 'Connection error — please try again.';
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  });
})();
