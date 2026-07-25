# Statische Distillery-Website als nginx-Container.
# Kein Build-Schritt: die Dateien werden unveraendert ausgeliefert.
# Build-Kontext ist das Repo-Root: docker build -f docker/Dockerfile .
FROM nginxinc/nginx-unprivileged:alpine

USER root
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
# docker/ liegt im Kontext, darf aber nicht ausgeliefert werden.
RUN rm -rf /usr/share/nginx/html/docker
USER nginx

EXPOSE 8080
