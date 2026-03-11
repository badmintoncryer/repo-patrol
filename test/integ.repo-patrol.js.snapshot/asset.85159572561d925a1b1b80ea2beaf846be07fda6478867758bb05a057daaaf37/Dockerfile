FROM --platform=linux/arm64 node:22-slim AS builder

RUN npm install -g pnpm@9

WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM --platform=linux/arm64 node:22-slim AS runner

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4-aarch64 /lambda-adapter /opt/extensions/lambda-adapter

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
COPY --from=builder /app/fetch-secrets.js ./fetch-secrets.js
RUN chmod +x ./entrypoint.sh

ENV PORT=3000
ENV AWS_LWA_INVOKE_MODE=response_stream
ENV HOSTNAME=0.0.0.0

CMD ["./entrypoint.sh"]
