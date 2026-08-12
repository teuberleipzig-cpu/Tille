# Feedback API

Node.js 22 service for health, public CAPTCHA configuration and feedback submission. It does not persist IP addresses or log request bodies, CAPTCHA tokens, feedback text or reply addresses.

Run `npm test`. The repository-root Compose file is a local/CI integration environment, not the current vps03 deployment. `.github/workflows/feedback-api-ci.yml` builds the API image and runs the stack with fake providers; it neither logs into a registry nor deploys anything.

For real www-test operation, the infrastructure owner must separately provide:

- a Feedback API container on vps03 and an internal network or reachable backend port;
- reverse-proxy routes for `/api/feedback` and its public config endpoint;
- server-side environment secrets and the five Trello category destinations/labels;
- the selected reCAPTCHA configuration and public v2 widget integration;
- feedback-scoped proxy rate limiting and an API health check;
- a real SMTP provider, persistent digest cursor and systemd timer/cron for `npm run digest`.

None of those server changes, and no modification to the external forced-deploy script, is performed by this branch.

## Trusted reverse proxy

`TRUST_PROXY=false` is the safe default for direct and local API operation: forwarded
client-address headers are ignored and the socket peer is used for rate limiting.
Set `TRUST_PROXY=true` only when a controlled nginx proxy overwrites `X-Real-IP` and
the Feedback API port is not directly reachable from the internet. With trusted-proxy
mode enabled, a missing or invalid `X-Real-IP` safely falls back to the socket peer.
The address remains memory-only, is never logged or persisted, and is not included in
board or CAPTCHA requests.
