#!/bin/sh
set -e

# Fetch secrets from Secrets Manager and set as env vars before starting Next.js
node /app/fetch-secrets.js

exec node server.js
