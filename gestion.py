"""Gestion Administrativa: lee gestion_administrativa.xlsx."""
from jueces import leer_hojas

VALIDOS = ("validado", "corregido")
LISTAS_CERRADAS = {
    "DATA_INDICADORES": {"id_indicador": ("CAT_INDICADORES", "id_indicador"), "id_sede": ("CAT_SEDES", "id_sede"),
                         "estado_validacion": ("LISTAS", "L_ESTADO"), "es_parcial": ("LISTAS", "L_SINO")},
    "EQUIPAMIENTO": {"id_sede": ("CAT_SEDES", "id_sede")},
    "OBRAS": {"id_sede": ("CAT_SEDES", "id_sede"), "tipo": ("LISTAS", "L_TIPO_OBRA"), "estado": ("LISTAS", "L_ESTADO_OBRA")},
    "PATRIMONIO": {"accion": ("LISTAS", "L_ACCION")},
    "INTERVENCIONES": {"id_oficina": ("CAT_OFICINAS", "id_oficina"), "eje": ("CAT_EJES", "eje"),
                       "estado": ("LISTAS", "L_ESTADO_INTERV")},
    "VALIDACIONES": {"id_oficina": ("CAT_OFICINAS", "id_oficina"), "estado": ("LISTAS", "L_ESTADO")},
    "CAT_INDICADORES": {"id_oficina": ("CAT_OFICINAS", "id_oficina"), "eje": ("CAT_EJES", "eje")},
}
NUMEROS = {"DATA_INDICADORES": ["valor", "anio"], "PRESUPUESTO": ["pia", "pim", "devengado"],
           "INVERSIONES": ["costo_aprobado", "costo_actualizado", "devengado_acumulado", "programado_anio"],
           "EQUIPAMIENTO": ["cantidad", "monto"], "OBRAS": ["area_antes_m2", "area_despues_m2", "monto"],
           "PATRIMONIO": ["cantidad"], "INTEGRIDAD_CORTES": ["porcentaje", "etapa"]}
CLAVES = {"DATA_INDICADORES": ["id_indicador", "anio", "fecha_corte", "id_sede"], "PRESUPUESTO": ["anio", "fecha_corte", "generica"],
          "INVERSIONES": ["cui", "fecha_corte"], "EQUIPAMIENTO": ["id"], "OBRAS": ["id_obra"], "PATRIMONIO": ["id"],
          "INTERVENCIONES": ["id"], "CONVENIOS": ["id"], "INTEGRIDAD_CORTES": ["fecha_reporte", "corte", "etapa"], "VALIDACIONES": ["id"]}


def vacio(v):
    return v is None or v == ""


def listas(ruta):
    from openpyxl import load_workbook
    wb = load_workbook(ruta, read_only=True)
    if "LISTAS" not in wb.sheetnames:
        return {}
    cols = list(zip(*wb["LISTAS"].iter_rows(values_only=True)))
    return {c[0]: [v for v in c[1:] if not vacio(v)] for c in cols if c and c[0]}


def revisar(H, L):
    avisos = []
    for hoja, cols in LISTAS_CERRADAS.items():
        for i, r in enumerate(H.get(hoja, []), 2):
            for col, (cat, campo) in cols.items():
                v = r.get(col)
                permitidos = L.get(campo, []) if cat == "LISTAS" else [x.get(campo) for x in H.get(cat, [])]
                if not vacio(v) and v not in permitidos:
                    avisos.append(f"{hoja} fila {i}: «{v}» no está en {cat if cat != 'LISTAS' else campo} ({col}).")
    for hoja, cols in NUMEROS.items():
        for i, r in enumerate(H.get(hoja, []), 2):
            for col in cols:
                v = r.get(col)
                if not vacio(v) and not isinstance(v, (int, float)):
                    avisos.append(f"{hoja} fila {i}: {col} = «{v}» no es un número (sin S/ ni %).")
    for hoja, cols in CLAVES.items():
        vistos = {}
        for i, r in enumerate(H.get(hoja, []), 2):
            k = tuple(r.get(c) for c in cols)
            if k in vistos:
                avisos.append(f"{hoja} fila {i}: repite la clave de la fila {vistos[k]} ({', '.join(cols)}).")
            vistos[k] = i
    return avisos


def ultimos(filas):
    """Ultimo corte validado de cada indicador/año/sede."""
    grupos = {}
    for r in filas:
        grupos.setdefault(f"{r.get('id_indicador')}|{r.get('anio')}|{r.get('id_sede') or ''}", []).append(r)
    res = {}
    for k, fs in grupos.items():
        orden = lambda r: r.get("fecha_corte") or ""
        validas = [r for r in fs if r.get("estado_validacion") in VALIDOS]
        r = max(validas or fs, key=orden)
        res[k] = dict(r, pendiente=not validas or r.get("estado_validacion") not in VALIDOS)
    return res


def datos(ruta):
    H = leer_hojas(ruta)
    H.pop("LEEME", None); H.pop("GUIA", None)
    L = listas(ruta)
    H.pop("LISTAS", None)
    u = ultimos(H.get("DATA_INDICADORES", []))
    res = {"hojas": H, "listas": L, "ultimos": u, "avisos": revisar(H, L), "resumen": resumen_de(H)}
    # sin pendientes no se envia la hoja VALIDACIONES
    res["validacion"] = hay_pendientes(H, u)
    if not res["validacion"]:
        H.pop("VALIDACIONES", None)
        res["resumen"].pop("por_validar", None)
    return res


def hay_pendientes(H, u=None):
    u = u if u is not None else ultimos(H.get("DATA_INDICADORES", []))
    return (any(r.get("estado") == "por validar" for r in H.get("VALIDACIONES", []))
            or any(r["pendiente"] for r in u.values()))


def resumen_de(H):
    """Cifras del boton en el dashboard."""
    u = ultimos(H.get("DATA_INDICADORES", []))
    anios = sorted({r.get("anio") for r in u.values() if r.get("id_indicador") == "PPTO_DEV"}, key=lambda a: a or 0)
    ejec = None
    if anios:
        a = anios[-1]
        dev, pim = u.get(f"PPTO_DEV|{a}|"), u.get(f"PPTO_PIM|{a}|")
        if dev and pim and pim.get("valor"):
            ejec = {"anio": a, "pct": dev["valor"] / pim["valor"] * 100, "corte": dev.get("fecha_corte"),
                    "parcial": dev.get("es_parcial") == "Sí", "pendiente": dev["pendiente"] or pim["pendiente"]}
    num = lambda v: v if isinstance(v, (int, float)) else 0
    cortes = [r.get("fecha_corte") for r in H.get("DATA_INDICADORES", []) if r.get("fecha_corte")]
    return {"ejecucion": ejec, "obras": len(H.get("OBRAS", [])),
            "sedes": len({r.get("id_sede") for r in H.get("OBRAS", []) if r.get("id_sede")}),
            "equipos": sum(num(r.get("cantidad")) for r in H.get("EQUIPAMIENTO", [])),
            "por_validar": sum(r.get("estado") == "por validar" for r in H.get("VALIDACIONES", [])),
            "ultimo_corte": max(cortes) if cortes else None}
