#!/usr/bin/env bash
# Manage the Thirty One 31 backend + frontend as macOS LaunchAgents.
# They auto-start at login and auto-restart if they crash (KeepAlive).
#
#   ./services.sh status            # show both services + PIDs
#   ./services.sh restart           # restart BOTH (run this after `npm run build`)
#   ./services.sh restart-backend   # restart only the backend
#   ./services.sh restart-frontend  # restart only the frontend
#   ./services.sh stop              # stop + unload both (they won't come back until `start`)
#   ./services.sh start             # load + start both
#   ./services.sh logs              # tail both log files
#
# Ports: backend :4000, frontend :3000. Logs: Backend/launchd-backend.log, Frontend/launchd-frontend.log
set -e
UID_N=$(id -u)
ROOT="$(cd "$(dirname "$0")" && pwd)"
B="gui/$UID_N/com.t31.backend"
F="gui/$UID_N/com.t31.frontend"
BP="$HOME/Library/LaunchAgents/com.t31.backend.plist"
FP="$HOME/Library/LaunchAgents/com.t31.frontend.plist"

case "${1:-status}" in
  status)
    echo "PID     EXIT  LABEL"
    launchctl list | grep -E "com\.t31\." || echo "(no t31 agents loaded — run: $0 start)"
    echo "--- ports ---"
    lsof -nP -iTCP:4000 -sTCP:LISTEN >/dev/null 2>&1 && echo "backend  :4000 UP" || echo "backend  :4000 DOWN"
    lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1 && echo "frontend :3000 UP" || echo "frontend :3000 DOWN"
    ;;
  restart)          launchctl kickstart -k "$B"; launchctl kickstart -k "$F"; echo "restarted backend + frontend (new builds picked up)";;
  restart-backend)  launchctl kickstart -k "$B"; echo "backend restarted";;
  restart-frontend) launchctl kickstart -k "$F"; echo "frontend restarted";;
  stop)             launchctl bootout "$B" 2>/dev/null || true; launchctl bootout "$F" 2>/dev/null || true; echo "stopped + unloaded both";;
  start)
    launchctl bootstrap "gui/$UID_N" "$BP" 2>/dev/null || true
    launchctl bootstrap "gui/$UID_N" "$FP" 2>/dev/null || true
    echo "started both";;
  logs)             tail -n 30 -f "$ROOT/Backend/launchd-backend.log" "$ROOT/Frontend/launchd-frontend.log";;
  *) echo "usage: $0 {status|restart|restart-backend|restart-frontend|stop|start|logs}"; exit 1;;
esac
