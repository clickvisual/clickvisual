# UI build stage
FROM node:16-alpine3.14 as js-builder

ENV NODE_OPTIONS=--max_old_space_size=8000
WORKDIR /mogo
COPY ui/package.json ui/yarn.lock ./

RUN yarn install
ENV NODE_ENV production
COPY ui .
RUN yarn build


# API build stage
FROM golang:1.17.3-alpine3.14 as go-builder

ENV GOPROXY=https://goproxy.cn,direct
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk add --no-cache make bash git
WORKDIR /mogo

COPY go.mod go.sum ./
RUN go mod download -x
COPY scripts scripts
COPY api api
COPY Makefile Makefile
COPY --from=js-builder /mogo/dist ./api/internal/ui/dist
RUN ls -rlt ./api/internal/ui/dist && make build.api


# Fianl running stage
FROM alpine:3.14.3
LABEL maintainer="mogo@shimo.im"

WORKDIR /mogo

COPY --from=go-builder /mogo/bin/mogo ./bin/

EXPOSE 9001
EXPOSE 9003

CMD ["sh", "-c", "./bin/mogo"]
