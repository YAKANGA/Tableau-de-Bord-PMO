from __future__ import annotations

import sys
from pathlib import Path
from http.server import BaseHTTPRequestHandler


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import generate_template  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        body = generate_template()
        self.send_response(200)
        self.send_header(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.send_header("Content-Disposition", 'attachment; filename="modele_pmo.xlsx"')
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
