"""
ASGI config for horion project.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "horion.settings")

application = get_asgi_application()
