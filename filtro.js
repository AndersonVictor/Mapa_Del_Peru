// Combos Departamento -> Provincia -> Distrito, compartidos por el mapa general y el de trabajo.
// Los nombres salen de datos.xlsx (/api/datos) y la extensión de cada zona de /api/extensiones.
(function () {
  const N = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  const CAMPO = { 7: 'nombregion', 8: 'nombprov', 9: 'nombdist' };
  const CAPA = { 7: 'tb_region', 8: 'tb_provincia', 9: 'tb_distrito' };
  const nombre = (datos, g) => datos[g]?.[CAMPO[g[0]]] || g;

  let ext = null; // se pide una sola vez, recién cuando hace falta
  const extensiones = () => ext || (ext = fetch('/api/extensiones').then(r => r.json()).catch(() => { ext = null; return {}; }));

  // Acerca el mapa a la zona. Devuelve false si no se conoce su extensión.
  async function acercar(map, gid) {
    const b = (await extensiones())[gid];
    if (!b) return false;
    map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 50, maxZoom: 12, duration: 900 });
    return true;
  }

  // Contorno azul de la zona elegida en el combo (una capa por nivel)
  const NADA = ['boolean', false];
  function agregarSeleccion(map, source) {
    for (const capa of Object.values(CAPA))
      map.addLayer({ id: 'sel-' + capa, type: 'line', source, 'source-layer': capa, filter: NADA,
        paint: { 'line-color': '#0b63ce', 'line-width': 3 } });
  }
  function marcar(map, gid) {
    for (const capa of Object.values(CAPA))
      map.setFilter('sel-' + capa, gid && CAPA[gid[0]] === capa
        ? ['==', ['to-number', ['get', 'id_geografia']], +gid] : NADA);
  }

  // --- Nombres sobre el mapa (etiquetas HTML: no necesitan fuentes descargadas) ---
  const css = document.createElement('style');
  css.textContent = `
    .etq { pointer-events: none !important; white-space: nowrap; font: 600 11px system-ui, sans-serif; color: #1f2937;
      text-transform: uppercase; letter-spacing: .03em;
      text-shadow: 0 0 2px #fff, 0 0 2px #fff, 0 0 3px #fff, 0 0 4px #fff; }
    .etq.dep { font-size: 13px; font-weight: 800; color: #374151; }
    .etq.prov { font-size: 12px; }
    .etq.dest { color: #0b63ce; font-size: 13px; font-weight: 800; }`;
  document.head.appendChild(css);

  function crearEtiquetas(map) {
    let marcas = [], turno = 0;
    // Oculta las que se tapan entre sí: primero la elegida, luego las zonas más grandes
    const acomodar = () => {
      const puestos = [];
      for (const m of marcas) {
        m.el.style.visibility = 'visible';
        const r = m.el.getBoundingClientRect();
        const choca = puestos.some(p => r.left < p.right + 4 && r.right > p.left - 4 && r.top < p.bottom + 2 && r.bottom > p.top - 2);
        if (choca) m.el.style.visibility = 'hidden'; else puestos.push(r);
      }
    };
    map.on('moveend', acomodar);
    return async (ids, nombreDe, destacado) => {
      const mio = ++turno;
      const ext = await extensiones();
      if (mio !== turno) return; // llegó otro pedido mientras tanto
      marcas.forEach(m => m.marker.remove());
      marcas = ids.filter(g => ext[g]).map(g => {
        const e = ext[g];
        // centro del polígono; si el servidor aún no lo calculó, el centro de la caja
        const punto = e.length >= 6 ? [e[4], e[5]] : [(e[0] + e[2]) / 2, (e[1] + e[3]) / 2];
        const el = document.createElement('div');
        el.className = 'etq ' + ({ 7: 'dep', 8: 'prov', 9: 'dist' }[g[0]]) + (g === destacado ? ' dest' : '');
        el.textContent = nombreDe(g);
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(punto).addTo(map);
        return { el, marker, prioridad: g === destacado ? Infinity : e[6] ?? (e[2] - e[0]) * (e[3] - e[1]) };
      }).sort((a, b) => b.prioridad - a.prioridad);
      requestAnimationFrame(acomodar);
    };
  }

  // opciones: { map, contenedor, datos, area (Set de ids de departamento o null), permitido(gid): qué sale en los combos,
  //             rotulable(gid): qué zonas pueden llevar nombre, etiquetasIniciales(): ids con nombre sin elegir nada,
  //             alElegir(gid|null) }
  function crear({ map, contenedor, datos, area = null, permitido = () => true, rotulable = () => true,
                   etiquetasIniciales = null, alElegir }) {
    const ids = Object.keys(datos);
    const orden = (a, b) => nombre(datos, a).localeCompare(nombre(datos, b), 'es');
    const deps = ids.filter(g => g[0] === '7' && (!area || area.has(g))).sort(orden);
    const provDe = r => ids.filter(g => g[0] === '8' && permitido(g) &&
      (g.slice(1, 3) === r.slice(1, 3) || N(datos[g].nombregion) === N(datos[r].nombregion))).sort(orden);
    const distDe = p => ids.filter(g => g[0] === '9' && permitido(g) &&
      (g.slice(1, 5) === p.slice(1, 5) ||
       (N(datos[g].nombprov) === N(datos[p].nombprov) && N(datos[g].nombregion) === N(datos[p].nombregion)))).sort(orden);

    // Nombres en el mapa: departamento elegido -> sus provincias; provincia elegida -> sus distritos.
    // Se muestran todas (no solo las de la lista) para ubicarse mejor.
    const todas = { provDe: r => ids.filter(g => g[0] === '8' && g.slice(1, 3) === r.slice(1, 3)),
                    distDe: p => ids.filter(g => g[0] === '9' && g.slice(1, 5) === p.slice(1, 5)) };
    const ponerEtiquetas = crearEtiquetas(map);
    const etiquetar = () => {
      const lista = sProv.value ? todas.distDe(sProv.value).filter(rotulable)
                  : sDep.value ? todas.provDe(sDep.value).filter(rotulable).concat(  // + distritos sueltos visibles
                      ids.filter(g => g[0] === '9' && g.slice(1, 3) === sDep.value.slice(1, 3) && rotulable(g) &&
                                      !rotulable('8' + g.slice(1, 5) + '00')))
                  : etiquetasIniciales ? etiquetasIniciales() : deps;
      ponerEtiquetas(lista, g => nombre(datos, g), sDist.value || null);
    };

    contenedor.innerHTML = '';
    const combo = (texto) => {
      const s = document.createElement('select');
      s.setAttribute('aria-label', texto);
      contenedor.appendChild(s);
      s.llenar = (lista) => {
        s.replaceChildren(new Option(texto, ''), ...lista.map(g => new Option(nombre(datos, g), g)));
        s.disabled = !lista.length;
      };
      return s;
    };
    const sDep = combo('Departamento (todos)'), sProv = combo('Provincia (todas)'), sDist = combo('Distrito (todos)');
    sDep.llenar(deps); sProv.llenar([]); sDist.llenar([]);

    const elegir = () => {
      const gid = sDist.value || sProv.value || sDep.value || null;
      marcar(map, gid);
      etiquetar();
      alElegir?.(gid);
    };
    sDep.onchange = () => { sProv.llenar(sDep.value ? provDe(sDep.value) : []); sDist.llenar([]); elegir(); };
    sProv.onchange = () => { sDist.llenar(sProv.value ? distDe(sProv.value) : []); elegir(); };
    sDist.onchange = elegir;

    etiquetar();
    return {
      reiniciar() { sDep.value = ''; sProv.llenar([]); sDist.llenar([]); marcar(map, null); etiquetar(); },
      // Pone los combos en una zona (p. ej. al hacer clic en la lista del mapa de trabajo)
      ir(gid) {
        const dep = gid[0] === '7' ? gid : deps.find(r => (gid[0] === '8' ? provDe(r) : provDe(r).flatMap(distDe)).includes(gid));
        if (!dep) return false;
        sDep.value = dep; sProv.llenar(provDe(dep)); sDist.llenar([]);
        if (gid[0] !== '7') {
          const prov = gid[0] === '8' ? gid : provDe(dep).find(p => distDe(p).includes(gid));
          sProv.value = prov || ''; sDist.llenar(prov ? distDe(prov) : []);
          if (gid[0] === '9') sDist.value = gid;
        }
        elegir();
        return true;
      }
    };
  }

  window.Filtro = { crear, acercar, agregarSeleccion, marcar, extensiones, N, CAPA, nombre };
})();
