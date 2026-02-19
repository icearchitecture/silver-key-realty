/* ============================================================
   SILVER KEY REALTY — FORM HANDLING
   Captures lead data, submits to /api/submit, shows feedback.
   Pathway auto-detected from data-pathway attribute on form.
   ============================================================ */

(function() {
  var API_ENDPOINT = '/api/leads/submit';

  function getField(form, name) {
    return form.querySelector('[name="' + name + '"]');
  }

  function getValue(form, name) {
    var field = getField(form, name);
    if (!field) return '';
    return field.value ? field.value.trim() : '';
  }

  function buildScheduleSummary(form) {
    var meetingType = getValue(form, 'meeting_type');
    var date = getValue(form, 'preferred_date');
    var time = getValue(form, 'preferred_time');
    var timezone = getValue(form, 'timezone');
    var parts = [];

    if (meetingType) parts.push('Meeting type: ' + meetingType);
    if (date) parts.push('Preferred date: ' + date);
    if (time) parts.push('Preferred time: ' + time);
    if (timezone) parts.push('Timezone: ' + timezone);

    if (!parts.length) return '';
    return 'Consultation preferences:\n' + parts.join('\n');
  }

  function setTimezone(form) {
    var field = getField(form, 'timezone');
    if (!field || field.value) return;
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) field.value = tz;
    } catch (e) {
      // Silent fail; timezone remains optional.
    }
  }

  var forms = document.querySelectorAll('.skr-form');
  if (!forms.length) return;

  forms.forEach(function(form) {
    setTimezone(form);

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
      var messageField = getField(form, 'message');
      var messageText = messageField ? messageField.value : '';
      var scheduleSummary = buildScheduleSummary(form);
      var composedMessage = messageText;

      if (scheduleSummary) {
        composedMessage = (messageText ? messageText + '\n\n' : '') + scheduleSummary;
      }

      var fullName = (getField(form, 'name') ? getField(form, 'name').value : '').trim();
      var nameParts = fullName.split(/\s+/);
      var firstName = nameParts[0] || '';
      var lastName = nameParts.slice(1).join(' ') || '';

      var pathwayField = getField(form, 'pathway');
      var pathway = (pathwayField && pathwayField.value) ? pathwayField.value : (form.getAttribute('data-pathway') || 'general');

      var data = {
        firstName: firstName,
        lastName: lastName,
        email: getField(form, 'email') ? getField(form, 'email').value : '',
        phone: getField(form, 'phone') ? getField(form, 'phone').value : null,
        pathway: pathway,
        message: composedMessage ? composedMessage : null,
        source: window.location.pathname
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
          form.innerHTML = '<div class="form-success" style="text-align:center;padding:40px 20px">' +
            '<div style="font-size:36px;margin-bottom:12px">&#10003;</div>' +
            '<h3 style="font-family: var(--serif); font-size: 28px; font-weight: 300; color: var(--light-warm, #F0EBE3); margin-bottom: 12px;">Thank <em>You</em></h3>' +
            '<p style="font-family: var(--sans); font-weight: 200; font-size: 15px; color: var(--warm-gray, #9A8E80); line-height: 1.8;">' + (result.message || 'We will review your information and be in touch within 24 hours.') + '</p>' +
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
