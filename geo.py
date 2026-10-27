"""Lectura de los tiles vectoriales (MVT) locales: extensión y centro de cada zona."""
import gzip, math

BOUNDS = (-78.5, -16.1, -71.4, -8.7)  # lon/lat: Junín y Huancavelica con 2° de margen (igual que el mapa)


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


def cajas(pbf, capa, z, x, y):
    """(propiedades, [oeste, sur, este, norte], (área, momento x, momento y)) de cada polígono de la capa.
    La caja va en lon/lat; el área y sus momentos en coordenadas de mundo (0-1), para sacar el centro
    del polígono sumando los pedazos de varios tiles. y en esquema TMS."""
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
            # Recorre los comandos MoveTo/LineTo/ClosePath: mínimo/máximo y área de cada anillo (shoelace)
            cx = cy = 0
            x0 = y0 = float("inf"); x1 = y1 = float("-inf")
            area = mx = my = 0.0
            anillo = []
            i = 0
            while i < len(geom):
                c, i = _varint(geom, i)
                cmd, cnt = c & 7, c >> 3
                if cmd == 7:  # cierra el anillo: los huecos restan solos (giran al revés)
                    for (ax, ay), (bx, by) in zip(anillo, anillo[1:] + anillo[:1]):
                        cr = ax * by - bx * ay
                        area += cr; mx += (ax + bx) * cr; my += (ay + by) * cr
                    anillo = []
                    continue
                for _ in range(cnt):
                    dx, i = _varint(geom, i); dy, i = _varint(geom, i)
                    cx += (dx >> 1) ^ -(dx & 1); cy += (dy >> 1) ^ -(dy & 1)
                    x0 = min(x0, cx); x1 = max(x1, cx); y0 = min(y0, cy); y1 = max(y1, cy)
                    anillo.append((cx, cy))
            if x0 == float("inf"):
                continue
            lon = lambda px: (x + px / ext) / n * 360 - 180
            lat = lambda py: math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (yx + py / ext) / n))))
            # a coordenadas de mundo: área * (1/(ext*n))², centro = (tile + px/ext)/n
            k = 1 / (ext * n)
            a = area / 2 * k * k
            centro = ((x + mx / (3 * area) / ext) / n, (yx + my / (3 * area) / ext) / n) if area else (0, 0)
            yield props, [lon(x0), lat(y1), lon(x1), lat(y0)], (a, a * centro[0], a * centro[1])


# --- tiles del área ---
def tiles_area(z):
    """Tiles (esquema TMS) que cubren BOUNDS en el zoom z."""
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
