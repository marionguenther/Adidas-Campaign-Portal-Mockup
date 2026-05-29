# --- Stage 1: build the Angular app ---
FROM node:20-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY libs/shared-types/package.json libs/shared-types/
COPY apps/wf-timeline-widget/package.json apps/wf-timeline-widget/

RUN npm install --workspaces --include-workspace-root \
    --workspace=@wf/shared-types --workspace=wf-timeline-widget \
    --no-audit --no-fund --ignore-scripts

COPY tsconfig.base.json ./
COPY libs/shared-types libs/shared-types/
COPY apps/wf-timeline-widget apps/wf-timeline-widget/

RUN npm run build -w wf-timeline-widget

# --- Stage 2: nginx serving the static bundle + proxying /api & /auth ---
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# OpenShift compatibility: image must run as non-root and listen on >1024.
# nginx-unprivileged listens on 8080 by default and runs as UID 101.
COPY --chown=101:0 apps/wf-timeline-widget/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:0 /workspace/apps/wf-timeline-widget/dist/browser /usr/share/nginx/html

# Ensure arbitrary OpenShift UIDs (root group) can read/write where needed.
USER 0
RUN chgrp -R 0 /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx \
    && chmod -R g=u /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx
USER 101

EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
