"""Descarga UNA SOLA VEZ todo lo que el mapa necesita, para trabajar 100% local:

  1. Los tiles del mapa de Perú (cache_tiles/), del zoom 0 al --zoom indicado.
  2. Los textos del tooltip de todos los departamentos, provincias y distritos (datos.xlsx).

    python descargar_todo.py              # zoom máximo 10 (~2 800 tiles), suficiente para distritos
    python descargar_todo.py --zoom 11    # más detalle en los bordes (~11 000 tiles)

Se puede cortar y volver a correr: lo ya descargado no se vuelve a pedir.
Va despacio a propósito (pocas conexiones y una pausa) para no cargar el servidor del INEI.
"""
import sys, time, urllib.error
from concurrent.futures import ThreadPoolExecutor

import actualizar_excel
from actualizar_excel import tiles_peru
from server import TILE_DIR, fetch_tile

HILOS = 4
PAUSA = 0.1  # segundos entre pedidos de cada hilo


def bajar(t):
    z, x, y = t
    if (TILE_DIR / str(z) / str(x) / f"{y}.pbf").exists():
        return True
    for intento in range(4):
        try:
            fetch_tile(z, x, y)
            time.sleep(PAUSA)
            return True
        except Exception as e:
            err = e
            if isinstance(e, urllib.error.HTTPError) and e.code < 500:
                break  # error del pedido, reintentar no sirve
            time.sleep(2 ** intento)
    print(f"  no se pudo bajar {z}/{x}/{y}: {err}")
    return False


def main():
    zmax = int(sys.argv[sys.argv.index("--zoom") + 1]) if "--zoom" in sys.argv else 10
    tiles = [t for z in range(zmax + 1) for t in tiles_peru(z)]
    print(f"1/2 Tiles: {len(tiles)} (zoom 0-{zmax}) en {TILE_DIR.name}/")
    fallos = 0
    with ThreadPoolExecutor(HILOS) as ex:
        for k, ok in enumerate(ex.map(bajar, tiles), 1):
            fallos += not ok
            if k % 100 == 0 or k == len(tiles):
                print(f"  {k}/{len(tiles)}")
    if fallos:
        print(f"  {fallos} tiles fallaron: vuelve a correr el script para reintentarlos.")

    print("2/2 Textos del tooltip -> datos.xlsx")
    actualizar_excel.main()
    print("Listo. Ahora:  python server.py  (ya no consulta al INEI)")


if __name__ == "__main__":
    main()
