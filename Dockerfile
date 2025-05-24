FROM minidocks/lua:latest

RUN apk add build-base

RUN apk add --no-cache nodejs npm && \
    npm install -g pnpm

RUN luarocks install argparse \
 && luarocks install luafilesystem \
 && luarocks install luacheck

WORKDIR /github/workspace

COPY . .

RUN pnpm install --frozen-lockfile --prod

RUN echo "== /github/workspace ==" && ls -la /github/workspace

ENTRYPOINT ["sh", "-c", "ls -la /github/workspace && node ./dist/index.js"]
