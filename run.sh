#!/usr/bin/env bash
set -uo pipefail

APP_NAME="fund-web"
PID_FILE=".run.pid"
LOG_FILE=".run.log"
START_CMD="npm run dev"

is_running() {
  if [[ ! -f "$PID_FILE" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "$PID_FILE")"

  if [[ -z "$pid" ]]; then
    return 1
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    return 0
  fi

  rm -f "$PID_FILE"
  return 1
}

start() {
  if is_running; then
    echo "$APP_NAME 已在运行（PID: $(cat "$PID_FILE")）。"
    return 0
  fi

  # 追加日志并添加时间戳分割线，避免覆盖历史日志
  {
    echo ""
    echo "=== $(date '+%Y-%m-%d %H:%M:%S') 启动 $APP_NAME ==="
  } >> "$LOG_FILE"

  # 使用 exec 替换 shell 进程，确保 $! 直接追踪到 npm 而非 bash wrapper
  # 解决原脚本 kill bash 后 next dev 子进程成为孤儿、端口被占用的问题
  nohup bash -lc 'exec npm run dev' >> "$LOG_FILE" 2>&1 &
  local pid=$!
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
  if ! is_running; then
    echo "$APP_NAME 未运行。"
    rm -f "$PID_FILE"
    return 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"

  # 先尝试向整个进程组发送 SIGTERM（负号表示进程组）
  if kill -TERM -"$pid" >/dev/null 2>&1; then
    :
  else
    kill -TERM "$pid" >/dev/null 2>&1 || true
  fi

  for _ in {1..10}; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      rm -f "$PID_FILE"
      echo "$APP_NAME 已停止。"
      return 0
    fi
    sleep 1
  done

  # 强制终止进程组
  echo "$APP_NAME 未能优雅停止，正在强制结束。"
  kill -9 -"$pid" >/dev/null 2>&1 || kill -9 "$pid" >/dev/null 2>&1 || true

  # 兜底：清理可能残留的 next dev 进程，防止端口占用
  pkill -f "next dev" >/dev/null 2>&1 || true

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

logs() {
  if [[ -f "$LOG_FILE" ]]; then
    tail -f "$LOG_FILE"
  else
    echo "日志文件不存在：$LOG_FILE"
    return 1
  fi
}

restart() {
  stop
  start
}

usage() {
  echo "用法：$0 {start|stop|restart|status|logs}"
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
  logs)
    logs
    ;;
  *)
    usage
    exit 1
    ;;
esac
