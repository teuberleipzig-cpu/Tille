# Statische Distillery-Website als nginx-Container.
# Kein Build-Schritt: die Dateien werden unveraendert ausgeliefert.
# Build-Kontext ist der validierte composed-site, nicht der Public-Webroot.
FROM nginxinc/nginx-unprivileged:alpine

ARG DEPLOY_TARGET=live

USER root
COPY docker/nginx.conf /tmp/nginx.live.conf
COPY docker/nginx.staging.conf /tmp/nginx.staging.conf
COPY robots.staging.txt /tmp/robots.staging.txt
# Remove only the base image's default pages, before publishing our allowlist.
RUN rm -rf /usr/share/nginx/html && mkdir -p /usr/share/nginx/html
# Positive publish boundary. Keep aligned with tests/helpers/public-webroot.mjs.
COPY *.html robots.txt sitemap.xml site.webmanifest favicon.svg /usr/share/nginx/html/
COPY .well-known/security.txt /usr/share/nginx/html/.well-known/security.txt
COPY assets/ /usr/share/nginx/html/assets/
COPY events/ /usr/share/nginx/html/events/
COPY news/ /usr/share/nginx/html/news/
COPY residents/ /usr/share/nginx/html/residents/
COPY public/admin/*.html public/admin/*.js /usr/share/nginx/html/public/admin/
COPY public/admin/css/ /usr/share/nginx/html/public/admin/css/
COPY public/admin/js/ /usr/share/nginx/html/public/admin/js/
COPY public/admin/extensions/ /usr/share/nginx/html/public/admin/extensions/
COPY public/admin/public/ /usr/share/nginx/html/public/admin/public/
COPY public/resident-portal/ /usr/share/nginx/html/public/resident-portal/
COPY public/events/ /usr/share/nginx/html/public/events/
COPY public/residents/ /usr/share/nginx/html/public/residents/
COPY public/gallery/ /usr/share/nginx/html/public/gallery/
COPY public/site/ /usr/share/nginx/html/public/site/
# Der Default bleibt LIVE. Nur der explizite Staging-Build ersetzt robots.txt,
# entfernt die LIVE-Sitemap und aktiviert die Staging-nginx-Konfiguration.
RUN case "$DEPLOY_TARGET" in \
        live) \
            cp /tmp/nginx.live.conf /etc/nginx/conf.d/default.conf \
            ;; \
        staging) \
            cp /tmp/nginx.staging.conf /etc/nginx/conf.d/default.conf && \
            cp /tmp/robots.staging.txt /usr/share/nginx/html/robots.txt && \
            rm -f /usr/share/nginx/html/sitemap.xml \
            ;; \
        *) \
            echo "Unsupported DEPLOY_TARGET: $DEPLOY_TARGET" >&2; exit 1 \
            ;; \
    esac && \
    rm -f /tmp/robots.staging.txt /tmp/nginx.live.conf /tmp/nginx.staging.conf
USER nginx

EXPOSE 8080
