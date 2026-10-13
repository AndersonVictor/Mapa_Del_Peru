"""Crea o completa datos.xlsx con los textos del tooltip (departamentos, provincias, distritos).

    python actualizar_excel.py            # agrega solo las filas que faltan (respeta lo que editaste)
    python actualizar_excel.py --todo     # vuelve a bajar todo del INEI y sobrescribe

Los ids se sacan de los tiles del mapa (capa tb_distrito) y los datos de la API de tooltip del INEI.
"""
import gzip, json, math, sys, time
from concurrent.futures import ThreadPoolExecutor

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill

from server import COLUMNAS, EXCEL, fetch_tile, fetch_tooltip

ZOOM = 8
BOUNDS = (-81.5, -18.5, -68.5, 0.2)  # lon/lat de Perú
NIVEL = {"7": "Departamento", "8": "Provincia", "9": "Distrito"}


# --- lector mínimo de Mapbox Vector Tiles (solo propiedades, sin geometría) ---
def _varint(b, i):
    r = s = 0
    while True:
        c = b[i]; i += 1
        r |= (c & 0x7F) << s; s += 7
        if c < 0x80:
            return r, i


def _campos(b):
    i = 0
    while i < len(b):
        k, i = _varint(b, i)
        f, t = k >> 3, k & 7
        if t == 0:
            v, i = _varint(b, i)
        elif t == 1:
            v, i = b[i:i + 8], i + 8
        elif t == 2:
            n, i = _varint(b, i)
            v, i = b[i:i + n], i + n
        elif t == 5:
            v, i = b[i:i + 4], i + 4
        else:
            raise ValueError("tipo protobuf no soportado")
        yield f, t, v


def _valor(b):
    import struct
    for f, t, v in _campos(b):
        if f == 1: return v.decode()
        if f == 2: return struct.unpack("<f", v)[0]
        if f == 3: return struct.unpack("<d", v)[0]
        if f in (4, 5): return v
        if f == 6: return (v >> 1) ^ -(v & 1)
        if f == 7: return bool(v)


def propiedades(pbf, capa):
    if pbf[:2] == b"\x1f\x8b":
        pbf = gzip.decompress(pbf)
    for f, _, layer in _campos(pbf):
        if f != 3:
            continue
        nombre, feats, keys, vals = None, [], [], []
        for lf, _, lv in _campos(layer):
            if lf == 1: nombre = lv.decode()
            elif lf == 2: feats.append(lv)
            elif lf == 3: keys.append(lv.decode())
            elif lf == 4: vals.append(_valor(lv))
        if nombre != capa:
            continue
        for feat in feats:
            for ff, _, fv in _campos(feat):
                if ff == 2:
                    tags, j = [], 0
                    while j < len(fv):
                        n, j = _varint(fv, j); tags.append(n)
                    yield {keys[tags[k]]: vals[tags[k + 1]] for k in range(0, len(tags) - 1, 2)}


def cajas(pbf, capa, z, x, y):
    """(propiedades, [oeste, sur, este, norte]) de cada polígono de la capa, en lon/lat. y en esquema TMS."""
    if pbf[:2] == b"\x1f\x8b":
        pbf = gzip.decompress(pbf)
    n = 2 ** z
    yx = n - 1 - y
    for f, _, layer in _campos(pbf):
        if f != 3:
            continue
        nombre, feats, keys, vals, ext = None, [], [], [], 4096
        for lf, _, lv in _campos(layer):
            if lf == 1: nombre = lv.decode()
            elif lf == 2: feats.append(lv)
            elif lf == 3: keys.append(lv.decode())
            elif lf == 4: vals.append(_valor(lv))
            elif lf == 5: ext = lv
        if nombre != capa:
            continue
        for feat in feats:
            props, geom = {}, b""
            for ff, _, fv in _campos(feat):
                if ff == 2:
                    tags, j = [], 0
                    while j < len(fv):
                        k, j = _varint(fv, j); tags.append(k)
                    props = {keys[tags[k]]: vals[tags[k + 1]] for k in range(0, len(tags) - 1, 2)}
                elif ff == 4:
                    geom = fv
            # Recorre los comandos MoveTo/LineTo de la geometría y guarda el mínimo/máximo
            cx = cy = 0
            x0 = y0 = float("inf"); x1 = y1 = float("-inf")
            i = 0
            while i < len(geom):
                c, i = _varint(geom, i)
                cmd, cnt = c & 7, c >> 3
                if cmd == 7:
                    continue
                for _ in range(cnt):
                    dx, i = _varint(geom, i); dy, i = _varint(geom, i)
                    cx += (dx >> 1) ^ -(dx & 1); cy += (dy >> 1) ^ -(dy & 1)
                    x0 = min(x0, cx); x1 = max(x1, cx); y0 = min(y0, cy); y1 = max(y1, cy)
            if x0 == float("inf"):
                continue
            lon = lambda px: (x + px / ext) / n * 360 - 180
            lat = lambda py: math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (yx + py / ext) / n))))
            yield props, [lon(x0), lat(y1), lon(x1), lat(y0)]


