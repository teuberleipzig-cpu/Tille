(function () {
  const form = document.querySelector('.feedback-form');
  const status = document.getElementById('feedback-status');
  const button = form.querySelector('button[type="submit"]');
  const captcha = document.getElementById('feedback-captcha');
  let config = { captcha: { enabled: false } };
  fetch('/api/feedback/config').then(r => r.ok ? r.json() : Promise.reject()).then(value => { config = value; if (value.captcha.enabled) captcha.textContent = 'Spam protection is required. The reCAPTCHA v2 widget needs the deployment site-key integration.'; }).catch(() => { status.textContent = 'Feedback service configuration is currently unavailable.'; });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (button.disabled) return; status.textContent = '';
    if (config.captcha.enabled) { status.textContent = 'Please complete the spam protection check.'; return; }
    button.disabled = true;
    try {
      const response = await fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ category: form.elements.category.value, feedback: form.elements.feedback.value, replyEmail: form.elements.replyEmail.value, honeypot: form.elements.honeypot.value, captchaToken: '' }) });
      if (!response.ok) throw new Error('submit failed');
      window.location.assign('feedback-thanks.html');
    } catch { status.textContent = 'Feedback could not be sent. Please try again later.'; button.disabled = false; }
  });
})();
