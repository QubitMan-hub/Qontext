"""A quiet local HTTP server for dist/, used by the browser tests, the performance check and the film.

Pages are served over HTTP rather than opened as files, so the browser applies the same rules (origin,
Content Security Policy) it does in production.
"""

import functools
import http.server
import sys
import threading


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class _Server(http.server.ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        # Browsers cancel media downloads they no longer need; that is not an error worth printing.
        if not isinstance(sys.exc_info()[1], ConnectionError):
            super().handle_error(request, client_address)


def serve(directory):
    """Starts serving `directory` on a free port. Returns the server; its base URL is `base_url(server)`."""
    handler = functools.partial(_Quiet, directory=str(directory))
    httpd = _Server(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def base_url(httpd):
    return f"http://127.0.0.1:{httpd.server_address[1]}"
