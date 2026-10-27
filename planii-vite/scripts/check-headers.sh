#!/usr/bin/env sh
# Verifies the security headers actually served for the web app (image or public entry point).
# Usage: scripts/check-headers.sh https://app.example.com
# Run it against the Nginx container AND the public URL: both must pass with the same result (PLANI-030 / PLANI-026).
set -eu
url="${1:?usage: check-headers.sh <url>}"
headers="$(curl -fsS -o /dev/null -D - "$url/")"
fail=0
check() { # description, regex
  if printf '%s\n' "$headers" | tr -d '\r' | grep -iEq "$2"; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi
}
absent() { # description, regex
  if printf '%s\n' "$headers" | tr -d '\r' | grep -iEq "$2"; then echo "FAIL $1"; fail=1; else echo "ok   $1"; fi
}
check  "CSP present"                         '^content-security-policy:'
check  "script-src opens only self + Jitsi"  "^content-security-policy:.*script-src 'self' https://meet\.jit\.si;"
check  "frame-src limited to Jitsi"          '^content-security-policy:.*frame-src https://meet\.jit\.si;'
absent "no wildcard in CSP"                  '^content-security-policy:.*[ :]\*[ ;]'
absent "no unsafe-eval"                      '^content-security-policy:.*unsafe-eval'
check  "camera delegated to Jitsi only"      '^permissions-policy:.*camera=\("https://meet\.jit\.si"\)'
check  "microphone: self + Jitsi"            '^permissions-policy:.*microphone=\(self "https://meet\.jit\.si"\)'
check  "X-Content-Type-Options"              '^x-content-type-options: nosniff'
check  "HSTS"                                '^strict-transport-security:'
exit "$fail"
