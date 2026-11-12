# Device spike: plain static files behind the same nginx config the gig build uses.
# Build context is the repo root:  docker compose -f spike/compose.yaml up -d --build
FROM nginx:1.30-alpine
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY spike/public/ /usr/share/nginx/html/
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO /dev/null http://127.0.0.1/ping.txt || exit 1
