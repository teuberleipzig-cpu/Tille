# Board provider boundary

Business logic uses only `createFeedback(feedback)` and `countNewFeedbackSince(timestamp)`. The latter returns `{ total, categories }` for the five public categories.

`TrelloProvider` is the current adapter. Only it knows the Trello HTTP API, credentials, list identifiers and labels. `NextcloudDeckProvider` is intentionally a stub; a later adapter maps the same category destinations to Deck stacks. Validation, CAPTCHA, rate limiting, frontend, digest aggregation and the API contract must remain unchanged.

Provider-specific environment variables are listed in `.env.example`. The weekly cursor belongs in server-side persistent storage configured by `DIGEST_STATE_PATH`; SMTP delivery and systemd timer/cron installation remain deployment work.
