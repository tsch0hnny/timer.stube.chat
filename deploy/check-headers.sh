#!/usr/bin/env bash
# Asserts the caching and MIME rules of deploy/nginx/default.conf against a running server.
# Works for the spike and the gig build, locally, in CI, and against test-timer.stube.chat.
# Usage: deploy/check-headers.sh https://test-timer.stube.chat
set -uo pipefail
BASE="${1:?usage: check-headers.sh <base-url>}"
fail=0

hdr() { curl -s -o /dev/null -D - "$BASE$1" | tr -d '\r'; }
status() { hdr "$1" | awk 'NR==1{print $2}'; }
header() { hdr "$1" | awk -v h="$(echo "$2" | tr 'A-Z' 'a-z')" -F': ' 'tolower($1)==h{sub(/^[^:]*: /,""); print; exit}'; }

expect() { # path, header, expected substring (or "<absent>")
  local got; got="$(header "$1" "$2")"
  if [[ "$3" == "<absent>" && -z "$got" ]] || [[ "$3" != "<absent>" && "$got" == *"$3"* ]]; then
    printf '  PASS  %-28s %-14s %s\n' "$1" "$2" "${got:-<absent>}"
  else
    printf '  FAIL  %-28s %-14s got "%s", want "%s"\n' "$1" "$2" "$got" "$3"; fail=1
  fi
}
expect_status() {
  local got; got="$(status "$1")"
  if [[ "$got" == "$2" ]]; then printf '  PASS  %-28s status         %s\n' "$1" "$got"
  else printf '  FAIL  %-28s status         got %s, want %s\n' "$1" "$got" "$2"; fail=1; fi
}

echo "Checking $BASE"
expect_status /                     200
expect /                            Cache-Control "no-cache"
expect /index.html                  Cache-Control "no-cache"
expect /sw.js                       Cache-Control "no-store"
expect /sw.js                       Content-Type  "javascript"
expect /manifest.webmanifest        Content-Type  "application/manifest+json"
expect /manifest.webmanifest        Cache-Control "no-cache"
expect /                            X-Content-Type-Options "nosniff"
expect_status /no-such-file.js      404
expect_status /_nuxt/no-such.js     404
expect /_nuxt/no-such.js            Cache-Control "<absent>"

# Gig build only: a real hashed asset referenced by the HTML must be cached long and immutable.
asset="$(curl -s "$BASE/" | grep -o '/_nuxt/[^"]*\.js' | head -1 || true)"
if [[ -n "$asset" ]]; then
  expect_status "$asset" 200
  expect "$asset" Cache-Control "max-age=31536000, immutable"
else
  echo "  info  no /_nuxt/ asset in the HTML (spike): skipped the immutable-asset check"
fi

[[ $fail -eq 0 ]] && echo "headers OK" || echo "header checks FAILED"
exit $fail
