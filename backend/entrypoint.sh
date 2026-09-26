#!/bin/sh
# Entrypoint tolerante al Start Command de la plataforma:
# - sin args -> cmd por defecto
# - ["sh","-c","..."] -> se ejecuta tal cual (expande $PORT)
# - cualquier otra forma exec -> se une y ejecuta vía sh -c para expandir $PORT
set -e

if [ "$#" -eq 0 ]; then
  exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
fi

case "$1" in
  sh|/bin/sh|bash|/bin/bash)
    exec "$@"
    ;;
  *)
    exec sh -c "$*"
    ;;
esac
