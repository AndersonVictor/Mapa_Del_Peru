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
- **Nombres en el mapa**: sin elegir nada se ven los departamentos; al elegir un departamento aparecen los nombres de sus provincias; al elegir una provincia,
  los de sus distritos (el distrito elegido en azul). Si dos nombres se tapan, se oculta el de la zona más chica
  y reaparece al acercar. En el mapa de trabajo se ven las provincias desde el inicio.

## Mapa de trabajo: Junín y Huancavelica (http://localhost:8000/trabajo)

Muestra solo las zonas de `lista_trabajo.xlsx` (columnas `NOMBRE`, `NIVEL`, `DEPARTAMENTO`, `PROVINCIA`):

- El área del mapa son los departamentos que la lista tiene con `NIVEL = DEPARTAMENTO` (hoy Junín y Huancavelica).
  Las filas de otros departamentos (Huancané, Pacasmayo, Urubamba) aparecen en el panel como *fuera del área*.
- Amarillo = provincia de la lista, violeta = distrito de la lista. El tooltip muestra lo más específico de la lista bajo el cursor.
- Clic en el mapa o en la lista del panel = acercarse a esa zona. Los combos solo ofrecen lo que está en la lista.
- **Descargar Excel**: la lista con los datos de `datos.xlsx` (población, hombres, mujeres, densidad).
- Los nombres se buscan en `datos.xlsx` sin importar tildes ni Ñ. Si alguno sale con ⚠ *no encontrado*, revisa cómo está escrito.
- **Qué se dibuja** (columnas de `lista_trabajo.xlsx`, explicado también en su hoja `LEEME`):
  - `MOSTRAR` en filas DEPARTAMENTO: `TODO` = completo (Junín); `SOLO LISTA` = solo sus provincias/distritos de la
    lista (Huancavelica: Acobamba, Churcampa, Tayacaja y Palca).
  - `OCULTAR = SI` en una fila PROVINCIA o DISTRITO = excepción: esa zona no se dibuja.
  - Para agregar una zona, agrega su fila; para quitarla, bórrala o pon `OCULTAR = SI`.
- Edita la lista, guarda y recarga la página (F5).

### Territorio del mapa: `competencias.xlsx`

El mapa de trabajo dibuja solo el territorio que la Corte atiende, leído de la columna
**"Competencia (Territorial)"** de `competencias.xlsx` (una fila por órgano jurisdiccional):

- "PROVINCIA(S) DE A, B Y C" → esas provincias completas.
- "DISTRITO(S) DE X, Y Y Z" → solo esos distritos (ej. Chinchihuasi, Paucarbamba y Pachamarca de Churcampa).
- Entiende alias (La Oroya = Yauli, Pampas = Tayacaja, Cajas = San Agustín), aclaraciones como
  "(PROVINCIA DE CHURCAMPA)" o "DE LA PROVINCIA DE TAYACAJA", y corrige errores de tipeo.
- Un distrito con nombre repetido (Palca, Acobamba...) se busca primero en la provincia de la sede del órgano.
- Junín y Huancavelica se dibujan completos: los distritos **sin competencia territorial** van en gris
  rayado (con su nombre apagado y un aviso en el tooltip) y no se pueden filtrar.
- Lo que no reconozca aparece en "Revisar" del panel. Edita el Excel, guarda y recarga (F5).

`lista_trabajo.xlsx` ya no define el mapa (lo reemplaza `competencias.xlsx`).

### Dashboard de la CSJ Junín (5 pestañas) — datos en `dashboard.xlsx`

`http://localhost:8000/trabajo` es un dashboard con gráficos ECharts (`vendor/echarts.min.js`, funciona sin internet):

1. **Proyecciones poblacionales**: población proyectada por provincia, población del año elegido,
   jueces por 100 mil habitantes (con el total de la Corte y la referencia nacional) y varones/mujeres por provincia.
2. **Resumen y detalle por provincia**: el mapa con los combos. Al elegir una zona (combo, clic en el mapa o en una
   barra) las tarjetas, las donas de género y condición, las barras por instancia y la tabla de jueces muestran
   solo esa zona. "✕ Ver toda la Corte" quita el filtro.
3. **Carga procesal**: carga/ingresos/resueltos por año, resueltos por especialidad, carga acumulada (%),
   ingresos, tasa de resolución y órganos con sobrecarga.
4. **Audiencias**: NCPP por sede y SNEJ por juzgado (programadas, tasa de atención, acumulado y tasa del año elegido).
5. **Personal jurisdiccional**: total, régimen laboral, cargos con más personal y tabla de todos los cargos.

`dashboard.xlsx` tiene una hoja por tema, todas planas (una fila por registro, sin títulos ni totales; el dashboard
suma solo). Su hoja `LEEME` explica cada hoja. Edita, guarda y recarga la página (F5).
Los colores de los gráficos están al inicio de `graficos.js` (`COLOR`). Los íconos (SVG) están en `iconos.svg`:
se usan con `<svg class="ic"><use href="/iconos.svg#mazo"/></svg>` y toman el color del texto.
El tooltip del mapa (oscuro, estilo INEI) se personaliza al inicio de `tooltip.js`.

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
