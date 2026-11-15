"""Disposable database for browser tests. Never touches the developer's database."""

import os
import signal
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="horion-e2e-") as directory:
    env = {
        **os.environ,
        "DATABASE_URL": f"sqlite:///{directory}/test.sqlite3",
        "DJANGO_DEBUG": "true",
        "DEMO_MODE": "true",
        "AUTH_PROVIDER": "django",
        "FILE_STORAGE": "local",
        "EDGE_API_KEY": "horion-e2e-edge-key",
        "HORION_MEDIA_ROOT": f"{directory}/media",
    }
    for args in [
        ["migrate", "--noinput"],
        ["seed_demo", "--password", "HorionDemo2026!"],
    ]:
        subprocess.run(
            [sys.executable, "manage.py", *args],
            cwd=root,
            env=env,
            check=True,
            stdout=subprocess.DEVNULL,
        )
    process = subprocess.Popen(
        [sys.executable, "manage.py", "runserver", "127.0.0.1:8011", "--noreload"],
        cwd=root,
        env=env,
    )

    def stop(*args):
        process.terminate()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    process.wait()
