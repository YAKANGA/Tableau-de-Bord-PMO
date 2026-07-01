from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from http.server import BaseHTTPRequestHandler


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import DEFAULT_EXCEL_PATH, load_workbook_data  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        excel_path = Path(os.environ.get("PMO_EXCEL_PATH", str(DEFAULT_EXCEL_PATH)))
        payload = load_workbook_data(excel_path)
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(200 if payload.get("ok", True) else 404)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
