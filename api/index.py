from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STATIC_DIR = ROOT / "static"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pmo_core import DEFAULT_EXCEL_PATH, generate_template, load_workbook_data  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if path == "/api/dashboard":
            excel_path = Path(os.environ.get("PMO_EXCEL_PATH", str(DEFAULT_EXCEL_PATH)))
            self.send_json(load_workbook_data(excel_path))
            return

        if path == "/api/template":
            self.send_file(
                generate_template(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "modele_pmo.xlsx",
            )
            return

        requested = "index.html" if path in ("", "/") else path.lstrip("/")
        file_path = (STATIC_DIR / requested).resolve()
        if not str(file_path).startswith(str(STATIC_DIR.resolve())) or not file_path.exists():
            file_path = STATIC_DIR / "index.html"

        content_type = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
        }.get(file_path.suffix, "application/octet-stream")
        self.send_bytes(file_path.read_bytes(), content_type, {"Cache-Control": "no-store"})

    def send_json(self, payload: dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_bytes(
            body,
            "application/json; charset=utf-8",
            {"Cache-Control": "no-store"},
            200 if payload.get("ok", True) else 404,
        )

    def send_file(self, body: bytes, content_type: str, filename: str) -> None:
        self.send_bytes(
            body,
            content_type,
            {
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Cache-Control": "no-store",
            },
        )

    def send_bytes(
        self,
        body: bytes,
        content_type: str,
        extra_headers: dict[str, str] | None = None,
        status: int = 200,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        for key, value in (extra_headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)
