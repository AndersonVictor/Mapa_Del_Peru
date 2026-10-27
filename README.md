# Dashboard CSJ Junín

Dashboard web de la Corte Superior de Justicia de Junín: proyecciones poblacionales, mapa del
territorio con competencia, carga procesal, audiencias y personal jurisdiccional.
Backend en Python (biblioteca estándar + `openpyxl`); frontend estático con MapLibre GL y ECharts
servidos localmente (sin CDN).

## Requisitos

- Python 3.10+
- `pip install -r requirements.txt`

## Instalación y despliegue

```bash
pip install -r requirements.txt
python server.py           # escucha en 0.0.0.0:8000
```

Aplicación: `http://<host>:8000/trabajo`

- `cache_tiles/` (≈20 MB, tiles vectoriales de Junín y Huancavelica) viene incluido en el
  repositorio: el servidor funciona sin conexión a internet y no realiza consultas externas.
- El puerto se define en `server.py` (`PORT`). Para producción se recomienda ejecutarlo como
  servicio (systemd / NSSM) detrás de un proxy inverso.

## Fuentes de datos (Excel)

Los archivos se leen en caliente: al guardar un cambio basta recargar la página, sin reiniciar.

| Archivo             | Contenido                                                                    |
|---------------------|------------------------------------------------------------------------------|
| `dashboard.xlsx`    | Magistrados, órganos, población, carga procesal, audiencias y personal. Una hoja por tema, formato plano; la hoja `LEEME` describe cada una. |
| `competencias.xlsx` | Competencia territorial por órgano jurisdiccional; define el territorio dibujado en el mapa. |
| `datos.xlsx`        | Catálogo de zonas de Junín y Huancavelica (departamento/provincia/distrito) con datos de población; resuelve nombres a geometrías. No modificar `id_geografia` ni encabezados. |

## Estructura

```
server.py            Servidor HTTP y API (/api/jueces, /api/territorio, /api/datos, /tiles/...)
jueces.py            Agregación de dashboard.xlsx
territorio.py        Interpretación de competencias.xlsx (alias, tolerancia a errores de tipeo)
geo.py               Lectura de tiles vectoriales (extensión y centro de cada zona)
trabajo.html         Interfaz del dashboard
graficos.js          Gráficos (ECharts); paleta en la constante COLOR
filtro.js            Filtros por departamento/provincia/distrito
tooltip.js           Tooltip del mapa
iconos.svg           Sprite de íconos
src/img/             Imágenes del encabezado
vendor/              MapLibre GL y ECharts
cache_tiles/         Tiles vectoriales del mapa (incluidos)
```

## Notas

- En Windows, cerrar el Excel antes de reemplazar el archivo en el servidor (bloqueo de archivos).
