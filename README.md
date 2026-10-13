# Mapa_Del_Peru

Mapa del Censo 2025 (INEI) por departamento, provincia y distrito, **100% local**:
se descarga todo una sola vez y después el mapa no consulta al INEI.

## Uso

```
pip install openpyxl
python descargar_todo.py     # UNA sola vez (tiles + datos.xlsx). Se puede cortar y reanudar.
python server.py             # abre http://localhost:8000
```

- `descargar_todo.py` baja los tiles hasta zoom 10 (~2 800 archivos) a `cache_tiles/`
  y los textos de ~2 100 departamentos/provincias/distritos a `datos.xlsx`.
  Va despacio a propósito para no cargar el servidor del INEI.
  Con `--zoom 11` baja más detalle en los bordes (~11 000 tiles).
- `server.py` solo lee esos archivos. Si acercas más que el zoom descargado, el mapa
  amplía los mismos tiles. La librería del mapa (MapLibre) también está en `vendor/`,
  así que funciona incluso sin internet.

## Editar los textos del tooltip (datos.xlsx)

- Una fila por departamento (id 7…), provincia (id 8…) y distrito (id 9…).
- Columnas: `nombregion`, `nombprov`, `nombdist`, `nombAmbito`, `indicador`, `dato`, `hombre`, `mujer`, `densidad`.
- No cambies la columna `id_geografia` ni los encabezados.
- Edita, guarda y **recarga la página** (F5): no hace falta reiniciar el servidor.
- `python actualizar_excel.py` agrega solo las filas que falten (no toca lo que editaste).
  `python actualizar_excel.py --todo` lo vuelve a bajar todo y sobrescribe tus cambios.
- Cierra el Excel antes de correr los scripts (Windows no deja guardar un archivo abierto).
