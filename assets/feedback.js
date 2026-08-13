const RECAPTCHA_SCRIPT_URL = 'https://www.google.com/recaptcha/api.js?render=explicit';
const CONFIG_ERROR = 'Feedback service configuration is currently unavailable.';
const CAPTCHA_UNAVAILABLE = 'Spam protection is currently unavailable.';
let recaptchaScriptPromise;

export function loadRecaptchaScript(documentObject = document, windowObject = window) {
  if (windowObject.grecaptcha?.render) return Promise.resolve(windowObject.grecaptcha);
  if (recaptchaScriptPromise) return recaptchaScriptPromise;

  recaptchaScriptPromise = new Promise((resolve, reject) => {
    const existing = documentObject.querySelector(`script[src="${RECAPTCHA_SCRIPT_URL}"]`);
    const script = existing || documentObject.createElement('script');
    const loaded = () => windowObject.grecaptcha?.render ? resolve(windowObject.grecaptcha) : reject(new Error('reCAPTCHA unavailable'));
    const failed = () => reject(new Error('reCAPTCHA failed to load'));
    script.addEventListener('load', loaded, { once: true });
    script.addEventListener('error', failed, { once: true });
    if (!existing) {
      script.src = RECAPTCHA_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      documentObject.head.append(script);
    }
  }).catch(error => {
    recaptchaScriptPromise = undefined;
    throw error;
  });
  return recaptchaScriptPromise;
}

export function createFeedbackController({ form, status, button, captchaContainer, fetchImpl, loadCaptcha, redirect }) {
  let captchaEnabled = false;
  let captchaToken = '';
  let captchaWidget;
  let recaptcha;
  let ready = false;

  const block = message => {
    ready = false;
    button.disabled = true;
    status.textContent = message;
  };
  const clearCaptcha = (message = '') => {
    captchaToken = '';
    if (message) status.textContent = message;
  };

  async function initialise() {
    button.disabled = true;
    try {
      const response = await fetchImpl('/api/feedback/config');
      if (!response.ok) throw new Error('config request failed');
      const config = await response.json();
      if (!config?.captcha || typeof config.captcha.enabled !== 'boolean') throw new Error('invalid config');
      captchaEnabled = config.captcha.enabled;
      if (!captchaEnabled) {
        ready = true;
        button.disabled = false;
        return;
      }
      if (config.captcha.provider !== 'recaptcha') {
        block(CAPTCHA_UNAVAILABLE);
        return;
      }
      if (typeof config.captcha.siteKey !== 'string' || !config.captcha.siteKey.trim()) {
        block('Spam protection is not configured.');
        return;
      }
      recaptcha = await loadCaptcha();
      if (!recaptcha?.render) throw new Error('invalid reCAPTCHA API');
      captchaWidget = recaptcha.render(captchaContainer, {
        sitekey: config.captcha.siteKey,
        callback: token => {
          captchaToken = typeof token === 'string' ? token : '';
          status.textContent = '';
        },
        'expired-callback': () => clearCaptcha('The spam protection check expired. Please complete it again.'),
        'error-callback': () => clearCaptcha(CAPTCHA_UNAVAILABLE)
      });
      ready = true;
      button.disabled = false;
    } catch {
      block(CONFIG_ERROR);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!ready || button.disabled) return;
    status.textContent = '';
    if (captchaEnabled && !captchaToken) {
      status.textContent = 'Please complete the spam protection check.';
      return;
    }
    button.disabled = true;
    try {
      const response = await fetchImpl('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          category: form.elements.category.value,
          feedback: form.elements.feedback.value,
          replyEmail: form.elements.replyEmail.value,
          honeypot: form.elements.honeypot.value,
          captchaToken: captchaEnabled ? captchaToken : ''
        })
      });
      if (!response.ok) throw new Error('submit failed');
      redirect('feedback-thanks.html');
    } catch {
      if (captchaEnabled) {
        clearCaptcha();
        if (recaptcha?.reset && captchaWidget !== undefined) recaptcha.reset(captchaWidget);
      }
      status.textContent = 'Feedback could not be sent. Please try again later.';
      button.disabled = false;
    }
  }

  form.addEventListener('submit', submit);
  return { initialise, submit, getState: () => ({ captchaEnabled, captchaToken, captchaWidget, ready }) };
}

if (typeof document !== 'undefined') {
  const form = document.querySelector('.feedback-form');
  if (form) {
    const controller = createFeedbackController({
      form,
      status: document.getElementById('feedback-status'),
      button: form.querySelector('button[type="submit"]'),
      captchaContainer: document.getElementById('feedback-captcha'),
      fetchImpl: (...args) => fetch(...args),
      loadCaptcha: () => loadRecaptchaScript(document, window),
      redirect: url => window.location.assign(url)
    });
    controller.initialise();
  }
}
