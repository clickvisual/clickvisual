# UI build stage
FROM node:20-alpine AS js-builder

ENV NODE_OPTIONS=--max_old_space_size=8000
WORKDIR /clickvisual
COPY ui/package.json ui/yarn.lock ./ui/
COPY ui/patches ./ui/patches
COPY ui-v2/package.json ui-v2/package-lock.json ./ui-v2/
RUN cd ui && yarn install --frozen-lockfile --network-timeout 100000
RUN cd ui-v2 && npm install
ENV NODE_ENV=production
COPY ui ./ui
COPY ui-v2 ./ui-v2
RUN cd ui && yarn build
RUN cd ui-v2 && npm run build


# API build stage
FROM golang:1.21.0-alpine3.17 AS go-builder
ARG GOPROXY=goproxy.cn

ENV GOPROXY=https://${GOPROXY},direct
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk add --no-cache make bash git tzdata

WORKDIR /clickvisual

COPY go.mod go.sum ./
RUN go mod download -x
COPY . .
COPY --from=js-builder /clickvisual/ui/dist ./api/internal/ui/dist
COPY --from=js-builder /clickvisual/ui-v2/api/internal/ui/v2dist/dist ./api/internal/ui/v2dist/dist
RUN ls -rlt ./api/internal/ui/dist && make build.api


# Fianl running stage
FROM alpine:3.17
LABEL maintainer="clickvisual@shimo.im"

WORKDIR /clickvisual

COPY --from=go-builder /clickvisual/bin/clickvisual ./bin/
COPY --from=go-builder /clickvisual/config ./config

EXPOSE 9001
EXPOSE 9003
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk --update add --no-cache tzdata

CMD ["sh", "-c", "./bin/clickvisual server"]
