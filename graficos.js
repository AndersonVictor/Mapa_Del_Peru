// =====================================================================================
//  GRÁFICOS DEL DASHBOARD (Apache ECharts). Una función por pestaña.
//  Los datos vienen de dashboard.xlsx (vía /api/jueces -> tablas) y aquí se suman.
//  Colores: cámbialos en COLOR.
// =====================================================================================
(function () {
  const COLOR = {
    varon: '#0056a1', mujer: '#e8559a',
    titular: '#16a34a', supern: '#f59e0b', provis: '#8b5cf6',
    sala: '#1e3a8a', jesp: '#0a84d0', jpl: '#8a80f5',
    carga: '#f59e0b', ingresos: '#0a84d0', resueltos: '#16a34a',
    programadas: '#93c5fd', atendidas: '#0056a1', suspendidas: '#e05d6f',
    granate: '#7f1d2d', gris: '#cbd5e1',
  };
  const PALETA = ['#0056a1', '#33b3a9', '#8a80f5', '#f59e0b', '#e05d6f', '#0a84d0', '#16a34a', '#7f1d2d', '#94a3b8', '#c084fc'];
  const TEXTO = '#111827', SUAVE = '#6b7280', REJILLA = '#eef0f4';
  const icono = (id, color) => `<svg class="ic" style="color:${color}"><use href="/iconos.svg#${id}"/></svg>`;

  const N = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  // números con espacio de miles: 1 074 · 49,4
  const fmt = n => (n == null || isNaN(n) ? '–' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 1 })
    .replace(/,/g, ' ').replace('.', ','));
  // ejes: 1 200 000 -> "1.2 M", 35 000 -> "35 mil"
  const corto = v => Math.abs(v) >= 1e6 ? fmt(v / 1e6) + ' M' : Math.abs(v) >= 1e3 ? fmt(v / 1e3) + ' mil' : fmt(v);
  const num = v => (typeof v === 'number' ? v : parseFloat(v) || 0);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const unicos = (xs) => [...new Set(xs)];
  const $ = id => document.getElementById(id);

  let T = {};                 // tablas de dashboard.xlsx
  let sel = null;             // id de la zona elegida en el mapa (7/8/9...) o null
  let alClicProvincia = null; // callback: clic en una barra de provincia -> filtrar el mapa
  const charts = {};
  const pintados = {};
  let tabActual = null;

  // --- utilidades de ECharts ---
  const BASE = {
    textStyle: { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', color: SUAVE },
    animationDuration: 500,
  };
  const TIP = { confine: true, backgroundColor: 'rgba(58,15,24,.96)', borderColor: 'rgba(245,158,11,.45)', borderWidth: 1,
    padding: [8, 12], textStyle: { color: '#fff', fontSize: 13 }, extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);' };
  function grafico(id, opcion, alClic) {
    const el = $(id);
    if (!el) return null;
    let c = charts[id];
    if (c && c.getDom() !== el) { c.dispose(); c = null; }  // el contenedor se volvió a crear (ej. mini gráficos)
    if (!c) {
      c = charts[id] = echarts.init(el);
      if (alClic) c.on('click', alClic);
    }
    // estilo común: tooltip oscuro y barras con esquinas redondeadas (las apiladas, rectas)
    const op = Object.assign({}, BASE, opcion, { tooltip: Object.assign({}, TIP, opcion.tooltip) });
    const horizontal = !Array.isArray(op.yAxis) && op.yAxis?.type === 'category';
    const radio = horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0];
    const pilas = {};
    for (const s of [].concat(op.series || [])) {
      if (s.type !== 'bar') continue;
      s.barMaxWidth = s.barMaxWidth || 34;
      if (!s.stack) s.itemStyle = Object.assign({ borderRadius: radio }, s.itemStyle);
      else { s.labelLayout = { hideOverlap: true }; (pilas[s.stack] = pilas[s.stack] || []).push(s); }
    }
    // Barras apiladas: se redondea solo el tramo de arriba de cada columna (se ve como una sola barra)
    for (const series of Object.values(pilas)) {
      const largo = Math.max(...series.map(s => (s.data || []).length));
      for (let i = 0; i < largo; i++) {
        const tope = series.slice().reverse().find(s => { const d = s.data?.[i]; const v = d && typeof d === 'object' ? d.value : d; return v; });
        if (!tope) continue;
        const d = tope.data[i];
        tope.data[i] = d && typeof d === 'object'
          ? Object.assign({}, d, { itemStyle: Object.assign({}, d.itemStyle, { borderRadius: radio }) })
          : { value: d, itemStyle: { borderRadius: radio } };
      }
    }
    c.setOption(op, true);
    return c;
  }
  const leyenda = (extra) => Object.assign({ top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 14, textStyle: { fontSize: 12.5, color: SUAVE } }, extra);
  const rejilla = (extra) => Object.assign({ left: 8, right: 14, top: 32, bottom: 6, containLabel: true }, extra);
  const ejeNum = (extra) => Object.assign({ type: 'value', axisLabel: { fontSize: 11.5, color: '#9ca3af', formatter: corto },
    splitLine: { lineStyle: { color: REJILLA } }, axisLine: { show: false } }, extra);
  const ejeCat = (datos, extra) => Object.assign({ type: 'category', data: datos, axisLabel: { fontSize: 12, color: SUAVE },
    axisTick: { show: false }, axisLine: { lineStyle: { color: '#e5e7eb' } } }, extra);
  // Dona: anillo grueso, separaciones, sin textos encima (la leyenda va debajo, en HTML)
  const dona = (datos, extra) => Object.assign({
    type: 'pie', radius: ['60%', '88%'], center: ['50%', '50%'], padAngle: 2.5,
    itemStyle: { borderRadius: 6 }, label: { show: false }, labelLine: { show: false },
    emphasis: { scale: true, scaleSize: 4 }, data: datos,
  }, extra);
  // Leyenda debajo de la dona: ícono (o color), nombre, número grande y porcentaje
  function leyendaDona(id, items) {
    const el = $(id + '-ley');
    if (!el) return;
    const total = items.reduce((s, x) => s + x.value, 0);
    el.innerHTML = items.map(x => `<div><div class="t">${x.icono ? icono(x.icono, x.color) : `<i style="background:${x.color}"></i>`}${esc(x.name)}</div>
      <b>${fmt(x.value)}</b><small>${total ? fmt(x.value / total * 100) : 0}%</small></div>`).join('');
  }
  const tipDona = { trigger: 'item', formatter: p => `<b>${esc(p.name)}</b><br>${fmt(p.value)} · ${fmt(p.percent)}%` };

  // --- filtro por zona del mapa ---
  const enSel = r => !sel || (sel[0] === '7' ? String(r.prov_id || '').slice(1, 3) === sel.slice(1, 3)
                            : sel[0] === '8' ? r.prov_id === sel : r.dist_id === sel);
  const esVaron = r => N(r.SEXO).startsWith('VAR');
  const esMujer = r => N(r.SEXO).startsWith('MUJ');
  const cond = r => N(r.CONDICION)[0]; // T / S / P
  const inst = r => { const i = N(r.INSTANCIA); return i === 'SALA' ? 'SALA' : i === 'JPL' ? 'JPL' : 'J. ESP.'; };
  const INST = ['J. ESP.', 'SALA', 'JPL'];

  function provincias() {
    // provincias con jueces, de mayor a menor
    const m = T.Magistrados || [];
    const ps = unicos(m.map(r => r.PROVINCIA)).map(nombre => {
      const filas = m.filter(r => r.PROVINCIA === nombre);
      return { nombre, id: filas[0]?.prov_id, filas };
    });
    return ps.sort((a, b) => b.filas.length - a.filas.length);
  }
  // ¿la provincia contiene la zona elegida? (para atenuar las demás barras)
  const resaltada = p => !sel || p.filas.some(enSel);
  const barra = (v, p, color) => ({ value: v, itemStyle: { color, opacity: resaltada(p) ? 1 : 0.25 } });

  // ================= Tarjetas de arriba =================
  function kpis(nombreSel) {
    const m = (T.Magistrados || []).filter(enSel), o = (T.Organos || []).filter(enSel);
    const set = (id, v) => { const e = $(id); if (e) e.textContent = typeof v === 'number' ? fmt(v) : v; };
    set('k-total', m.length); set('k-organos', o.length);
    // cada tarjeta: número, % del total y barra
    const parte = (id, n) => {
      const p = m.length ? n / m.length * 100 : 0;
      set('k-' + id, n); set('k-' + id + '-p', fmt(p) + '%');
      const bar = $('k-' + id + '-bar'); if (bar) bar.style.width = p + '%';
    };
    parte('var', m.filter(esVaron).length); parte('muj', m.filter(esMujer).length);
    parte('tit', m.filter(r => cond(r) === 'T').length);
    parte('sup', m.filter(r => cond(r) === 'S').length);
    parte('prov', m.filter(r => cond(r) === 'P').length);
    const f = $('filtro-activo');
    if (f) { f.hidden = !sel; set('k-sel', nombreSel || ''); }
  }

  // ================= 1) Proyecciones poblacionales =================
  function pintarPoblacion() {
    const P = T.Poblacion || [];
    if (!P.length) return;
    const anios = unicos(P.map(r => r['AÑO'])).sort();
    const selAnio = $('pob-anio');
    if (selAnio && !selAnio.options.length) {
      selAnio.innerHTML = anios.map(a => `<option>${a}</option>`).join('');
      selAnio.onchange = () => { pintados.pob = false; pintarPoblacion(); };
    }
    const anio = +(selAnio?.value || anios[0]);
    const total = r => num(r.VARONES) + num(r.MUJERES);
    const provs = unicos(P.map(r => r.PROVINCIA));
    const pobDe = (p, a) => P.filter(r => r.PROVINCIA === p && r['AÑO'] === a).reduce((s, r) => s + total(r), 0);
    // color fijo por provincia (orden por población del primer año): igual en ambos gráficos y en todos los años
    const fijo = provs.slice().sort((a, b) => pobDe(b, anios[0]) - pobDe(a, anios[0]));
    const colorDe = p => PALETA[fijo.indexOf(p) % PALETA.length];
    provs.sort((a, b) => pobDe(b, anio) - pobDe(a, anio));

    // Área apilada: población total proyectada por provincia
    grafico('c-pob-area', {
      tooltip: { trigger: 'axis', valueFormatter: fmt },
      legend: leyenda(), grid: rejilla({ top: 58 }),
      xAxis: ejeCat(anios, { boundaryGap: false }), yAxis: ejeNum(),
      series: provs.slice().reverse().map(p => ({ name: p, type: 'line', stack: 'pob', color: colorDe(p), areaStyle: { opacity: 0.85 },
        symbol: 'none', lineStyle: { width: 1 }, data: anios.map(a => pobDe(p, a)) })),
    });
    // Barras: población por provincia en el año elegido
    const asc = provs.slice().reverse();
    grafico('c-pob-barras', {
      tooltip: { trigger: 'axis', valueFormatter: fmt }, grid: rejilla({ top: 8, right: 60 }),
      xAxis: ejeNum(), yAxis: ejeCat(asc),
      series: [{ type: 'bar', barWidth: '62%', data: asc.map(p => ({ value: pobDe(p, anio), itemStyle: { color: colorDe(p) } })),
        label: { show: true, position: 'right', formatter: p => fmt(p.value), fontSize: 11 } }],
    });
    // Jueces por cada 100 mil habitantes
    const M = T.Magistrados || [];
    const filas = provs.map(p => {
      const j = M.filter(r => N(r.PROVINCIA) === N(p)).length, pob = pobDe(p, anio);
      return { nombre: p, valor: pob ? j / pob * 1e5 : 0, j, pob };
    });
    const jt = filas.reduce((s, f) => s + f.j, 0), pt = filas.reduce((s, f) => s + f.pob, 0);
    filas.push({ nombre: 'CSJ Junín (total)', valor: pt ? jt / pt * 1e5 : 0, j: jt, pob: pt, ref: true });
    for (const r of T.Referencias || [])
      if (num(r.POBLACION)) filas.push({ nombre: r.CATEGORIA, valor: num(r.JUECES) / num(r.POBLACION) * 1e5, j: num(r.JUECES), pob: num(r.POBLACION), ref: true });
    filas.sort((a, b) => a.valor - b.valor);
    grafico('c-pob-100k', {
      tooltip: { trigger: 'item', formatter: p => { const f = filas[p.dataIndex];
        return `<b>${esc(f.nombre)}</b><br>${fmt(f.valor)} jueces por 100 mil hab.<br>${fmt(f.j)} jueces · ${fmt(f.pob)} hab.`; } },
      grid: rejilla({ top: 8, right: 40 }), xAxis: ejeNum(), yAxis: ejeCat(filas.map(f => f.nombre)),
      series: [{ type: 'bar', barWidth: '62%', data: filas.map(f => ({ value: +f.valor.toFixed(1), itemStyle: { color: f.ref ? COLOR.granate : '#1e88e5' } })),
        label: { show: true, position: 'right', fontSize: 11, formatter: p => fmt(p.value) } }],
    });
    // Mini gráficos: varones y mujeres por provincia
    const cont = $('pob-mini');
    if (cont && cont.dataset.provs !== provs.join('|')) {
      cont.dataset.provs = provs.join('|');
      cont.innerHTML = provs.map((p, i) => `<div class="mini"><div class="mini-t">${esc(p)}</div><div class="ch-mini" id="c-mini-${i}"></div></div>`).join('');
    }
    provs.forEach((p, i) => {
      const filasP = anios.map(a => P.find(r => r.PROVINCIA === p && r['AÑO'] === a) || {});
      grafico('c-mini-' + i, {
        tooltip: { trigger: 'axis', valueFormatter: fmt }, grid: { left: 4, right: 10, top: 8, bottom: 4, containLabel: true },
        xAxis: ejeCat(anios, { axisLabel: { fontSize: 10 } }), yAxis: ejeNum({ scale: true, axisLabel: { fontSize: 10, formatter: v => fmt(v / 1000) + ' mil' } }),
        series: [
          { name: 'Mujeres', type: 'line', data: filasP.map(r => num(r.MUJERES)), color: COLOR.mujer, symbolSize: 5 },
          { name: 'Varones', type: 'line', data: filasP.map(r => num(r.VARONES)), color: COLOR.varon, symbolSize: 5 },
        ],
      });
    });
  }

  // ================= 2) Resumen y detalle por provincia =================
  function pintarResumen() {
    const todos = T.Magistrados || [], m = todos.filter(enSel), ps = provincias();
    const nombres = ps.map(p => p.nombre);
    const clicProv = e => { const p = ps[e.dataIndex]; if (p?.id) alClicProvincia?.(p.id); };

    grafico('c-prov-sexo', {
      tooltip: { trigger: 'axis' }, legend: leyenda({ right: 0 }), grid: rejilla(),
      xAxis: ejeCat(nombres, { axisLabel: { fontSize: 11, interval: 0, rotate: nombres.length > 6 ? 25 : 0 } }), yAxis: ejeNum(),
      series: [
        { name: 'Varones', type: 'bar', color: COLOR.varon, data: ps.map(p => barra(p.filas.filter(esVaron).length, p, COLOR.varon)), label: { show: true, position: 'top', fontSize: 11.5, fontWeight: 700, color: TEXTO } },
        { name: 'Mujeres', type: 'bar', color: COLOR.mujer, data: ps.map(p => barra(p.filas.filter(esMujer).length, p, COLOR.mujer)), label: { show: true, position: 'top', fontSize: 11.5, fontWeight: 700, color: TEXTO } },
      ],
    }, clicProv);

    const sexo = [
      { name: 'Varones', value: m.filter(esVaron).length, color: COLOR.varon, icono: 'hombre' },
      { name: 'Mujeres', value: m.filter(esMujer).length, color: COLOR.mujer, icono: 'mujer' },
    ];
    grafico('c-genero', { tooltip: tipDona, series: [dona(sexo.map(x => ({ name: x.name, value: x.value, itemStyle: { color: x.color } })))] });
    leyendaDona('c-genero', sexo);

    // Por instancia: una barra por instancia con número y porcentaje encima (detalle por sexo en el tooltip)
    const colInst = { 'SALA': COLOR.sala, 'J. ESP.': COLOR.jesp, 'JPL': COLOR.jpl };
    const nomInst = { 'J. ESP.': 'Juzgados\nespecializados', 'SALA': 'Salas', 'JPL': 'Juzgados de\npaz letrado' };
    const porInst = INST.map(i => m.filter(r => inst(r) === i));
    grafico('c-inst', {
      tooltip: { trigger: 'item', formatter: p => { const f = porInst[p.dataIndex];
        return `<b>${nomInst[INST[p.dataIndex]].replace('\n', ' ')}</b><br>${f.length} en total<br>` +
               `<span style="color:#6fa8d4">Varones</span> ${f.filter(esVaron).length} · <span style="color:#f472b6">Mujeres</span> ${f.filter(esMujer).length}`; } },
      grid: rejilla({ top: 46, bottom: 4 }), xAxis: ejeCat(INST.map(i => nomInst[i]), { axisLabel: { fontSize: 11.5, color: SUAVE, lineHeight: 13, interval: 0 } }),
      yAxis: ejeNum({ show: false }),
      series: [{ type: 'bar', barMaxWidth: 46, data: porInst.map((f, k) => ({ value: f.length, itemStyle: { color: colInst[INST[k]] } })),
        label: { show: true, position: 'top', formatter: p => `{v|${fmt(p.value)}}\n{p|${m.length ? fmt(p.value / m.length * 100) : 0}%}`,
          rich: { v: { fontSize: 16, fontWeight: 800, color: TEXTO, lineHeight: 18 }, p: { fontSize: 12.5, fontWeight: 600, color: '#9ca3af' } } } }],
    });

    grafico('c-inst-prov', {
      tooltip: { trigger: 'axis' }, legend: leyenda(), grid: rejilla(),
      xAxis: ejeCat(nombres, { axisLabel: { fontSize: 11, interval: 0, rotate: nombres.length > 6 ? 25 : 0 } }), yAxis: ejeNum(),
      series: ['SALA', 'J. ESP.', 'JPL'].map(i => ({ name: i, type: 'bar', stack: 'inst', color: colInst[i],
        data: ps.map(p => barra(p.filas.filter(r => inst(r) === i).length || null, p, colInst[i])),
        label: { show: true, fontSize: 11, fontWeight: 700, color: '#fff', formatter: e => e.value > 1 ? e.value : '' } })),
    }, clicProv);

    const conds = [['T', 'Titulares', COLOR.titular, 'titular'], ['S', 'Supernumerarios', COLOR.supern, 'supernumerario'], ['P', 'Provisionales', COLOR.provis, 'provisional']];
    const porCond = conds.map(([k, n, c, ic]) => ({ name: n, value: m.filter(r => cond(r) === k).length, color: c, icono: ic }));
    grafico('c-cond', { tooltip: tipDona, series: [dona(porCond.map(x => ({ name: x.name, value: x.value, itemStyle: { color: x.color } })))] });
    leyendaDona('c-cond', porCond);
    grafico('c-cond-prov', {
      tooltip: { trigger: 'axis' }, legend: leyenda(), grid: rejilla(),
      xAxis: ejeCat(nombres, { axisLabel: { fontSize: 11, interval: 0, rotate: nombres.length > 6 ? 25 : 0 } }), yAxis: ejeNum(),
      series: conds.map(([k, n, c]) => ({ name: n, type: 'bar', stack: 'cond', color: c,
        data: ps.map(p => barra(p.filas.filter(r => cond(r) === k).length || null, p, c)),
        label: { show: true, fontSize: 11, fontWeight: 700, color: '#fff', formatter: e => e.value > 1 ? e.value : '' } })),
    }, clicProv);

    tablaMagistrados(m);
  }

  function tablaMagistrados(m) {
    const cuerpo = $('t-mag'), buscar = $('t-mag-buscar');
    if (!cuerpo) return;
    const q = N(buscar?.value);
    const filas = m.filter(r => !q || N([r.APELLIDOS_NOMBRES, r.ESPECIALIDAD, r.SEDE_DISTRITO, r.PROVINCIA, r.INSTANCIA].join(' ')).includes(q))
      .sort((a, b) => String(a.APELLIDOS_NOMBRES).localeCompare(String(b.APELLIDOS_NOMBRES), 'es'));
    const chip = (t, c) => `<span class="chip" style="background:${c}1f;color:${c}">${esc(t)}</span>`;
    const cc = { T: COLOR.titular, S: COLOR.supern, P: COLOR.provis };
    cuerpo.innerHTML = filas.map(r => `<tr>
      <td>${esc(r.APELLIDOS_NOMBRES)}</td><td><span class="sexo">${esMujer(r) ? icono('mujer', COLOR.mujer) + 'Mujer' : icono('hombre', COLOR.varon) + 'Varón'}</span></td>
      <td>${esc(inst(r))}</td><td>${esc(r.ESPECIALIDAD)}${r.NUMERO ? ' <small>' + esc(r.NUMERO) + '</small>' : ''}</td>
      <td>${esc(r.SEDE_DISTRITO)} <small>· ${esc(r.PROVINCIA)}</small></td>
      <td>${chip(r.CONDICION, cc[cond(r)] || '#777')}</td></tr>`).join('') ||
      '<tr><td colspan="6" class="vacio">Sin resultados</td></tr>';
    const n = $('t-mag-n');
    if (n) n.textContent = `${filas.length} de ${m.length}`;
    if (buscar && !buscar.dataset.listo) {
      buscar.dataset.listo = 1;
      buscar.oninput = () => tablaMagistrados((T.Magistrados || []).filter(enSel));
    }
  }

  // ================= 3) Carga procesal =================
  function pintarCarga() {
    const C = T.Carga_Procesal || [];
    const anios = unicos(C.map(r => r['AÑO'])).sort();
    const esps = unicos(C.map(r => r.ESPECIALIDAD)).sort((a, b) => String(a).localeCompare(String(b), 'es'));
    const suma = (a, campo, esp) => C.filter(r => r['AÑO'] === a && (!esp || r.ESPECIALIDAD === esp)).reduce((s, r) => s + num(r[campo]), 0);
    const lin = { type: 'line', symbolSize: 6, smooth: false };

    grafico('c-cp-anual', {
      tooltip: { trigger: 'axis', valueFormatter: fmt }, legend: leyenda(), grid: rejilla(),
      xAxis: ejeCat(anios), yAxis: ejeNum(),
      series: [['Carga procesal', 'CARGA_PROCESAL', COLOR.carga], ['Ingresos', 'INGRESOS', COLOR.ingresos], ['Resueltos', 'RESUELTOS', COLOR.resueltos]]
        .map(([n, c, col]) => ({ name: n, type: 'bar', color: col, data: anios.map(a => suma(a, c)) })),
    });
    grafico('c-cp-resueltos', {
      color: PALETA, tooltip: { trigger: 'axis', valueFormatter: fmt }, legend: leyenda(), grid: rejilla({ top: 58 }),
      xAxis: ejeCat(anios), yAxis: ejeNum(),
      series: esps.map(e => ({ name: e, type: 'bar', data: anios.map(a => suma(a, 'RESUELTOS', e)) })),
    });
    grafico('c-cp-100', {
      color: PALETA, tooltip: { trigger: 'axis', valueFormatter: v => fmt(v) + '%' }, legend: leyenda(), grid: rejilla({ top: 58 }),
      xAxis: ejeCat(anios), yAxis: ejeNum({ max: 100, axisLabel: { formatter: '{value}%', fontSize: 11 } }),
      series: esps.map(e => ({ name: e, type: 'bar', stack: 'p', barWidth: '70%',
        data: anios.map(a => { const t = suma(a, 'CARGA_PROCESAL'); return t ? +(suma(a, 'CARGA_PROCESAL', e) / t * 100).toFixed(1) : 0; }) })),
    });
    grafico('c-cp-ingresos', {
      color: PALETA, tooltip: { trigger: 'axis', valueFormatter: fmt }, legend: leyenda(), grid: rejilla({ top: 58 }),
      xAxis: ejeCat(anios), yAxis: ejeNum(),
      series: esps.map(e => Object.assign({ name: e, data: anios.map(a => suma(a, 'INGRESOS', e)) }, lin)),
    });
    grafico('c-cp-tasa', {
      color: PALETA, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '–' : fmt(v) + '%' }, legend: leyenda(), grid: rejilla({ top: 58 }),
      xAxis: ejeCat(anios), yAxis: ejeNum({ axisLabel: { formatter: '{value}%', fontSize: 11 } }),
      series: esps.map(e => Object.assign({ name: e, connectNulls: false,
        data: anios.map(a => { const i = suma(a, 'INGRESOS', e); return i ? +(suma(a, 'RESUELTOS', e) / i * 100).toFixed(1) : null; }) }, lin)),
    });
    // Sobrecarga: % por encima de la carga máxima
    const S = (T.Sobrecarga || []).map(r => ({ nombre: r.ORGANO_JURISDICCIONAL, max: num(r.CARGA_MAXIMA), proy: num(r.CARGA_PROYECTADA) }))
      .map(r => Object.assign(r, { pct: r.max ? (r.proy / r.max - 1) * 100 : 0 })).sort((a, b) => a.pct - b.pct);
    const corto = s => String(s).replace(/JUZGADO/g, 'J.').replace(/INVESTIGACI[OÓ]N PREPARATORIA/g, 'INV. PREP.')
      .replace(/SUPRAPROVINCIAL ESPECIALIZADO EN DELITOS? DE CORRUPCI[OÓ]N DE FUNCIONARIOS/g, 'SUPRAPROV. CORRUPCIÓN');
    grafico('c-sobrecarga', {
      tooltip: { trigger: 'item', formatter: p => { const r = S[p.dataIndex];
        return `<b>${esc(r.nombre)}</b><br>Carga máxima: ${fmt(r.max)}<br>Carga proyectada: ${fmt(r.proy)}<br>Sobrecarga: <b>${fmt(r.pct)}%</b>`; } },
      grid: rejilla({ top: 8, right: 50 }), xAxis: ejeNum({ axisLabel: { formatter: '{value}%', fontSize: 11 } }),
      yAxis: ejeCat(S.map(r => corto(r.nombre)), { axisLabel: { fontSize: 10, width: 260, overflow: 'truncate' } }),
      series: [{ type: 'bar', barWidth: '64%', data: S.map(r => ({ value: +r.pct.toFixed(1), itemStyle: { color: r.pct >= 100 ? '#c62828' : r.pct >= 50 ? '#ef6c00' : '#fbc02d' } })),
        label: { show: true, position: 'right', fontSize: 11, formatter: p => fmt(p.value) + '%' } }],
    });
  }

  // ================= 4) Audiencias =================
  function pintarAudiencias() {
    const A = T.Audiencias_NCPP || [], B = T.Audiencias_SNEJ || [];
    const anios = unicos([...A, ...B].map(r => r['AÑO'])).sort();
    const parcial = new Set(A.filter(r => N(r['TIPO_AÑO']).startsWith('PARC')).map(r => r['AÑO']));
    const selAnio = $('au-anio');
    if (selAnio && !selAnio.options.length) {
      const completos = anios.filter(a => !parcial.has(a));
      selAnio.innerHTML = anios.map(a => `<option value="${a}">${a}${parcial.has(a) ? ' (parcial)' : ''}</option>`).join('');
      selAnio.value = completos[completos.length - 1] ?? anios[anios.length - 1];
      selAnio.onchange = () => { pintados.au = false; pintarAudiencias(); };
    }
    const anio = +selAnio?.value;
    const etiqueta = a => parcial.has(a) ? a + '*' : String(a);
    bloque('ncpp', A, 'SEDE', 'ATENDIDAS', 'Atendidas');
    bloque('snej', B, 'JUZGADO', 'REALIZADAS', 'Realizadas');

    function bloque(pre, rows, clave, campoAt, nombreAt) {
      const ks = unicos(rows.map(r => r[clave]));
      const s = (k, a, c) => rows.filter(r => r[clave] === k && (a == null || r['AÑO'] === a)).reduce((t, r) => t + num(r[c]), 0);
      const hay = (k, a) => rows.some(r => r[clave] === k && r['AÑO'] === a);
      ks.sort((x, y) => s(y, null, 'PROGRAMADAS') - s(x, null, 'PROGRAMADAS'));
      const ys = anios.filter(a => rows.some(r => r['AÑO'] === a));
      const lin = { type: 'line', symbolSize: 5, connectNulls: false };
      grafico(`c-${pre}-prog`, {
        color: PALETA, tooltip: { trigger: 'axis', valueFormatter: fmt }, legend: leyenda(), grid: rejilla({ top: 58 }),
        xAxis: ejeCat(ys.map(etiqueta)), yAxis: ejeNum(),
        series: ks.map(k => Object.assign({ name: k, data: ys.map(a => hay(k, a) ? s(k, a, 'PROGRAMADAS') : null) }, lin)),
      });
      grafico(`c-${pre}-tasa`, {
        color: PALETA, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '–' : fmt(v) + '%' }, legend: leyenda(), grid: rejilla({ top: 58 }),
        xAxis: ejeCat(ys.map(etiqueta)), yAxis: ejeNum({ scale: true, max: 100, axisLabel: { formatter: '{value}%', fontSize: 11 } }),
        series: ks.map(k => Object.assign({ name: k, data: ys.map(a => { const p = s(k, a, 'PROGRAMADAS'); return hay(k, a) && p ? +(s(k, a, campoAt) / p * 100).toFixed(1) : null; }) }, lin)),
      });
      grafico(`c-${pre}-acum`, {
        tooltip: { trigger: 'axis', valueFormatter: fmt }, legend: leyenda(), grid: rejilla(),
        xAxis: ejeCat(ks, { axisLabel: { fontSize: 11, interval: 0, rotate: ks.length > 7 ? 30 : 0 } }), yAxis: ejeNum(),
        series: [['Programadas', 'PROGRAMADAS', COLOR.programadas], [nombreAt, campoAt, COLOR.atendidas], ['Suspendidas', 'SUSPENDIDAS', COLOR.suspendidas]]
          .map(([n, c, col]) => ({ name: n, type: 'bar', color: col, data: ks.map(k => s(k, null, c)) })),
      });
      const filas = ks.filter(k => hay(k, anio)).map(k => ({ k, v: s(k, anio, 'PROGRAMADAS') ? s(k, anio, campoAt) / s(k, anio, 'PROGRAMADAS') * 100 : 0 }))
        .sort((a, b) => a.v - b.v);
      grafico(`c-${pre}-anio`, {
        tooltip: { trigger: 'axis', valueFormatter: v => fmt(v) + '%' }, grid: rejilla({ top: 8, right: 50 }),
        xAxis: ejeNum({ scale: true, max: 100, axisLabel: { formatter: '{value}%', fontSize: 11 } }), yAxis: ejeCat(filas.map(f => f.k)),
        series: [{ type: 'bar', barWidth: '62%', data: filas.map((f, i) => ({ value: +f.v.toFixed(1), itemStyle: { color: PALETA[i % PALETA.length] } })),
          label: { show: true, position: 'right', fontSize: 11, formatter: p => fmt(p.value) + '%' } }],
      });
      const t = $(`t-${pre}-anio`);
      if (t) t.textContent = anio + (parcial.has(anio) ? ' (parcial)' : '');
    }
  }

  // ================= 5) Personal jurisdiccional =================
  const REGIMENES = [
    { n: 'D.L. 728', cols: ['DL_728'], c: '#0056a1' },
    { n: 'D.L. 1057 (CAS)', cols: ['CAS', 'RECAS'], c: '#f59e0b' },
    { n: 'Ley 29277', cols: ['LEY_29277'], c: '#33b3a9' },
    { n: 'D.L. 276', cols: ['DL_276'], c: '#e05d6f' },
  ];
  function pintarPersonal() {
    const P = T.Personal || [];
    const deReg = (r, g) => g.cols.reduce((s, c) => s + num(r[c]), 0);
    const tot = g => P.reduce((s, r) => s + deReg(r, g), 0);
    const total = REGIMENES.reduce((s, g) => s + tot(g), 0);
    const e = $('k-personal'); if (e) e.textContent = fmt(total);
    const cards = $('pe-cards');
    const pct = g => total ? tot(g) / total * 100 : 0;
    if (cards) cards.innerHTML = REGIMENES.map(g => `<div class="reg" style="--c:${g.c}"><div class="reg-h">${esc(g.n)}</div>
      <div class="reg-v">${fmt(tot(g))}</div><div class="reg-p"><i style="width:${pct(g)}%"></i></div>
      <small>${fmt(pct(g))}% del personal</small></div>`).join('');
    grafico('c-pe-dona', { tooltip: tipDona, series: [dona(REGIMENES.map(g => ({ name: g.n, value: tot(g), itemStyle: { color: g.c } })))] });
    leyendaDona('c-pe-dona', REGIMENES.map(g => ({ name: g.n, value: tot(g), color: g.c })));
    const top = P.map(r => ({ cargo: r.CARGO, t: REGIMENES.reduce((s, g) => s + deReg(r, g), 0), r }))
      .sort((a, b) => b.t - a.t).slice(0, 15).reverse();
    grafico('c-pe-cargos', {
      tooltip: { trigger: 'axis', valueFormatter: fmt }, legend: leyenda(), grid: rejilla({ right: 30 }),
      xAxis: ejeNum(), yAxis: ejeCat(top.map(x => x.cargo), { axisLabel: { fontSize: 10, width: 220, overflow: 'truncate' } }),
      series: REGIMENES.map(g => ({ name: g.n, type: 'bar', stack: 'c', color: g.c, data: top.map(x => deReg(x.r, g) || null) })),
    });
    const cuerpo = $('t-pe'), buscar = $('t-pe-buscar');
    if (cuerpo) {
      const q = N(buscar?.value);
      cuerpo.innerHTML = P.filter(r => !q || N(r.CARGO).includes(q))
        .map(r => ({ r, t: REGIMENES.reduce((s, g) => s + deReg(r, g), 0) })).sort((a, b) => b.t - a.t)
        .map(({ r, t }) => `<tr><td>${esc(r.CARGO)}</td>${REGIMENES.map(g => `<td class="n">${deReg(r, g) || ''}</td>`).join('')}<td class="n"><b>${t}</b></td></tr>`).join('');
      if (buscar && !buscar.dataset.listo) { buscar.dataset.listo = 1; buscar.oninput = () => pintarPersonal(); }
    }
  }

  const PINTORES = { pob: pintarPoblacion, res: pintarResumen, cp: pintarCarga, au: pintarAudiencias, pe: pintarPersonal };

  function mostrar(tab) {
    tabActual = tab;
    if (!T || !Object.keys(T).length) return;
    if (!pintados[tab]) { PINTORES[tab]?.(); pintados[tab] = true; }
    requestAnimationFrame(() => Object.values(charts).forEach(c => c.resize()));
  }

  let espera = null;
  window.addEventListener('resize', () => {
    clearTimeout(espera);
    espera = setTimeout(() => Object.values(charts).forEach(c => c.resize()), 120);
  });

  window.Dash = {
    iniciar({ tablas, alClicProvincia: f }) {
      T = tablas || {};
      alClicProvincia = f;
      kpis();
      if (tabActual) mostrar(tabActual);
    },
    // zona elegida en el mapa (o null): filtra tarjetas y la pestaña de resumen
    filtrar(gid, nombre) {
      sel = gid || null;
      kpis(nombre);
      pintados.res = false;
      if (tabActual === 'res') mostrar('res');
    },
    mostrar,
    COLOR,
  };
})();
