FROM minidocks/lua:latest

RUN apk add build-base

RUN apk add --no-cache nodejs npm && \
    npm install -g pnpm

RUN luarocks install argparse \
 && luarocks install luafilesystem \
 && luarocks install luacheck

WORKDIR /workspace

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm build

RUN ls -la ./dist

ENTRYPOINT ["node", "./dist/index.js"]
