"""Example transport for the FastAPI side of Horion Edge."""

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
parser = argparse.ArgumentParser()
parser.add_argument("--astronaut", required=True)
parser.add_argument("--base-url", default="http://127.0.0.1:8000")
parser.add_argument("--send", action="store_true")
parser.add_argument("--pull", action="store_true")
args = parser.parse_args()
headers = {"X-Edge-Key": os.getenv("EDGE_API_KEY", "")}
if args.pull:
    response = requests.get(
        f"{args.base_url}/api/v1/sync/updates/",
        params={"codigo_astronauta": args.astronaut},
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
else:
    payload = {
        "codigo_astronauta": args.astronaut,
        "registros": [
            {
                "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                "frecuencia_cardiaca": 72,
                "spo2": "98.10",
                "hrv": "48.20",
                "temperatura_corporal": "36.60",
                "horas_sueno": "7.20",
            }
        ],
        "alertas": [],
        "orbi": [],
    }
    canonical = json.dumps(
        payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    )
    body = {
        "payload": payload,
        "hash_sha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
    }
    if args.send:
        if not headers["X-Edge-Key"]:
            parser.error("Configura EDGE_API_KEY antes de enviar.")
        response = requests.post(
            f"{args.base_url}/api/v1/sync/ingest/",
            json=body,
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()
        print(json.dumps(response.json(), indent=2))
    else:
        print(json.dumps(body, ensure_ascii=False, indent=2))
