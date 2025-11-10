# Expose the app module for tests which do `from webui import app as webapp`
from . import app as app
__all__ = ["app"]
