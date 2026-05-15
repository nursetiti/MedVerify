"""
Lightweight Squad payment proxy for local development.

Run from the ML directory:
    python payment_server.py

Required environment:
    SQUAD_SECRET_KEY=sandbox_sk_...
Optional:
    SQUAD_ENV=sandbox
    SQUAD_API_BASE_URL=https://sandbox-api-d.squadco.com
"""

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import unquote
from urllib.request import ProxyHandler, Request, build_opener


PORT = int(os.getenv("PORT", "8000"))
SQUAD_ENV = os.getenv("SQUAD_ENV", "sandbox").lower()
SQUAD_BASE_URL = os.getenv(
    "SQUAD_API_BASE_URL",
    "https://api-d.squadco.com" if SQUAD_ENV == "production" else "https://sandbox-api-d.squadco.com",
)
SQUAD_SECRET_KEY = (os.getenv("SQUAD_SECRET_KEY") or "").strip().strip("'\"")


def send_squad_request(method, path, payload=None):
    if not SQUAD_SECRET_KEY:
        return 503, {"detail": "SQUAD_SECRET_KEY is not configured for payment_server.py."}

    if not SQUAD_SECRET_KEY.startswith(("sandbox_sk_", "sk_")):
        return 503, {
            "detail": "SQUAD_SECRET_KEY must be a Squad secret key, not a public key. Sandbox keys usually start with sandbox_sk_.",
        }

    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(
        f"{SQUAD_BASE_URL.rstrip('/')}/{path.lstrip('/')}",
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {SQUAD_SECRET_KEY}",
            "Content-Type": "application/json",
        },
    )

    opener = build_opener(ProxyHandler({}))

    try:
        with opener.open(request, timeout=30) as response:
            response_body = response.read().decode("utf-8")
            return response.status, json.loads(response_body or "{}")
    except HTTPError as error:
        response_body = error.read().decode("utf-8")
        try:
            return error.code, json.loads(response_body or "{}")
        except json.JSONDecodeError:
            return error.code, {"detail": response_body or "Squad request failed"}
    except URLError as error:
        return 502, {"detail": f"Unable to reach Squad: {error.reason}"}


class PaymentHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.write_json(200, {"status": "ok", "service": "MedVerify payment proxy"})
            return

        prefix = "/payments/squad/verify/"
        if self.path.startswith(prefix):
            transaction_ref = unquote(self.path[len(prefix):])
            status, payload = send_squad_request(
                "GET",
                f"/transaction/verify/{transaction_ref}",
            )
            self.write_json(status, payload)
            return

        self.write_json(404, {"detail": "Not found"})

    def do_POST(self):
        payload = self.read_json()

        if self.path == "/payments/squad/initiate":
            payload["initiate_type"] = "inline"
            status, response = send_squad_request("POST", "/transaction/initiate", payload)
            self.write_json(status, response)
            return

        if self.path == "/payments/squad/account-lookup":
            status, response = send_squad_request("POST", "/payout/account/lookup", payload)
            self.write_json(status, response)
            return

        if self.path == "/payments/squad/transfer":
            status, response = send_squad_request("POST", "/payout/transfer", payload)
            self.write_json(status, response)
            return

        self.write_json(404, {"detail": "Not found"})

    def read_json(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length == 0:
            return {}

        try:
            return json.loads(self.rfile.read(content_length).decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    def write_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    print(f"MedVerify payment proxy running on http://localhost:{PORT}")
    print(f"Squad base URL: {SQUAD_BASE_URL}")
    HTTPServer(("0.0.0.0", PORT), PaymentHandler).serve_forever()
