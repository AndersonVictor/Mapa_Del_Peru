"""Servidor 100% local: sirve el mapa desde cache_tiles/ y los textos desde datos.xlsx.
NO consulta al INEI mientras navegas.  Uso:  python server.py  ->  http://localhost:8000

Antes, una sola vez, descarga todo con:  python descargar_todo.py
Las funciones de descarga (token, fetch_tile, fetch_tooltip) solo las usan los scripts
descargar_todo.py y actualizar_excel.py.
"""
import io, json, math, re, threading, time, unicodedata, urllib.parse, urllib.request, urllib.error
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).parent
PORT = 8000
EXCEL = ROOT / "datos.xlsx"
LISTA = ROOT / "lista_trabajo.xlsx"  # zonas del mapa de trabajo (/trabajo)
JUECES = ROOT / "dashboard.xlsx"     # dashboard CSJ Junín: Magistrados, Organos, Poblacion, Carga_Procesal...
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
_excel = {"mtime": None, "json": b"{}", "datos": {}}
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
            _excel["datos"] = datos
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


def resumen_tiles():
    """Cuántos tiles hay en disco y cuántos tienen datos (los vacíos son zonas fuera de Perú)."""
    total = con_datos = 0
    if TILE_DIR.exists():
        for f in TILE_DIR.rglob("*.pbf"):
            total += 1
            con_datos += f.stat().st_size > 0
    return total, con_datos


# --- Extensión (caja oeste, sur, este, norte) de cada zona, para acercarse desde los combos ---
EXT_FILE = TILE_DIR / "extensiones.json"
_ext = {"json": None}
_ext_lock = threading.Lock()


def extensiones():
    """{id_geografia: [o, s, e, n, lon, lat, área]} de departamentos, provincias y distritos.
    lon/lat = centro del polígono (ahí va su nombre en el mapa).
    Se calcula una vez desde los tiles (unos segundos) y se guarda en cache_tiles/extensiones.json."""
    with _ext_lock:
        if _ext["json"] is not None:
            return _ext["json"]
        z = min(8, zoom_maximo())
        if EXT_FILE.exists():
            guardado = json.loads(EXT_FILE.read_text())
            if guardado.get("zoom") == z and guardado.get("v") == 2:
                _ext["json"] = json.dumps(guardado["cajas"]).encode()
                return _ext["json"]
        from actualizar_excel import cajas, tiles_peru, txt
        print(f"Calculando la extensión de cada zona (zoom {z}), solo esta vez...")
        res, mom = {}, {}
        for (tz, x, y) in tiles_peru(z):
            data = tile_local(tz, x, y)
            if not data:
                continue
            for p, b, (a, ax, ay) in cajas(data, "tb_distrito", tz, x, y):
                if "id_geografia" not in p:
                    continue
                ccdd = txt(p.get("ccdd", "")).zfill(2)
                ccpp = txt(p.get("ccpp", "")).zfill(2)
                reg = txt(p.get("cod_region", ccdd)).zfill(2)
                for gid in (txt(p["id_geografia"]), "8" + ccdd + ccpp + "00", "7" + reg + "0000"):
                    c = res.get(gid)
                    res[gid] = b if c is None else [min(c[0], b[0]), min(c[1], b[1]),
                                                    max(c[2], b[2]), max(c[3], b[3])]
                    m = mom.setdefault(gid, [0.0, 0.0, 0.0])
                    m[0] += a; m[1] += ax; m[2] += ay
        for gid, c in res.items():
            a, ax, ay = mom[gid]
            if a:  # centro ponderado por área, de vuelta a lon/lat
                lon = ax / a * 360 - 180
                lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * ay / a))))
            else:
                lon, lat = (c[0] + c[2]) / 2, (c[1] + c[3]) / 2
            c += [lon, lat, abs(a) * 1e9]
        res = {k: [round(v, 5) for v in c] for k, c in res.items()}
        if res:
            EXT_FILE.write_text(json.dumps({"zoom": z, "v": 2, "cajas": res}))
        print(f"Extensiones listas: {len(res)} zonas")
        _ext["json"] = json.dumps(res).encode()
        return _ext["json"]


# --- Lista de trabajo (lista_trabajo.xlsx): nombres -> id_geografia usando datos.xlsx ---
NIVELES = {"DEPARTAMENTO": "7", "PROVINCIA": "8", "DISTRITO": "9"}
CAMPO_NOMBRE = {"7": "nombregion", "8": "nombprov", "9": "nombdist"}


