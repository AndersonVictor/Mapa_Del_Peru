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

## Navegar

- **Clic** en una zona = acercarse a ella, como en el INEI: departamento → sus provincias → sus distritos.
- Botón **⟲ Perú** (arriba a la izquierda) = volver a ver todo el país.

- **Combos Departamento → Provincia → Distrito** (arriba a la izquierda): eligen una zona, la marcan en azul y acercan el mapa.

## Mapa de trabajo: Junín y Huancavelica (http://localhost:8000/trabajo)

Muestra solo las zonas de `lista_trabajo.xlsx` (columnas `NOMBRE`, `NIVEL`, `DEPARTAMENTO`, `PROVINCIA`):

- El área del mapa son los departamentos que la lista tiene con `NIVEL = DEPARTAMENTO` (hoy Junín y Huancavelica).
  Las filas de otros departamentos (Huancané, Pacasmayo, Urubamba) aparecen en el panel como *fuera del área*.
- Amarillo = provincia de la lista, violeta = distrito de la lista. El tooltip muestra lo más específico de la lista bajo el cursor.
- Clic en el mapa o en la lista del panel = acercarse a esa zona. Los combos solo ofrecen lo que está en la lista.
- **Descargar Excel**: la lista con los datos de `datos.xlsx` (población, hombres, mujeres, densidad).
- Los nombres se buscan en `datos.xlsx` sin importar tildes ni Ñ. Si alguno sale con ⚠ *no encontrado*, revisa cómo está escrito.
- Edita la lista, guarda y recarga la página (F5).

### Modo ⚖️ Jueces (botón arriba del panel)

Lee `jueces.xlsx` (el modelo del Power BI de la CSJ Junín):

- **Provincias**: color según el total de jueces de la hoja `Provincias` (los mismos números de la medida RESUMEN).
- **Burbujas por sede (distrito)**: se cuentan de la hoja `Data_Plana` (columna `SEDE_LOCALIDAD`) y se ubican
  con las coordenadas de `DimDependencia`. Tamaño = cantidad de jueces.
- Tooltip con el mismo orden que el RESUMEN: total, varones/mujeres, por condición y por instancia
  (se personaliza en `tooltip.js`, función `tooltipJuecesHTML`).
- En el panel: resumen de la CSJJ, ranking por provincia (clic = acercar) y **avisos** si las hojas no cuadran
  entre sí o si una sede no se encuentra en el mapa.
- Reemplaza `jueces.xlsx` por tu versión nueva (mismas hojas y columnas) y recarga la página.

## Editar los textos del tooltip (datos.xlsx)

- Una fila por departamento (id 7…), provincia (id 8…) y distrito (id 9…).
- Columnas: `nombregion`, `nombprov`, `nombdist`, `nombAmbito`, `indicador`, `dato`, `hombre`, `mujer`, `densidad`.
- No cambies la columna `id_geografia` ni los encabezados.
- Edita, guarda y **recarga la página** (F5): no hace falta reiniciar el servidor.
- `python actualizar_excel.py` agrega solo las filas que falten (no toca lo que editaste).
  `python actualizar_excel.py --todo` lo vuelve a bajar todo y sobrescribe tus cambios.
- **Columnas nuevas**: agrega una columna a `datos.xlsx` (el encabezado es el texto que se muestra)
  y aparece sola en el tooltip de ambos mapas y en la descarga a Excel. `actualizar_excel.py` la conserva.
  Las celdas vacías no se muestran.
- **Personalizar el tooltip** (colores, textos, orden, ocultar filas): todo está al inicio de `tooltip.js`.
- Cierra el Excel antes de correr los scripts (Windows no deja guardar un archivo abierto).
