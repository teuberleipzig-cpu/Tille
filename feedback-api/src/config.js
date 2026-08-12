const bool = (value, fallback = false) => value === undefined ? fallback : value === 'true';
const integer = (value, fallback) => Number.isSafeInteger(Number(value)) ? Number(value) : fallback;

export function loadConfig(env = process.env) {
  return {
    port: integer(env.PORT, 3000),
    boardProvider: env.BOARD_PROVIDER || 'trello',
    captcha: {
      provider: env.CAPTCHA_PROVIDER || 'recaptcha',
      enabled: bool(env.RECAPTCHA_ENABLED),
      siteKey: env.RECAPTCHA_SITE_KEY || '',
      secretKey: env.RECAPTCHA_SECRET_KEY || ''
    },
    trello: {
      apiKey: env.TRELLO_API_KEY || '', token: env.TRELLO_API_TOKEN || '',
      categoryDestinations: {
        Einlass: env.TRELLO_LIST_ID_EINLASS || '', Bar: env.TRELLO_LIST_ID_BAR || '',
        Club: env.TRELLO_LIST_ID_CLUB || '', Awareness: env.TRELLO_LIST_ID_AWARENESS || '',
        Sonstiges: env.TRELLO_LIST_ID_SONSTIGES || ''
      },
      openLabelId: env.TRELLO_LABEL_ID_OPEN || '',
      replyRequestedLabelId: env.TRELLO_LABEL_ID_REPLY_REQUESTED || ''
    },
    rateLimit: { max: integer(env.RATE_LIMIT_MAX, 5), windowMs: integer(env.RATE_LIMIT_WINDOW_MS, 60000) },
    digest: {
      recipient: env.FEEDBACK_DIGEST_RECIPIENT || '', statePath: env.DIGEST_STATE_PATH || '',
      smtp: { host: env.SMTP_HOST || '', port: integer(env.SMTP_PORT, 587), user: env.SMTP_USER || '', password: env.SMTP_PASSWORD || '', from: env.SMTP_FROM || '' }
    }
  };
}
