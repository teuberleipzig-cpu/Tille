export const CATEGORIES = ['Einlass', 'Bar', 'Club', 'Awareness', 'Sonstiges'];
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateFeedback(input, captchaEnabled) {
  const category = typeof input.category === 'string' ? input.category.trim() : '';
  const feedback = typeof input.feedback === 'string' ? input.feedback.trim() : '';
  const replyEmail = typeof input.replyEmail === 'string' ? input.replyEmail.trim() : '';
  const captchaToken = typeof input.captchaToken === 'string' ? input.captchaToken : '';
  const honeypot = typeof input.honeypot === 'string' ? input.honeypot : '';
  if (honeypot) return { honeypot: true };
  if (!CATEGORIES.includes(category)) return { error: 'invalid category' };
  if (feedback.length < 3 || feedback.length > 10000) return { error: 'invalid feedback' };
  if (replyEmail.length > 254 || (replyEmail && !email.test(replyEmail))) return { error: 'invalid reply email' };
  if (captchaEnabled && !captchaToken) return { error: 'captcha required' };
  return { value: { category, feedback, replyEmail, captchaToken } };
}
