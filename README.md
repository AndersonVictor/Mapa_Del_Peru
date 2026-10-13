# Mapa_Del_Peru

Mapa del Censo 2025 (INEI) por departamento, provincia y distrito.

## Uso

```
pip install openpyxl
python actualizar_excel.py   # solo la primera vez: crea datos.xlsx con los datos del INEI
python server.py             # abre http://localhost:8000
```

## Editar los textos del tooltip (datos.xlsx)

- Una fila por departamento (id 7…), provincia (id 8…) y distrito (id 9…).
- Columnas: `nombregion`, `nombprov`, `nombdist`, `nombAmbito`, `indicador`, `dato`, `hombre`, `mujer`, `densidad`.
- No cambies la columna `id_geografia` ni los encabezados.
- Edita, guarda y **recarga la página** (F5): no hace falta reiniciar el servidor.
- Si un id no está en el Excel, el mapa lo pide al INEI como antes.
- `python actualizar_excel.py` agrega solo las filas que falten (no toca lo que editaste).
  `python actualizar_excel.py --todo` lo vuelve a bajar todo y sobrescribe tus cambios.
- Cierra el Excel antes de correr `actualizar_excel.py` (Windows no deja guardar un archivo abierto).

Los tiles del mapa se guardan en `cache_tiles/`, así la segunda vez carga mucho más rápido.
