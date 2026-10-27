// Combos Departamento -> Provincia -> Distrito, compartidos por el mapa general y el de trabajo.
// Los nombres salen de datos.xlsx (/api/datos) y la extensión de cada zona de /api/extensiones.
(function () {
  const COLOR_COMBO = '#0056a1'; // color del combo elegido y de la opción marcada
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
    .etq { pointer-events: none !important; white-space: nowrap; font: 600 12px system-ui, sans-serif; color: #1f2937;
      text-transform: uppercase; letter-spacing: .03em;
      text-shadow: 0 0 2px #fff, 0 0 2px #fff, 0 0 3px #fff, 0 0 4px #fff; }
    .etq.dep { font-size: 13px; font-weight: 800; color: #374151; }
    .etq.prov { font-size: 12px; }
    .etq.apagada { color: #9ca3af; font-weight: 500; }
    .etq.dest { color: #0b63ce; font-size: 13px; font-weight: 800; }
    /* combos: botón + lista desplegable con círculos de selección.
       COLOR_COMBO es el color de lo elegido: cámbialo aquí. */
    .combo { --c: ${COLOR_COMBO}; position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
    .combo > span { font: 600 11.5px system-ui, sans-serif; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
    .combo select { display: none; }
    .combo-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; text-align: left;
      font: 700 13.5px system-ui, sans-serif; padding: 9px 12px; border: 1px solid #d9dde5; border-radius: 10px;
      background: #fff; color: #1f2937; cursor: pointer; transition: background-color .15s, border-color .15s, color .15s; }
    .combo-btn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .combo-btn svg { width: 14px; height: 14px; flex: none; transition: transform .15s; }
    .combo-btn:hover:not(:disabled) { border-color: var(--c); }
    .combo-btn:disabled { opacity: .5; cursor: default; }
    .combo.elegido .combo-btn { background: var(--c); border-color: var(--c); color: #fff; }
    .combo.abierto .combo-btn svg { transform: rotate(180deg); }
    .combo-menu { position: absolute; top: calc(100% + 6px); left: 0; min-width: 100%; width: max-content; max-width: 300px; z-index: 40;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 12px 32px rgba(16,24,40,.16);
      overflow: hidden; display: none; }
    .combo.abierto .combo-menu { display: block; }
    .combo-menu .tit { font: 700 11.5px system-ui, sans-serif; color: #9ca3af; text-transform: uppercase; letter-spacing: .06em;
      padding: 10px 12px 6px; border-bottom: 1px solid #f1f2f5; }
    .combo-menu .ops { max-height: 290px; overflow-y: auto; padding: 4px 0; }
    .combo-op { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 0; background: none;
      font: 600 13.5px system-ui, sans-serif; color: #1f2937; text-align: left; cursor: pointer; transition: background-color .12s; }
    .combo-op:hover, .combo-op:focus-visible { background: #f3f6fa; outline: none; }
    .combo-op .radio { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--c); flex: none;
      display: flex; align-items: center; justify-content: center; }
    .combo-op.sel { background: var(--c); color: #fff; font-weight: 800; }
    .combo-op.sel .radio { border-color: #fff; }
    .combo-op.sel .radio::after { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #fff; }`;
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
    return async (ids, nombreDe, destacado, apagado = () => false) => {
      const mio = ++turno;
      const ext = await extensiones();
      if (mio !== turno) return; // llegó otro pedido mientras tanto
      marcas.forEach(m => m.marker.remove());
      marcas = ids.filter(g => ext[g]).map(g => {
        const e = ext[g];
        // centro del polígono; si el servidor aún no lo calculó, el centro de la caja
        const punto = e.length >= 6 ? [e[4], e[5]] : [(e[0] + e[2]) / 2, (e[1] + e[3]) / 2];
        const el = document.createElement('div');
        el.className = 'etq ' + ({ 7: 'dep', 8: 'prov', 9: 'dist' }[g[0]]) + (g === destacado ? ' dest' : apagado(g) ? ' apagada' : '');
        el.textContent = nombreDe(g);
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(punto).addTo(map);
        // los nombres apagados (sin competencia) ceden su lugar a los demás
        const base = e[6] ?? (e[2] - e[0]) * (e[3] - e[1]);
        return { el, marker, prioridad: g === destacado ? Infinity : apagado(g) ? base / 1e6 : base };
      }).sort((a, b) => b.prioridad - a.prioridad);
      requestAnimationFrame(acomodar);
    };
  }

  // opciones: { map, contenedor, datos, area (Set de ids de departamento o null), permitido(gid): qué sale en los combos,
  //             rotulable(gid): qué zonas pueden llevar nombre, etiquetasIniciales(): ids con nombre sin elegir nada,
  //             alElegir(gid|null) }
  function crear({ map, contenedor, datos, area = null, permitido = () => true, rotulable = () => true,
                   etiquetasIniciales = null, apagado = () => false, alElegir }) {
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
      ponerEtiquetas(lista, g => nombre(datos, g), sDist.value || null, apagado);
    };

    contenedor.innerHTML = '';
    // Cada combo: un <select> oculto que guarda el valor (y dispara 'change'), un botón y una lista
    const flecha = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';
    const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const combo = (titulo, texto) => {
      const caja = document.createElement('div');
      caja.className = 'combo';
      caja.innerHTML = `<span>${titulo}</span><button type="button" class="combo-btn" aria-haspopup="listbox"><span></span>${flecha}</button>
        <div class="combo-menu" role="listbox"><div class="tit">Seleccionar</div><div class="ops"></div></div>`;
      const s = document.createElement('select');
      caja.appendChild(s);
      contenedor.appendChild(caja);
      const btn = caja.querySelector('.combo-btn'), ops = caja.querySelector('.ops');
      s.refrescar = () => {
        btn.firstChild.textContent = s.options[s.selectedIndex]?.text || texto;
        btn.disabled = s.disabled;
        caja.classList.toggle('elegido', !!s.value);
      };
      s.llenar = (lista) => {
        s.replaceChildren(new Option(texto, ''), ...lista.map(g => new Option(nombre(datos, g), g)));
        s.disabled = !lista.length;
        s.refrescar();
      };
      const cerrar = () => caja.classList.remove('abierto');
      btn.onclick = () => {
        const abrir = !caja.classList.contains('abierto');
        document.querySelectorAll('.combo.abierto').forEach(c => c.classList.remove('abierto'));
        if (!abrir) return;
        ops.innerHTML = [...s.options].map(o => `<button type="button" role="option" class="combo-op${o.value === s.value ? ' sel' : ''}" data-v="${esc(o.value)}">
          <span class="radio"></span><span>${esc(o.text)}</span></button>`).join('');
        caja.classList.add('abierto');
        (ops.querySelector('.sel') || ops.firstElementChild)?.scrollIntoView({ block: 'nearest' });
      };
      ops.onclick = e => {
        const op = e.target.closest('.combo-op');
        if (!op) return;
        cerrar();
        if (op.dataset.v === s.value) return;
        s.value = op.dataset.v;
        s.dispatchEvent(new Event('change'));
      };
      caja.addEventListener('keydown', e => { if (e.key === 'Escape') { cerrar(); btn.focus(); } });
      return s;
    };
    // un clic fuera cierra cualquier lista abierta
    if (!window.__combosCierre) {
      window.__combosCierre = true;
      document.addEventListener('click', e => { if (!e.target.closest('.combo')) document.querySelectorAll('.combo.abierto').forEach(c => c.classList.remove('abierto')); });
    }
    const sDep = combo('Departamento', 'Todos'), sProv = combo('Provincia', 'Todas'), sDist = combo('Distrito', 'Todos');
    // texto del botón y color de "elegido" según el valor de cada combo
    const pintar = () => [sDep, sProv, sDist].forEach(s => s.refrescar());
    sDep.llenar(deps); sProv.llenar([]); sDist.llenar([]);

    const elegir = () => {
      const gid = sDist.value || sProv.value || sDep.value || null;
      marcar(map, gid);
      etiquetar();
      pintar();
      alElegir?.(gid);
    };
    sDep.onchange = () => { sProv.llenar(sDep.value ? provDe(sDep.value) : []); sDist.llenar([]); elegir(); };
    sProv.onchange = () => { sDist.llenar(sProv.value ? distDe(sProv.value) : []); elegir(); };
    sDist.onchange = elegir;

    etiquetar();
    return {
      reiniciar() { sDep.value = ''; sProv.llenar([]); sDist.llenar([]); marcar(map, null); etiquetar(); pintar(); },
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
