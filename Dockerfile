ARG RESOURCES_PATH
ARG IGNORED_SCRIPTS

FROM evandarwin/lua:latest

ENV RESOURCES_PATH=${RESOURCES_PATH}
ENV IGNORED_SCRIPTS=${IGNORED_SCRIPTS}

RUN luarocks install argparse && \
    luarocks install luafilesystem && \
    luarocks install luacheck

RUN mkdir -p /luacheck-fivem

ADD . /luacheck-fivem/

RUN apk add --no-cache yarn nodejs && \
    cd /luacheck-fivem/ && \
    yarn --prod --frozen-lockfile && \
    RESOURCES_PATH=${RESOURCES_PATH} IGNORED_SCRIPTS=${IGNORED_SCRIPTS} yarn build && \
    chmod +x /luacheck-fivem/.docker/entrypoint.sh

ENTRYPOINT ["/luacheck-fivem/.docker/entrypoint.sh"]