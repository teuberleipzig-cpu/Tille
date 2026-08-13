import { CaptchaProvider } from './captcha-provider.js';
export class RecaptchaProvider extends CaptchaProvider {
  constructor(secretKey, fetchImpl = fetch) { super(); this.secretKey = secretKey; this.fetch = fetchImpl; }
  async verify(token) {
    if (!this.secretKey) return false;
    const body = new URLSearchParams({ secret: this.secretKey, response: token });
    const response = await this.fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body, signal: AbortSignal.timeout(5000) });
    return response.ok && Boolean((await response.json()).success);
  }
}
