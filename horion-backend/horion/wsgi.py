"""
WSGI config for horion project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "horion.settings")

application = get_wsgi_application()
