FROM node:20-alpine

RUN apk add --no-cache bash curl build-base lua5.4 lua5.4-dev

RUN curl -R -O https://luarocks.org/releases/luarocks-3.9.2.tar.gz \
 && tar zxpf luarocks-3.9.2.tar.gz \
 && cd luarocks-3.9.2 \
 && ./configure --lua-version=5.4 --with-lua-include=/usr/include/lua5.4 \
 && make \
 && make install

RUN which luarocks

RUN luarocks install argparse \
 && luarocks install luafilesystem \
 && luarocks install luacheck

RUN npm install -g pnpm

WORKDIR /workspace

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile --prod

COPY . .

RUN pnpm build

ENTRYPOINT ["pnpm", "start"]
