import { FeedbackService } from './feedback/feedback-service.js';
const json = (res, status, value) => { const body = JSON.stringify(value); res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) }); res.end(body); };
export function createHandler({ config, boardProvider, captchaProvider, rateLimit, logger = console }) {
  const service = new FeedbackService({ boardProvider, captchaProvider, captchaEnabled: config.captcha.enabled });
  return async function handler(req, res) {
    const started = Date.now();
    try {
      if (req.url === '/healthz' && req.method === 'GET') return json(res, 200, { ok: true });
      if (req.url === '/api/feedback/config' && req.method === 'GET') return json(res, 200, { captcha: { provider: config.captcha.provider, enabled: config.captcha.enabled, siteKey: config.captcha.siteKey } });
      if (req.url !== '/api/feedback') return json(res, 404, { ok: false, error: 'not found' });
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' });
      if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return json(res, 415, { ok: false, error: 'content type must be application/json' });
      const ip = req.socket.remoteAddress || 'unknown';
      if (!rateLimit.allow(ip)) return json(res, 429, { ok: false, error: 'too many requests' });
      let size = 0, raw = '';
      for await (const chunk of req) { size += chunk.length; if (size > 32768) return json(res, 413, { ok: false, error: 'request too large' }); raw += chunk; }
      let input; try { input = JSON.parse(raw); } catch { return json(res, 400, { ok: false, error: 'invalid json' }); }
      const result = await service.submit(input);
      if (result.error) return json(res, result.status, { ok: false, error: result.error });
      return json(res, 201, { ok: true });
    } catch (error) {
      logger.error({ route: req.url, status: 503, errorClass: error.constructor.name, durationMs: Date.now() - started });
      return json(res, 503, { ok: false, error: 'feedback service temporarily unavailable' });
    }
  };
}
