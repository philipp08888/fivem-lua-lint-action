FROM evandarwin/lua:latest

RUN luarocks install argparse && \
    luarocks install luafilesystem && \
    luarocks install luacheck

WORKDIR /workspace

COPY . .

RUN apk add --no-cache yarn nodejs && \
    yarn --prod --frozen-lockfile && \
    chmod +x lint_files.sh

ENTRYPOINT ["sh", "lint_files.sh"]