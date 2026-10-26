import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Ensure UTF-8 output on Windows consoles
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
PORT = 8080
HOST = '0.0.0.0'

class SPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        clean_path = self.path.split('?')[0].split('#')[0].lstrip('/')
        file_path = os.path.join(DIST_DIR, clean_path)

        # Serve static assets if they exist
        if clean_path and os.path.isfile(file_path):
            return super().do_GET()

        # If it's a directory with index.html
        if os.path.isdir(file_path) and os.path.isfile(os.path.join(file_path, 'index.html')):
            return super().do_GET()

        # Fallback to SPA index.html for client-side routing (/pickle-admin, etc.)
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        index_file = os.path.join(DIST_DIR, 'index.html')
        if os.path.exists(index_file):
            with open(index_file, 'rb') as f:
                content = f.read()
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_error(404, "dist/index.html not found.")

    def log_message(self, format, *args):
        sys.stdout.write(f"[{self.log_date_time_string()}] {self.client_address[0]} - {format % args}\n")
        sys.stdout.flush()

def main():
    if not os.path.exists(DIST_DIR):
        print(f"Error: {DIST_DIR} not found. Please run 'npm run build' first.")
        sys.exit(1)

    server = HTTPServer((HOST, PORT), SPAHandler)
    print("=" * 60)
    print(" PicklePoint Python HTTP Server (SPA & External IP Access)")
    print("=" * 60)
    print(f" Serving Directory : {DIST_DIR}")
    print(f" Listening Address : {HOST}:{PORT}")
    print(f" Local Access      : http://localhost:{PORT}")
    print(f" Wi-Fi IP Access   : http://10.65.13.35:{PORT}")
    print(f" Admin Dashboard   : http://10.65.13.35:{PORT}/pickle-admin")
    print(f" Tailscale Access  : http://100.76.185.34:{PORT}")
    print("=" * 60)
    print(" Ready for connections from mobile and tablet on your network...")
    print(" Press Ctrl+C to stop the server.")
    print("=" * 60)
    sys.stdout.flush()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.server_close()

if __name__ == '__main__':
    main()

