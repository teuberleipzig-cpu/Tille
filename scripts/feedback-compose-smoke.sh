#!/usr/bin/env sh
set -eu
base=http://127.0.0.1:18083
curl --fail --silent "$base/feedback.html" >/dev/null
curl --fail --silent "$base/healthz" >/dev/null
curl --fail --silent "$base/api/feedback/config" | grep '"enabled":false' >/dev/null
! curl --fail --silent "$base/api/feedback/config" | grep -Eqi 'secret|token|password'
curl --fail --silent -X POST -H 'content-type: application/json' \
  --data '{"category":"Club","feedback":"Compose integration feedback","replyEmail":"","captchaToken":"","honeypot":""}' \
  "$base/api/feedback" | grep '"ok":true' >/dev/null
