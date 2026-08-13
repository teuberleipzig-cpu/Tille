import { randomUUID } from 'node:crypto';
import { validateFeedback } from './validation.js';
export class FeedbackService {
  constructor({ boardProvider, captchaProvider, captchaEnabled, now = () => new Date() }) { Object.assign(this, { boardProvider, captchaProvider, captchaEnabled, now }); }
  async submit(input) {
    const checked = validateFeedback(input, this.captchaEnabled);
    if (checked.honeypot) return { accepted: true, honeypot: true };
    if (checked.error) return { error: checked.error, status: 400 };
    if (this.captchaEnabled && !await this.captchaProvider.verify(checked.value.captchaToken)) return { error: 'captcha invalid', status: 400 };
    const feedback = { category: checked.value.category, feedback: checked.value.feedback, replyEmail: checked.value.replyEmail, receivedAt: this.now().toISOString(), requestId: randomUUID() };
    await this.boardProvider.createFeedback(feedback);
    return { accepted: true };
  }
}
