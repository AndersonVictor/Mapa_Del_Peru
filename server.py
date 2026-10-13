"""Servidor 100% local: sirve el mapa desde cache_tiles/ y los textos desde datos.xlsx.
NO consulta al INEI mientras navegas.  Uso:  python server.py  ->  http://localhost:8000

Antes, una sola vez, descarga todo con:  python descargar_todo.py
Las funciones de descarga (token, fetch_tile, fetch_tooltip) solo las usan los scripts
descargar_todo.py y actualizar_excel.py.
"""
import json, re, threading, time, urllib.request, urllib.error
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).parent
PORT = 8000
EXCEL = ROOT / "datos.xlsx"
TILE_DIR = ROOT / "cache_tiles"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/155.0.0.0 Safari/537.36"
SITE = "https://censos2025.inei.gob.pe"
TILES = ("https://geoservercpv2025.inei.gob.pe/geoserver/gwc/service/tms/1.0.0/"
         "cpv_resultados_v2:limites_administrativos_v2@EPSG%3A900913@pbf/{z}/{x}/{y}.pbf")
# Columnas del Excel = campos que devuelve el tooltip del INEI
COLUMNAS = ["id_geografia", "nombregion", "nombprov", "nombdist", "nombAmbito",
            "indicador", "dato", "hombre", "mujer", "densidad"]

_tok = {"v": None, "exp": 0}
_lock = threading.Lock()
_tile_cache = {}
_tip_cache = {}
_excel = {"mtime": None, "json": b"{}"}
_excel_lock = threading.Lock()


def get(url, headers=None, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def token(force=False):
    with _lock:
        if force or not _tok["v"] or time.time() > _tok["exp"]:
            raw = get(SITE + "/api/v1/geo/token", {"Referer": SITE + "/", "Accept": "application/json"})
            _tok["v"] = json.loads(raw)["data"]["token"]
            _tok["exp"] = time.time() + 240
        return _tok["v"]


def fetch_tile(z, x, y):
    """Tile del INEI, guardado en memoria y en disco (cache_tiles/) para no volver a pedirlo."""
    key = (z, x, y)
    if key in _tile_cache:
        return _tile_cache[key]
    path = TILE_DIR / str(z) / str(x) / f"{y}.pbf"
    if path.exists():
        data = _tile_cache[key] = path.read_bytes()
        return data
    url = TILES.format(z=z, x=x, y=y)
    for attempt in (0, 1):
        try:
            data = get(url, {"geomatica_key_dinamic": token(force=attempt == 1), "Referer": SITE + "/"})
            break
        except urllib.error.HTTPError as e:
            if e.code == 404:  # fuera del área con datos (p. ej. al norte del ecuador): tile vacío
                data = b""
                break
            if e.code not in (401, 403) or attempt:
                raise
    _tile_cache[key] = data
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return data


def fetch_tooltip(gid, ind=1, year=2025):
    key = (gid, ind, year)
    if key not in _tip_cache:
        url = f"{SITE}/api/v1/resultados/tooltip?idIndicador={ind}&idTiempo={year}&idGeografia={gid}"
        _tip_cache[key] = get(url, {"Referer": SITE + "/resultados/poblacion-total/dashboard",
                                    "Accept": "application/json"})
    return _tip_cache[key]


def excel_json():
    """datos.xlsx como JSON {id_geografia: {campo: valor}}. Se relee solo si el archivo cambió."""
    with _excel_lock:
        mtime = EXCEL.stat().st_mtime if EXCEL.exists() else None
        if mtime != _excel["mtime"]:
            datos = {}
            if mtime is not None:
                from openpyxl import load_workbook
                ws = load_workbook(EXCEL, read_only=True, data_only=True).worksheets[0]
                filas = ws.iter_rows(values_only=True)
                cab = [str(c or "").strip() for c in next(filas, [])]
                for fila in filas:
                    d = {c: ("" if v is None else str(v)) for c, v in zip(cab, fila) if c}
                    gid = d.get("id_geografia", "").split(".")[0]
                    if gid.isdigit():
                        datos[gid] = d
            _excel["json"] = json.dumps(datos, ensure_ascii=False).encode()
            _excel["mtime"] = mtime
            print(f"datos.xlsx cargado: {len(datos)} filas")
        return _excel["json"]


def tile_local(z, x, y):
    """Tile desde memoria o disco. Nunca va al INEI: si no está descargado devuelve None."""
    key = (z, x, y)
    if key not in _tile_cache:
        path = TILE_DIR / str(z) / str(x) / f"{y}.pbf"
        if not path.exists():
            return None
        _tile_cache[key] = path.read_bytes()
    return _tile_cache[key]


def zoom_maximo():
    zs = [int(d.name) for d in TILE_DIR.iterdir() if d.name.isdigit()] if TILE_DIR.exists() else []
    return max(zs, default=0)


ESTATICOS = {"/vendor/maplibre-gl.js": "application/javascript",
             "/vendor/maplibre-gl.css": "text/css"}


class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"  # mantiene la conexión abierta entre tiles

    def send(self, code, body, ctype, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        p = self.path
        try:
            m = re.match(r"/tiles/(\d+)/(\d+)/(\d+)\.pbf", p)
            if m:
                data = tile_local(*map(int, m.groups()))
                if not data:  # fuera de Perú o no descargado: tile vacío
                    return self.send(204, b"", "application/x-protobuf")
                return self.send(200, data, "application/x-protobuf",
                                 {"Cache-Control": "public, max-age=86400"})
            if p.startswith("/api/config"):
                return self.send(200, json.dumps({"maxzoom": zoom_maximo()}).encode(), "application/json")
            if p.startswith("/api/datos"):
                return self.send(200, excel_json(), "application/json; charset=utf-8",
                                 {"Cache-Control": "no-store"})
            if p in ESTATICOS:
                return self.send(200, (ROOT / p[1:]).read_bytes(), ESTATICOS[p],
                                 {"Cache-Control": "public, max-age=86400"})
            if p in ("/", "/index.html"):
                return self.send(200, (ROOT / "index.html").read_bytes(), "text/html; charset=utf-8")
            self.send(404, b"not found", "text/plain")
        except Exception as e:
            self.send(502, str(e).encode(), "text/plain")

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    if not TILE_DIR.exists() or not EXCEL.exists():
        print("Aviso: faltan los datos locales. Descárgalos una vez con:  python descargar_todo.py")
    else:
        print(f"Modo local: tiles hasta zoom {zoom_maximo()}, sin consultas al INEI.")
    print(f"Mapa en http://localhost:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
