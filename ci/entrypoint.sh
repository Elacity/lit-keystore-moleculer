#!/bin/sh
umask 011

node=$(which node)

if [ ! -z "${NODE_MEMORY_LIMIT}" ]; then 
  node="${node} --max_old_space_size=${NODE_MEMORY_LIMIT}"
fi

if [ "$TRACE_GC" = "on" ]; then 
  node="${node} --trace_gc"
fi

if [ "$DEBUG" = "on" ]; then 
  node="${node} --trace_gc --inspect"
fi

if [ ! -z "$NODE_OPTS" ]; then 
  node="${node} ${NODE_OPTS}"
fi

$node --loader ts-node/esm ./node_modules/moleculer/bin/moleculer-runner.mjs --config moleculer.config.ts "$@"