"""Jueces y juezas por provincia y por sede (distrito), desde jueces.xlsx (modelo del Power BI).

- Hoja 'Provincias'      -> totales por provincia (los mismos que usa la medida RESUMEN del Power BI).
- Hoja 'Data_Plana'      -> un magistrado por fila, con su SEDE_LOCALIDAD: se cuenta por distrito.
- Hoja 'DimDependencia'  -> coordenadas de cada órgano: ubican la burbuja de cada sede en el mapa.

Los nombres se cruzan con datos.xlsx (INEI) sin importar tildes ni Ñ.
"""
import re
import unicodedata
from collections import defaultdict

CAMPOS = ["total", "varones", "mujeres", "titulares", "prov", "supern", "sala", "jesp", "jpl"]
# encabezado de la hoja Provincias (normalizado) -> campo
COL_PROV = {"TOTAL": "total", "VARONES": "varones", "MUJERES": "mujeres", "TITULARES": "titulares",
            "SUPERN": "supern", "PROV": "prov", "SALA": "sala", "J ESP": "jesp", "JPL": "jpl"}


def norm(s):
    s = unicodedata.normalize("NFD", str(s or "")).upper()
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def num(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0  # como COALESCE(..., 0)


def tabla(ws, primera_col):
    """Filas de una hoja como dicts. El encabezado es la primera fila cuya primera celda es `primera_col`
    (algunas hojas tienen un título arriba)."""
    filas = ws.iter_rows(values_only=True)
    for f in filas:
        if norm(f[0]) == primera_col:
            cab = [norm(c) for c in f]
            break
    else:
        return []
    return [dict(zip(cab, f)) for f in filas if any(v is not None for v in f)]


class Buscador:
    """Nombre (+ departamento/provincia) -> id_geografia de datos.xlsx. Estricto: si no calza, None."""

    def __init__(self, datos):
        self.datos = datos
        self.por_nivel = defaultdict(list)
        for gid, d in datos.items():
            campo = {"7": "nombregion", "8": "nombprov", "9": "nombdist"}.get(gid[0])
            if campo:
                self.por_nivel[gid[0]].append((gid, norm(d.get(campo)), norm(d.get("nombregion")), norm(d.get("nombprov"))))

    def __call__(self, nivel, nombre, dep=None, prov=None):
        n, dep, prov = norm(nombre), norm(dep), norm(prov)
        cand = [c for c in self.por_nivel[nivel] if (not dep or c[2] == dep) and (not prov or c[3] == prov)]
        exacto = [c[0] for c in cand if c[1] == n]
        if exacto:
            return exacto[0]
        # 'SAN AGUSTIN DE CAJAS' vs 'SAN AGUSTIN': vale si es el único dentro de la misma provincia
        parecido = [c[0] for c in cand if c[1] and (n.startswith(c[1] + " ") or c[1].startswith(n + " "))]
        return parecido[0] if len(parecido) == 1 else None


def resumen(ruta, datos, cajas):
    """{'provincias': {id: {...}}, 'sedes': [ {...} ], 'csjj': {...}, 'avisos': [...]}"""
    from openpyxl import load_workbook
    wb = load_workbook(ruta, read_only=True, data_only=True)
    hojas = {norm(n): n for n in wb.sheetnames}
    buscar = Buscador(datos)
    avisos = []

    # 1) Provincias: totales oficiales del resumen
    provincias, dep_de_prov = {}, {}
    for f in tabla(wb[hojas["PROVINCIAS"]], "UBIGEO") if "PROVINCIAS" in hojas else []:
        if not f.get("PROVINCIA"):
            continue
        dep_de_prov[norm(f["PROVINCIA"])] = f.get("DEPARTAMENTO")
        gid = buscar("8", f["PROVINCIA"], f.get("DEPARTAMENTO"))
        if not gid:
            avisos.append(f"Provincia '{f['PROVINCIA']}' ({f.get('DEPARTAMENTO')}) no se encontró en datos.xlsx.")
            continue
        p = {campo: num(f.get(col)) for col, campo in COL_PROV.items()}
        p.update(nombre=f["PROVINCIA"], departamento=f.get("DEPARTAMENTO") or "")
        provincias[gid] = p
    csjj = {c: sum(p[c] for p in provincias.values()) for c in CAMPOS}

    # 2) Coordenadas de los órganos, promediadas por distrito
    coords = defaultdict(list)
    for f in tabla(wb[hojas["DIMDEPENDENCIA"]], "ID DEP") if "DIMDEPENDENCIA" in hojas else []:
        gid = buscar("9", f.get("DISTRITO"), f.get("DEPARTAMENTO"), f.get("PROVINCIA"))
        lat, lon = f.get("LATITUD DECIMAL"), f.get("LONGITUD DECIMAL")
        if gid and isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
            coords[gid].append((lon, lat))

    # 3) Data_Plana: cada magistrado suma en el distrito de su sede
    sedes, sin_ubicar, por_prov = {}, defaultdict(int), defaultdict(int)
    for f in tabla(wb[hojas["DATA PLANA"]], "PROVINCIA") if "DATA PLANA" in hojas else []:
        prov, sede = f.get("PROVINCIA"), f.get("SEDE LOCALIDAD")
        if not prov or norm(prov).startswith("TOTAL"):
            continue
        por_prov[norm(prov)] += 1
        gid = buscar("9", sede, dep_de_prov.get(norm(prov)), prov)
        if not gid:
            sin_ubicar[f"{sede} ({prov})"] += 1
            continue
        s = sedes.setdefault(gid, dict({c: 0 for c in CAMPOS}, nombre=sede, provincia=prov,
                                       departamento=dep_de_prov.get(norm(prov)) or "", id=gid))
        s["total"] += 1
        sexo, cond, tipo = norm(f.get("SEXO")), norm(f.get("CONDICION LABEL") or f.get("CONDICION")), norm(f.get("TIPO ORGANO"))
        s["varones"] += sexo.startswith("VAR")
        s["mujeres"] += sexo.startswith("MUJ")
        s["titulares"] += cond.startswith("T")
        s["prov"] += cond.startswith("P")
        s["supern"] += cond.startswith("S")
        s["sala"] += tipo == "SALA"
        s["jesp"] += tipo.startswith("J ESP")
        s["jpl"] += tipo == "JPL"
    for gid, s in sedes.items():
        pts = coords.get(gid)
        if pts:
            s["lon"], s["lat"] = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
        elif gid in cajas:
            c = cajas[gid]
            s["lon"], s["lat"] = (c[0] + c[2]) / 2, (c[1] + c[3]) / 2
    for k, n in sin_ubicar.items():
        avisos.append(f"Sede '{k}': {n} magistrado(s) sin distrito que coincida en datos.xlsx (no salen como burbuja).")
    for gid, p in provincias.items():
        n = por_prov.get(norm(p["nombre"]), 0)
        if n != p["total"]:
            avisos.append(f"{p['nombre']}: la hoja Provincias dice {p['total']} y Data_Plana lista {n}.")

    return {"provincias": provincias, "sedes": list(sedes.values()), "csjj": csjj, "avisos": avisos}
