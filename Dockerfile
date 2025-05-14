ARG RESOURCES_PATH
ENV RESOURCES_PATH=$RESOURCES_PATH

ARG IGNORED_SCRIPTS
ENV IGNORED_SCRIPTS=$IGNORED_SCRIPTS

FROM evandarwin/lua:latest
RUN luarocks install argparse && \
    luarocks install luafilesystem && \
    luarocks install luacheck
RUN mkdir -p /luacheck-fivem
ADD . /luacheck-fivem/
RUN apk add --no-cache yarn nodejs && \
    cd /luacheck-fivem/ && \
    yarn --prod --frozen-lockfile && yarn build && \
    chmod +x /luacheck-fivem/.docker/entrypoint.sh 
ENTRYPOINT ["/luacheck-fivem/.docker/entrypoint.sh"]