def norm(s):
    """'Junín ' -> 'JUNIN'; Ñ -> N; sin tildes ni espacios dobles."""
    s = unicodedata.normalize("NFD", str(s or "")).upper()
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"\s+", " ", s).strip()
    return re.sub(r"^(DEPARTAMENTO|PROVINCIA|DISTRITO) (DE )?", "", s)


def leer_lista():
    if not LISTA.exists():
        return []
    from openpyxl import load_workbook
    ws = load_workbook(LISTA, read_only=True, data_only=True).worksheets[0]
    filas = ws.iter_rows(values_only=True)
    cab = [norm(c) for c in next(filas, [])]
    out = []
    for fila in filas:
        d = dict(zip(cab, fila))
        if d.get("NOMBRE"):
            out.append({k: str(d.get(k.upper()) or "").strip()
                        for k in ("nombre", "nivel", "departamento", "provincia", "mostrar", "ocultar")})
    return out


def buscar(fila, datos):
    """id_geografia de una fila de la lista, o None. Filtra por nombre, luego departamento y provincia."""
    nivel = NIVELES.get(norm(fila["nivel"]))
    if not nivel:
        return None
    campo = CAMPO_NOMBRE[nivel]
    cand = [g for g, d in datos.items() if g[0] == nivel and norm(d.get(campo)) == norm(fila["nombre"])]
    for col, campo in (("departamento", "nombregion"), ("provincia", "nombprov")):
        if fila[col]:
            mejor = [g for g in cand if norm(datos[g].get(campo)) == norm(fila[col])]
            if mejor:
                cand = mejor
    return cand[0] if cand else None


def lista_json():
    excel_json()  # relee datos.xlsx si cambió
    datos = _excel["datos"]
    filas = leer_lista()
    for f in filas:
        f["id"] = buscar(f, datos)
    # El área del mapa = los departamentos que la lista tiene como DEPARTAMENTO
    area = {norm(f["nombre"]) for f in filas if norm(f["nivel"]) == "DEPARTAMENTO"}
    for f in filas:
        f["en_area"] = norm(f["departamento"] or f["nombre"]) in area
        f["ocultar"] = norm(f["ocultar"]) in ("SI", "S", "X", "1", "OCULTAR")
        # departamento: TODO (se ve completo) o SOLO LISTA (solo sus provincias/distritos de la lista)
        f["mostrar"] = "SOLO LISTA" if "SOLO" in norm(f["mostrar"]) else "TODO"
    return filas


def lista_xlsx():
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    filas = lista_json()
    datos = _excel["datos"]
    wb = Workbook()
    ws = wb.active
    ws.title = "lista"
    # columnas que agregaste a datos.xlsx también salen en la descarga
    extras = list(dict.fromkeys(c for d in datos.values() for c in d if c not in COLUMNAS and c != "nivel"))
    ws.append(["nombre", "nivel", "departamento", "provincia"] + COLUMNAS + extras)
    for f in filas:
        if not f["en_area"] or f["ocultar"]:
            continue
        d = datos.get(f["id"] or "", {})
        ws.append([f["nombre"], f["nivel"], f["departamento"], f["provincia"]] +
                  [d.get(c, "") if c != "id_geografia" else (f["id"] or "NO ENCONTRADO") for c in COLUMNAS] +
                  [d.get(c, "") for c in extras])
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="C8102E")
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


_jueces = {"clave": None, "json": b"{}"}
_jueces_lock = threading.Lock()


def jueces_json():
    """Resumen de jueces (jueces.py). Se recalcula solo si cambia jueces.xlsx o datos.xlsx."""
    with _jueces_lock:
        excel_json()
        clave = (JUECES.stat().st_mtime if JUECES.exists() else None, _excel["mtime"])
        if clave != _jueces["clave"]:
            if clave[0] is None:
                res = {"provincias": {}, "sedes": [], "csjj": {}, "avisos": ["Falta dashboard.xlsx junto a server.py."]}
            else:
                import jueces
                res = jueces.resumen(JUECES, _excel["datos"], json.loads(extensiones()))
                print(f"dashboard.xlsx cargado: {res['csjj'].get('total', 0)} magistrados, {len(res['sedes'])} sedes")
            _jueces.update(clave=clave, json=json.dumps(res, ensure_ascii=False).encode())
        return _jueces["json"]


TIPOS_SRC = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
             ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".css": "text/css",
             ".js": "application/javascript"}

ESTATICOS = {"/vendor/maplibre-gl.js": "application/javascript",
             "/vendor/maplibre-gl.css": "text/css",
             "/vendor/echarts.min.js": "application/javascript",
             "/graficos.js": "application/javascript; charset=utf-8",
             "/iconos.svg": "image/svg+xml",
             "/filtro.js": "application/javascript; charset=utf-8",
             "/tooltip.js": "application/javascript; charset=utf-8"}