# --- ids ---
def tiles_peru(z):
    def xy(lon, lat):
        n = 2 ** z
        x = int((lon + 180) / 360 * n)
        y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
        return x, n - 1 - y  # esquema TMS, igual que el mapa
    x0, y0 = xy(BOUNDS[0], BOUNDS[1])
    x1, y1 = xy(BOUNDS[2], BOUNDS[3])
    return [(z, x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]


def txt(v):
    return str(int(v)) if isinstance(v, float) and v.is_integer() else str(v)


def ids_geografia():
    ids = set()
    tiles = tiles_peru(ZOOM)
    print(f"Leyendo {len(tiles)} tiles (zoom {ZOOM})...")
    with ThreadPoolExecutor(8) as ex:
        for pbf in ex.map(lambda t: fetch_tile(*t), tiles):
            for p in propiedades(pbf, "tb_distrito"):
                if "id_geografia" not in p:
                    continue
                ccdd, ccpp = txt(p["ccdd"]).zfill(2), txt(p["ccpp"]).zfill(2)
                ids.add(txt(p["id_geografia"]))
                ids.add("8" + ccdd + ccpp + "00")
                ids.add("7" + txt(p.get("cod_region", ccdd)).zfill(2) + "0000")
    return sorted(ids)


def bajar(gid):
    try:
        d = json.loads(fetch_tooltip(gid))["data"] or {}
        time.sleep(0.1)  # sin apuro, para no cargar al INEI
        return gid, d
    except Exception as e:
        print(f"  sin datos para {gid}: {e}")
        return gid, None


def main():
    todo = "--todo" in sys.argv
    existentes, extras = {}, []
    if EXCEL.exists() and not todo:
        ws = load_workbook(EXCEL).worksheets[0]
        filas = ws.iter_rows(values_only=True)
        cab = [str(c or "") for c in next(filas, [])]
        # columnas que agregaste a mano: se conservan
        extras = [c for c in cab if c and c not in COLUMNAS and c != "nivel"]
        for fila in filas:
            d = dict(zip(cab, fila))
            if d.get("id_geografia") is not None:
                existentes[txt(d["id_geografia"])] = d

    faltan = [g for g in ids_geografia() if g not in existentes]
    print(f"{len(existentes)} filas ya en el Excel, faltan {len(faltan)}. Descargando...")
    nuevos = {}
    with ThreadPoolExecutor(4) as ex:
        for k, (gid, d) in enumerate(ex.map(bajar, faltan), 1):
            if d is not None:
                nuevos[gid] = d
            if k % 200 == 0:
                print(f"  {k}/{len(faltan)}")

    cab = ["id_geografia", "nivel"] + COLUMNAS[1:] + extras
    wb = Workbook()
    ws = wb.active
    ws.title = "datos"
    ws.append(cab)
    for gid in sorted({**existentes, **nuevos}):
        d = existentes.get(gid) or nuevos[gid]
        ws.append([int(gid), NIVEL.get(gid[0], "")] + [d.get(c) for c in COLUMNAS[1:] + extras])
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="C8102E")
    for col, ancho in zip("ABCDEFGHIJK", (13, 14, 18, 22, 26, 40, 24, 14, 14, 14, 14)):
        ws.column_dimensions[col].width = ancho
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    wb.save(EXCEL)
    print(f"Listo: {EXCEL.name} con {ws.max_row - 1} filas.")


if __name__ == "__main__":
    main()
