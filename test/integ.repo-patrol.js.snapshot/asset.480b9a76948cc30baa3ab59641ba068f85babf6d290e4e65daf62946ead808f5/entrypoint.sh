#!/bin/sh
set -e

# Fetch secrets from Secrets Manager and write to /tmp/secrets.env
node /app/fetch-secrets.js

# Export secrets as environment variables for Next.js server
if [ -f /tmp/secrets.env ]; then
  set -a
  . /tmp/secrets.env
  set +a
fi

exec node server.js
