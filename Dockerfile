FROM node:20-alpine

RUN apk add --no-cache build-base lua5.4 lua5.4-dev luarocks

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
