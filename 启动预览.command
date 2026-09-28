#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  echo '未找到 Python 3。请安装 Python 3 后重试。'
  read -r '?按回车关闭。'
  exit 1
fi
exec python3 scripts/preview.py
