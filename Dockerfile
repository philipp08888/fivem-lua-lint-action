FROM minidocks/lua:latest

RUN apk add build-base

RUN luarocks install argparse && \
    luarocks install luafilesystem && \
    luarocks install luacheck

WORKDIR /workspace

COPY . .

RUN ls -la

RUN apk add --no-cache yarn nodejs && \
    yarn --prod --frozen-lockfile && \
    yarn install

ENTRYPOINT ["yarn", "build"]