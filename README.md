# Tukuy Rikuy - Dashboard CSJ Junín

Dashboard de la Corte Superior de Justicia de Junín con el mapa del territorio (Junín y Huancavelica)
y el apartado de Gestión Administrativa.

## Arquitectura

La aplicación tiene tres capas y no usa base de datos.

```
Navegador (HTML + JS)  ->  server.py (Python)  ->  Excel (.xlsx) + tiles/
```

- **Frontend:** páginas HTML estáticas con JavaScript sin framework. Los gráficos usan ECharts y el mapa usa MapLibre GL. Las dos librerías están en `vendor/`, así que no se carga nada desde un CDN.
- **Backend:** `server.py` usa solo la librería estándar de Python (`http.server`). Sirve las páginas y una API JSON (`/api/jueces`, `/api/gestion`, `/api/territorio`, `/api/datos`). Cada vez que se pide un dato, lee los Excel.
- **Datos:** los Excel son la fuente de datos; no hay base de datos. El mapa base son tiles vectoriales del INEI de Junín y Huancavelica, que vienen en `tiles/` (unos 20 MB). No necesita internet.

| Archivo | Responsabilidad |
|---|---|
| `server.py` | servidor HTTP y rutas |
| `jueces.py` | magistrados, órganos, carga y población |
| `territorio.py` | competencia territorial |
| `geo.py` | lectura de los tiles (extensión de cada zona) |
| `gestion.py` | indicadores de Gestión Administrativa |
| `trabajo.html`, `graficos.js` | dashboard principal |
| `gestion.html`, `gestion.js` | Gestión Administrativa |
| `filtro.js`, `tooltip.js` | mapa y tooltip |

## Requisitos

- Python 3.10 o superior (probado con 3.14).
- `openpyxl`.
- El puerto 8000 libre.

## Instalación

```
pip install -r requirements.txt
python server.py
```

## Despliegue en subdominio

`server.py` escucha en `0.0.0.0:8000`. En producción va detrás de un proxy inverso (IIS, Nginx o Apache), que atiende el subdominio con HTTPS y reenvía las peticiones a `http://localhost:8000`. Las rutas son absolutas desde `/`, por eso el subdominio debe apuntar a la raíz y no a una subcarpeta.

Para que siga activo cuando se reinicia el equipo, `python server.py` se registra como servicio, por ejemplo con NSSM o el Programador de tareas en Windows.

## Rutas

| Ruta | Página |
|---|---|
| `/` | Dashboard |
| `/gestion` | Gestión Administrativa |
| `/trabajo` | redirige a `/` |

## Archivos de datos

- `dashboard.xlsx`: magistrados, órganos, población, carga procesal, audiencias y personal. La hoja `LEEME` explica cada hoja.
- `competencias.xlsx`: competencia territorial de cada órgano. Define qué provincias y distritos se dibujan en el mapa. Los distritos que la Corte no ve aunque su provincia figure completa (hoy Monobamba) van en `EXCLUIDOS` de `territorio.py`.
- `gestion_administrativa.xlsx`: indicadores de Gestión Administrativa. Se crea con `python crear_gestion.py`
  (`--todo` lo vuelve a crear desde cero).
- `datos.xlsx`: nombres y población de cada departamento, provincia y distrito de Junín y Huancavelica (tooltip del mapa). No cambiar `id_geografia` ni los encabezados.
- `proyeccion_poblacion.xlsx`: cálculo de la proyección 2026-2031 con los censos 2017 y 2025. Es de consulta, el servidor no lo lee.

Después de editar un Excel basta con guardar y recargar la página (F5). Cerrar el Excel antes de correr los scripts.

## Gestión Administrativa

- Se muestra el último corte validado de cada indicador.
- Los años incompletos llevan la etiqueta *parcial*.
- Si hay cifras observadas aparece la pestaña *Cifras por validar*; si todo está validado, el servidor no la envía.

## Personalizar

- Colores de los gráficos: `COLOR` en `graficos.js`.
- Tooltip del mapa: inicio de `tooltip.js`.
- Íconos: `iconos.svg`.
