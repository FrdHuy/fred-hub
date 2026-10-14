#!/usr/bin/env python3
"""Local preview. Double-click 启动预览.command; keep its Terminal window open."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen
import errno
import sys
import threading
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
# 端口默认 57123；另一个工作目录同时预览时在命令后面写一个别的端口：python3 scripts/preview.py 57124
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 57123
URL = f'http://127.0.0.1:{PORT}/'


class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    handler = partial(PreviewHandler, directory=str(ROOT / 'dist'))
    try:
        server = ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    except OSError as error:
        if error.errno != errno.EADDRINUSE:
            raise
        try:
            with urlopen(URL, timeout=2) as response:
                ours = 'Fred’s Hub' in response.read(12000).decode('utf-8', errors='replace')
        except Exception:
            ours = False
        if ours:
            print('Fred’s Hub 已在运行，正在打开浏览器。', flush=True)
            webbrowser.open(URL)
            return
        print(f'{PORT} 端口被其他服务占用。请先关闭该服务后重试；不会自动终止其他进程。', flush=True)
        input('按回车退出。')
        return
    print(f'Fred’s Hub 已启动：{URL}\n保留此终端窗口。停止服务请按 Control+C。', flush=True)
    threading.Timer(0.3, lambda: webbrowser.open(URL)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n预览已停止。')
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
