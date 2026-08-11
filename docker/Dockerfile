# Statische Distillery-Website als nginx-Container.
# Kein Build-Schritt: die Dateien werden unveraendert ausgeliefert.
# Build-Kontext ist das Repo-Root: docker build -f docker/Dockerfile .
FROM nginxinc/nginx-unprivileged:alpine

ARG DEPLOY_TARGET=live

USER root
COPY docker/nginx.conf /tmp/nginx.live.conf
COPY docker/nginx.staging.conf /tmp/nginx.staging.conf
COPY . /usr/share/nginx/html
# Der Default bleibt LIVE. Nur der explizite Staging-Build ersetzt robots.txt,
# entfernt die LIVE-Sitemap und aktiviert die Staging-nginx-Konfiguration.
RUN case "$DEPLOY_TARGET" in \
        live) \
            cp /tmp/nginx.live.conf /etc/nginx/conf.d/default.conf \
            ;; \
        staging) \
            cp /tmp/nginx.staging.conf /etc/nginx/conf.d/default.conf && \
            cp /usr/share/nginx/html/robots.staging.txt /usr/share/nginx/html/robots.txt && \
            rm -f /usr/share/nginx/html/sitemap.xml \
            ;; \
        *) \
            echo "Unsupported DEPLOY_TARGET: $DEPLOY_TARGET" >&2; exit 1 \
            ;; \
    esac && \
    rm -f /usr/share/nginx/html/robots.staging.txt && \
    rm -f /tmp/nginx.live.conf /tmp/nginx.staging.conf && \
    rm -rf /usr/share/nginx/html/docker
USER nginx

EXPOSE 8080
