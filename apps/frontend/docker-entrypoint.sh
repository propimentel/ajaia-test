#!/bin/sh
set -eu

# Substitute ${BACKEND_URL} and ${PORT} in the nginx template at runtime.
# The template is at /etc/nginx/templates/default.conf.template; nginx's
# official image runs envsubst on these automatically when the directory
# /etc/nginx/templates/ exists, but we do it explicitly here for clarity
# and to also rewrite the listen port.

export BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
export PORT="${PORT:-8080}"

mkdir -p /etc/nginx/conf.d
envsubst '${BACKEND_URL} ${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec "$@"
