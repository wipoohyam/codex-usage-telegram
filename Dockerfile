FROM node:22-bookworm-slim

ARG CODEX_VERSION=0.154.0-alpha.6.2

RUN npm install --global "@openai/codex@${CODEX_VERSION}" \
    && npm cache clean --force

WORKDIR /app

COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

RUN mkdir -p /home/node/.codex /app/data \
    && chown -R node:node /home/node/.codex /app/data

USER node

ENV CODEX_HOME=/home/node/.codex \
    STATE_FILE=/app/data/state.json \
    NODE_ENV=production

VOLUME ["/home/node/.codex", "/app/data"]

ENTRYPOINT ["node", "src/cli.js"]
CMD ["monitor"]