def pagina(nombre):
    """HTML con ?v=<fecha> en filtro.js y tooltip.js: si cambian, el navegador baja la versión nueva."""
    html = (ROOT / nombre).read_text(encoding="utf-8")
    for js in ("filtro.js", "tooltip.js", "graficos.js"):
        html = html.replace(f'src="/{js}"', f'src="/{js}?v={int((ROOT / js).stat().st_mtime)}"')
    return html.encode("utf-8")


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
                extra = {"Cache-Control": "public, max-age=86400"}
                if data[:2] == b"\x1f\x8b":  # tile comprimido: que el navegador lo descomprima
                    extra["Content-Encoding"] = "gzip"
                return self.send(200, data, "application/x-protobuf", extra)
            if p.startswith("/api/config"):
                total, con_datos = resumen_tiles()
                cfg = {"maxzoom": zoom_maximo(), "tiles": total, "tiles_con_datos": con_datos,
                       "excel": EXCEL.exists()}
                return self.send(200, json.dumps(cfg).encode(), "application/json")
            if p.startswith("/api/datos"):
                return self.send(200, excel_json(), "application/json; charset=utf-8",
                                 {"Cache-Control": "no-store"})
            if p.startswith("/api/extensiones"):
                return self.send(200, extensiones(), "application/json")
            if p.startswith("/api/jueces"):
                return self.send(200, jueces_json(), "application/json; charset=utf-8", {"Cache-Control": "no-store"})
            if p.startswith("/api/lista.xlsx"):
                return self.send(200, lista_xlsx(),
                                 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                 {"Content-Disposition": 'attachment; filename="lista_trabajo_datos.xlsx"'})
            if p.startswith("/api/lista"):
                return self.send(200, json.dumps(lista_json(), ensure_ascii=False).encode(),
                                 "application/json; charset=utf-8", {"Cache-Control": "no-store"})
            if p.rstrip("/") in ("/trabajo", "/trabajo.html"):
                return self.send(200, pagina("trabajo.html"), "text/html; charset=utf-8", {"Cache-Control": "no-cache"})
            ruta = p.split("?")[0]
            if ruta in ESTATICOS:
                # MapLibre no cambia: se guarda un día. filtro.js / tooltip.js sí cambian: siempre frescos
                cache = "public, max-age=86400" if ruta.startswith("/vendor/") else "no-cache"
                return self.send(200, (ROOT / ruta[1:]).read_bytes(), ESTATICOS[ruta], {"Cache-Control": cache})
            if ruta.startswith("/src/"):
                return self.archivo_src(ruta)
            if p in ("/", "/index.html"):
                return self.send(200, pagina("index.html"), "text/html; charset=utf-8", {"Cache-Control": "no-cache"})
            self.send(404, b"not found", "text/plain")
        except Exception as e:
            print(f"Error en {p}: {e!r}")
            self.send(500, str(e).encode(), "text/plain")

    def archivo_src(self, ruta):
        """Imágenes y archivos propios en la carpeta src/ (ej. /src/img/titulo.png).
        Siempre se revalidan: si reemplazas la imagen, se ve la nueva al recargar."""
        base = (ROOT / "src").resolve()
        f = (ROOT / urllib.parse.unquote(ruta).lstrip("/")).resolve()
        tipo = TIPOS_SRC.get(f.suffix.lower())
        if base not in f.parents or not tipo or not f.is_file():
            return self.send(404, b"not found", "text/plain")
        return self.send(200, f.read_bytes(), tipo, {"Cache-Control": "no-cache"})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    if not TILE_DIR.exists() or not EXCEL.exists():
        print("Aviso: faltan los datos locales. Descárgalos una vez con:  python descargar_todo.py")
    else:
        total, con_datos = resumen_tiles()
        print(f"Modo local: {total} tiles ({con_datos} con datos) hasta zoom {zoom_maximo()}, "
              "sin consultas al INEI.")
        if not con_datos:
            print("Aviso: todos los tiles están vacíos. Borra la carpeta cache_tiles y vuelve a "
                  "correr  python descargar_todo.py")
    if TILE_DIR.exists():  # deja calculadas las extensiones mientras abres el navegador
        threading.Thread(target=extensiones, daemon=True).start()
    print(f"Mapa general:   http://localhost:{PORT}")
    print(f"Mapa de trabajo: http://localhost:{PORT}/trabajo")
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
