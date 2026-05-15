#!/usr/bin/env bash
set -eo pipefail

APP_NAME="fund-web"
PID_FILE=".run.pid"
LOG_FILE=".run.log"
START_CMD="npm run dev"

is_running() {
  if [[ ! -f "$PID_FILE" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"

  if [[ -z "$pid" ]]; then
    rm -f "$PID_FILE"
    return 1
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    return 0
  fi

  rm -f "$PID_FILE"
  return 1
}

start() {
  local pid

  if is_running; then
    echo "$APP_NAME 已在运行（PID: $(cat "$PID_FILE")）。"
    return 0
  fi

  {
    echo ""
    echo "=== $(date '+%Y-%m-%d %H:%M:%S') 启动 $APP_NAME ==="
  } >> "$LOG_FILE"

  nohup bash -lc "exec $START_CMD" >> "$LOG_FILE" 2>&1 &
  pid=$!
  echo "$pid" > "$PID_FILE"

  sleep 2

  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "$APP_NAME 启动成功（PID: $pid）。"
    echo "日志文件：$LOG_FILE"
  else
    echo "$APP_NAME 启动失败，请查看日志：$LOG_FILE"
    rm -f "$PID_FILE"
    return 1
  fi
}

stop() {
  local pid

  if ! is_running; then
    echo "$APP_NAME 未运行。"
    rm -f "$PID_FILE"
    return 0
  fi

  pid="$(cat "$PID_FILE")"

  kill -TERM "$pid" >/dev/null 2>&1 || true

  for _ in {1..10}; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      rm -f "$PID_FILE"
      echo "$APP_NAME 已停止。"
      return 0
    fi
    sleep 1
  done

  echo "$APP_NAME 未能优雅停止，正在强制结束。"
  kill -9 "$pid" >/dev/null 2>&1 || true
  rm -f "$PID_FILE"
  echo "$APP_NAME 已停止。"
}

status() {
  if is_running; then
    echo "$APP_NAME 正在运行（PID: $(cat "$PID_FILE")）。"
    echo "日志文件：$LOG_FILE"
  else
    echo "$APP_NAME 未运行。"
  fi
}

restart() {
  stop
  start
}

usage() {
  echo "用法：$0 {start|stop|restart|status}"
}

case "${1:-}" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    restart
    ;;
  status)
    status
    ;;
  *)
    usage
    exit 1
    ;;
esac
