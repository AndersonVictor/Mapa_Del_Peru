// Gestión Administrativa
(function () {
  const COLOR = {
    granate: '#7f1d2d', azul: '#0056a1', celeste: '#0a84d0', verde: '#16a34a', ambar: '#f59e0b',
    lila: '#8a80f5', turquesa: '#33b3a9', rosa: '#e05d6f', gris: '#cbd5e1', obs: '#b45309',
  };
  const PALETA = ['#0056a1', '#33b3a9', '#8a80f5', '#f59e0b', '#e05d6f', '#0a84d0', '#16a34a', '#7f1d2d', '#94a3b8', '#c084fc'];
  const SUAVE = '#6b7280', REJILLA = '#eef0f4';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n, dec = 1) => (n == null || isNaN(n) ? '–' : Number(n).toLocaleString('en-US', { maximumFractionDigits: dec })
    .replace(/,/g, ' ').replace('.', ','));
  const soles = n => (n == null ? '–' : 'S/ ' + fmt(n, 2));
  const pct = n => (n == null || !isFinite(n) ? '–' : fmt(n) + '%');
  const corto = v => Math.abs(v) >= 1e6 ? fmt(v / 1e6) + ' M' : Math.abs(v) >= 1e3 ? fmt(v / 1e3) + ' mil' : fmt(v);
  const esNum = v => typeof v === 'number' && isFinite(v);
  const fecha = iso => iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '';
  const unicos = xs => [...new Set(xs)];
  const suma = (xs, f) => xs.reduce((s, x) => s + (esNum(f(x)) ? f(x) : 0), 0);

  let D = { hojas: {}, ultimos: {}, resumen: {} }, H = {};
  const HOY = new Date();

  // datos
  const U = (ind, anio, sede = '') => D.ultimos[`${ind}|${anio}|${sede}`];
  const filas = ind => Object.values(D.ultimos).filter(r => r.id_indicador === ind && !r.id_sede).sort((a, b) => a.anio - b.anio);
  const ultimo = ind => filas(ind).filter(r => esNum(r.valor)).pop();
  const v = (ind, anio) => { const r = U(ind, anio); return r && esNum(r.valor) ? r.valor : null; };
  const parcial = r => r && r.es_parcial === 'Sí';
  // solo periodos equivalentes
  const comparables = (a, b) => a && b && ((!parcial(a) && !parcial(b)) || (a.periodo_cubierto && a.periodo_cubierto === b.periodo_cubierto));
  function etiqueta(r) {
    const otro = (String(r.periodo_cubierto || '').match(/(19|20)\d\d/g) || []).find(a => +a !== +r.anio);
    if (otro) return `${otro}–${r.anio}`;
    return String(r.anio);
  }
  const marcas = r => (parcial(r) ? ` <span class="parc">parcial · ${esc(r.periodo_cubierto || '')}</span>` : '') +
    (r?.pendiente ? ' <span class="obs" title="Cifra observada: ver Cifras por validar">⚠ por validar</span>' : '');
  const alCorte = r => r.fecha_corte ? 'al ' + fecha(r.fecha_corte) : 'sin fecha de corte';
  function lineaCorte(id, rs) {
    const el = $(id); if (!el) return;
    el.innerHTML = rs.length ? 'Corte: ' + rs.map(r => `<b>${esc(etiqueta(r))}</b> ${alCorte(r)}${marcas(r)}`).join(' · ') : 'Sin datos cargados';
  }
  const fuente = r => r ? esc(r.documento_sustento || 'sin documento de sustento') : '';

  // echarts
  const charts = {};
  const TIP = { confine: true, backgroundColor: 'rgba(58,15,24,.96)', borderColor: 'rgba(245,158,11,.45)', borderWidth: 1,
    padding: [8, 12], textStyle: { color: '#fff', fontSize: 13 }, extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:340px;white-space:normal;' };
  function grafico(id, op) {
    const el = $(id); if (!el) return;
    const c = charts[id] || (charts[id] = echarts.init(el));
    const horizontal = op.yAxis && !Array.isArray(op.yAxis) && op.yAxis.type === 'category';
    for (const s of [].concat(op.series || [])) {
      // color de la leyenda
      const d = (s.data || []).find(x => x && x.itemStyle && x.itemStyle.color);
      if (!s.color && d) s.color = d.itemStyle.color;
      if (s.type === 'bar') { s.barMaxWidth = s.barMaxWidth || 34; if (!s.stack) s.itemStyle = Object.assign({ borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0] }, s.itemStyle); }
    }
    c.setOption(Object.assign({ textStyle: { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', color: SUAVE }, animationDuration: 500 },
      op, { tooltip: Object.assign({}, TIP, op.tooltip) }), true);
  }
  const leyenda = extra => Object.assign({ top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 14, textStyle: { fontSize: 12.5, color: SUAVE } }, extra);
  const rejilla = extra => Object.assign({ left: 8, right: 14, top: 34, bottom: 6, containLabel: true }, extra);
  const ejeNum = extra => Object.assign({ type: 'value', axisLabel: { fontSize: 11.5, color: '#9ca3af', formatter: corto },
    splitLine: { lineStyle: { color: REJILLA } } }, extra);
  const ejeCat = (datos, extra) => Object.assign({ type: 'category', data: datos, axisLabel: { fontSize: 12, color: SUAVE },
    axisTick: { show: false }, axisLine: { lineStyle: { color: '#e5e7eb' } } }, extra);
  const barra = (r, color) => r && esNum(r.valor) ? {
    value: r.valor, fila: r,
    itemStyle: r.pendiente ? { color, opacity: .5, borderColor: COLOR.obs, borderWidth: 2, borderType: 'dashed' } : { color },
  } : { value: null };
  const tipFila = (unidad = 'n') => ({
    trigger: 'item', formatter: p => {
      const r = p.data?.fila; const val = unidad === 'S/' ? soles(p.value) : unidad === '%' ? pct(p.value) : fmt(p.value);
      if (!r) return `<b>${esc(p.seriesName)}</b><br>${esc(p.name)}: ${val}`;
      return `<b>${esc(p.seriesName)} · ${esc(etiqueta(r))}</b><br>${val}<br><small>${alCorte(r)}${parcial(r) ? ' · parcial (' + esc(r.periodo_cubierto) + ')' : ''}</small>` +
        `<br><small>Sustento: ${fuente(r)}</small>` + (r.pendiente ? `<br><b style="color:#fcd34d">⚠ Por validar</b>${r.observacion ? ': ' + esc(r.observacion) : ''}` : '');
    },
  });

  // icono segun la etiqueta
  const ICONOS = [[/presupuest|ejecuci/i, 'moneda'], [/equipo/i, 'monitor'], [/agentes|seguridad/i, 'escudo'], [/ex[aá]menes|m[eé]dic/i, 'salud'],
    [/sunafil|integridad|validadas/i, 'check'], [/m²/i, 'area'], [/sedes/i, 'pin'], [/obra|conformidad/i, 'edificio'],
    [/actos|resueltos|jornada/i, 'mazo'], [/juzgados de paz|visitas/i, 'escala'], [/capacitad|usuarios/i, 'personas'],
    [/validar|corregidas/i, 'alerta'], [/oficinas/i, 'lista']];
  const icono = lbl => (ICONOS.find(([re]) => re.test(lbl)) || [, 'tendencia'])[1];
  function kpi({ lbl, valor, det = '', fila: r, color = COLOR.granate, barra: b, cte, ico = icono(lbl) }) {
    const linea = cte ?? (r ? alCorte(r) + marcas(r) : '');
    return `<div class="kpi" style="--c:${color};--t:${color}22" title="${r ? 'Sustento: ' + fuente(r) : ''}">
      <div class="kpi-top"><span class="kpi-lbl">${esc(lbl)}</span><div class="kpi-ico"><svg class="ic"><use href="/iconos.svg#${ico}"/></svg></div></div><b>${valor}</b>
      ${b != null ? `<div class="kpi-bar"><i style="width:${Math.max(0, Math.min(100, b))}%"></i></div>` : ''}
      <span class="det">${det}</span>${linea ? `<span class="cte">${linea}</span>` : ''}
      <svg class="kpi-fondo"><use href="/iconos.svg#${ico}"/></svg></div>`;
  }

  // calculos
  const anioPpto = () => filas('PPTO_DEV').filter(r => esNum(r.valor) && v('PPTO_PIM', r.anio)).map(r => r.anio);
  const ejecucion = a => { const pim = v('PPTO_PIM', a), dev = v('PPTO_DEV', a); return pim ? dev / pim * 100 : null; };
  const saldo = a => { const pim = v('PPTO_PIM', a), dev = v('PPTO_DEV', a); return pim != null && dev != null ? pim - dev : null; };
  const varPim = a => { const pia = v('PPTO_PIA', a), pim = v('PPTO_PIM', a); return pia ? (pim - pia) / pia * 100 : null; };
  const avanceIoarr = r => esNum(r.costo_actualizado) && r.costo_actualizado ? (r.devengado_acumulado || 0) / r.costo_actualizado * 100 : null;
  const m2 = o => esNum(o.area_antes_m2) && esNum(o.area_despues_m2) ? o.area_despues_m2 - o.area_antes_m2 : null;
  const mesesHasta = iso => { const f = new Date(iso); return (f.getFullYear() - HOY.getFullYear()) * 12 + f.getMonth() - HOY.getMonth() - (f.getDate() < HOY.getDate() ? 1 : 0); };
  const porVencer = c => c.fecha_vencimiento && new Date(c.fecha_vencimiento) >= HOY && mesesHasta(c.fecha_vencimiento) < 12;
  const vencido = c => c.fecha_vencimiento && new Date(c.fecha_vencimiento) < HOY;
  const nicsp = () => {
    const r = ultimo('NICSP_IDENT'); if (!r) return null;
    const a = r.anio, ident = v('NICSP_IDENT', a), impl = v('NICSP_IMPL', a) || 0, excl = v('NICSP_EXCL', a) || 0;
    return { anio: a, fila: r, ident, impl, excl, pend: ident - impl - excl };
  };
  const ultimasIoarr = () => Object.values((H.INVERSIONES || []).reduce((m, r) => {
    if (!m[r.cui] || String(r.fecha_corte || '') >= String(m[r.cui].fecha_corte || '')) m[r.cui] = r; return m;
  }, {}));
  const sedeNombre = id => (H.CAT_SEDES || []).find(s => s.id_sede === id)?.sede || id || 'Sin sede';
  const oficinaNombre = id => (H.CAT_OFICINAS || []).find(o => o.id_oficina === id)?.oficina || id || '';
  const sinConformidad = o => !o.fecha_conformidad || !o.estado;
  const obsHoja = hoja => (H.VALIDACIONES || []).some(r => r.hoja === hoja && r.estado === 'por validar');
  const obsObras = () => obsHoja('OBRAS') ? ' <span class="obs">⚠ por validar</span>' : '';

  // resumen
  function resumen() {
    const ap = anioPpto(), a = ap[ap.length - 1];
    const dev = U('PPTO_DEV', a), pim = U('PPTO_PIM', a), puesto = U('PPTO_PUESTO', a);
    const ej = a != null ? ejecucion(a) : null;
    const jor = ultimo('JORN_ACTOS'), ya = ultimo('JP_YACHAY'), sun = ultimo('SUNAFIL_PCT');
    const eq = H.EQUIPAMIENTO || [], ob = H.OBRAS || [];
    const eqSinAnio = eq.filter(r => !r.anio).length;
    const ejFila = dev && pim ? Object.assign({}, dev, { pendiente: dev.pendiente || pim.pendiente }) : null;
    $('res-kpis').innerHTML = [
      kpi({ lbl: `Ejecución presupuestal ${a ?? ''}`, valor: pct(ej), barra: ej, fila: ejFila,
        det: puesto && esNum(puesto.valor) ? `Puesto <strong>N° ${puesto.valor}</strong> entre las UE del PJ` : '' }),
      kpi({ lbl: `Actos procesales en jornadas ${jor ? etiqueta(jor) : ''}`, valor: fmt(jor?.valor), fila: jor, color: COLOR.azul,
        det: 'Jornadas judiciales extraordinarias' }),
      kpi({ lbl: 'Juzgados de paz en YACHAY 2.0', valor: fmt(ya?.valor), fila: ya, color: COLOR.turquesa,
        det: ya ? `${etiqueta(ya)} · migración del aplicativo` : '' }),
      kpi({ lbl: 'Equipos entregados', valor: fmt(suma(eq, r => r.cantidad)), color: COLOR.celeste,
        det: `${unicos(eq.map(r => r.tipo_bien)).length} tipos de bien · ${unicos(eq.map(r => r.destino)).length} destinos`,
        cte: eqSinAnio ? `${eqSinAnio} registros sin año${obsHoja('EQUIPAMIENTO') ? ' <span class="obs">⚠ por validar</span>' : ''}` : 'Hoja EQUIPAMIENTO' }),
      kpi({ lbl: 'Observaciones SUNAFIL levantadas', valor: pct(sun?.valor), barra: sun?.valor, fila: sun, color: COLOR.verde }),
      kpi({ lbl: 'Obras de infraestructura', valor: fmt(ob.length), color: COLOR.ambar,
        det: `${unicos(ob.map(o => o.id_sede)).length} sedes intervenidas · ${fmt(suma(ob, m2), 2)} m² ganados`,
        cte: `${ob.filter(sinConformidad).length} aún sin conformidad o estado${obsObras()}` }),
    ].join('');

    // ejecucion por año
    const rs = ap.map(x => U('PPTO_DEV', x));
    lineaCorte('res-ppto-corte', rs.map((r, i) => Object.assign({}, r, { pendiente: r.pendiente || U('PPTO_PIM', ap[i])?.pendiente })));
    grafico('c-res-ppto', {
      tooltip: { trigger: 'axis', valueFormatter: pct }, grid: rejilla({ top: 14, right: 20 }),
      xAxis: ejeCat(rs.map(etiqueta)), yAxis: ejeNum({ max: 100, axisLabel: { formatter: '{value}%', color: '#9ca3af' } }),
      series: [{ name: '% de ejecución', type: 'bar', barMaxWidth: 70,
        data: ap.map((x, i) => barra(Object.assign({}, rs[i], { valor: ejecucion(x), pendiente: rs[i].pendiente || U('PPTO_PIM', x)?.pendiente }), i === ap.length - 1 ? COLOR.granate : '#c9a3aa')),
        label: { show: true, position: 'top', formatter: p => pct(p.value), fontWeight: 700, color: '#111827' } }],
    });

    // recaudacion: multas y archivo
    const mul = filas('MULTAS').filter(r => !etiqueta(r).includes('–')), arc = filas('ARCH_RECAUDA');
    const anR = unicos([...mul, ...arc].map(r => r.anio)).sort();
    lineaCorte('res-rec-corte', anR.map(x => U('MULTAS', x) || U('ARCH_RECAUDA', x)));
    grafico('c-res-rec', {
      tooltip: tipFila('S/'), legend: leyenda(), grid: rejilla(), xAxis: ejeCat(anR.map(x => etiqueta(U('MULTAS', x) || U('ARCH_RECAUDA', x)))), yAxis: ejeNum(),
      series: [['MULTAS', 'Multas judiciales', COLOR.azul], ['ARCH_RECAUDA', 'Archivo', COLOR.granate]].map(([i, nombre, color]) =>
        ({ name: nombre, type: 'bar', data: anR.map(x => barra(U(i, x), color)) })),
    });

    const anE = unicos(eq.map(r => r.anio).filter(Boolean)).sort();
    $('res-eq-corte').innerHTML = `Total: <b>${fmt(suma(eq, r => r.cantidad))}</b> equipos · Hoja EQUIPAMIENTO`;
    grafico('c-res-eq', {
      tooltip: { trigger: 'axis' }, grid: rejilla({ top: 22 }), xAxis: ejeCat(anE.map(String)), yAxis: ejeNum(),
      series: [{ name: 'Equipos', type: 'bar', barMaxWidth: 60, data: anE.map((x, i) => ({ value: suma(eq.filter(r => r.anio === x), r => r.cantidad),
        itemStyle: { color: i === anE.length - 1 ? COLOR.celeste : '#9ccbeb' } })),
        label: { show: true, position: 'top', fontSize: 11.5, formatter: p => fmt(p.value) } }],
    });

    // obras por estado
    const est = [['ejecutada', 'Ejecutadas', COLOR.verde], ['en curso', 'En curso', COLOR.ambar], [null, 'Sin estado registrado', COLOR.gris]]
      .map(([e, nombre, color]) => ({ name: nombre, value: ob.filter(o => e ? o.estado === e : !o.estado).length, itemStyle: { color },
        label: { color: e ? '#fff' : '#374151' } })).filter(x => x.value);
    $('res-ob-corte').innerHTML = `<b>${fmt(ob.length)}</b> obras en <b>${unicos(ob.map(o => o.id_sede)).length}</b> sedes`;
    grafico('c-res-ob', {
      tooltip: { trigger: 'item', formatter: p => `${esc(p.name)}: <b>${fmt(p.value)}</b> (${pct(p.percent)})` },
      legend: leyenda({ top: 'middle', right: 0, orient: 'vertical' }),
      series: [{ type: 'pie', radius: ['48%', '76%'], center: ['34%', '52%'], data: est, itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { show: true, position: 'inside', formatter: '{c}', fontWeight: 700 } }],
    });

    const pv = (H.VALIDACIONES || []).filter(r => r.estado === 'por validar');
    if ($('ley-obs')) $('ley-obs').hidden = !pv.length && !Object.values(D.ultimos).some(r => r.pendiente);

    // evolucion 2023-2024 vs 2025-2026
    const ANTES = 2024, fila = (lbl, antes, ahora, txtAntes, txtAhora, extra = '') => {
      const d = (ahora - antes) / antes * 100, max = Math.max(antes, ahora);
      return `<li><div class="cmp-tit"><span>${lbl}</span><b class="${d >= 0 ? 'sube' : 'baja'}">${d >= 0 ? '▲ +' : '▼ '}${pct(d)}</b></div>
        <div class="cmp-bar"><i style="width:${antes / max * 100}%"></i><small>${txtAntes}</small></div>
        <div class="cmp-bar ahora"><i style="width:${ahora / max * 100}%"></i><small>${txtAhora}</small></div>${extra ? `<p>${extra}</p>` : ''}</li>`;
    };
    const cmp = [];
    // multas
    const mb = filas('MULTAS').find(r => etiqueta(r).includes('–')), md = mb ? filas('MULTAS').filter(r => r.anio > mb.anio) : [];
    if (mb && md.length) {
      const real = suma(md, r => r.valor), ult = md[md.length - 1], proy = ultimo('MULTAS_PROY');
      const tot = proy && md.find(r => r.anio === proy.anio - 1) ? md.find(r => r.anio === proy.anio - 1).valor + proy.valor : null;
      cmp.push(fila('Recaudación de multas', mb.valor, real, `${etiqueta(mb)}: ${soles(mb.valor)}`,
        `${md.map(etiqueta).join(' + ')}: ${soles(real)}${parcial(ult) ? ` (a ${esc(ult.periodo_cubierto.split('–').pop())} ${ult.anio})` : ''}`,
        tot ? `Con la proyección al cierre de ${proy.anio}: <b>${soles(tot)}</b>, <strong>+${pct((tot - mb.valor) / mb.valor * 100)}</strong> frente a ${etiqueta(mb)}.` : ''));
    }
    // promedio hasta 2024 vs ultimo año completo
    for (const [ind, lbl] of [['RCBP', 'Registros RCBP (control biométrico)'], ['EMO', 'Exámenes médico ocupacionales']]) {
      const F = filas(ind).filter(r => esNum(r.valor) && !parcial(r));
      const A = F.filter(r => r.anio <= ANTES), B = F.filter(r => r.anio > ANTES).pop();
      if (!A.length || !B) continue;
      const prom = suma(A, r => r.valor) / A.length, ya = filas(ind).filter(r => r.anio > B.anio && esNum(r.valor)).pop();
      cmp.push(fila(lbl, prom, B.valor, `${A.length > 1 ? `Promedio ${A[0].anio}–${A[A.length - 1].anio}` : A[0].anio}: ${fmt(prom, 0)}`, `${B.anio}: ${fmt(B.valor, 0)}`,
        ya ? `${ya.anio} ${alCorte(ya)}: <b>${fmt(ya.valor, 0)}</b> (parcial).` : ''));
    }
    $('res-cmp').innerHTML = cmp.join('') || '<li><p>Sin datos de 2023–2024 cargados.</p></li>';
  }

  // presupuesto y recaudación
  function presupuesto() {
    const anios = unicos(['PPTO_PIA', 'PPTO_PIM', 'PPTO_DEV'].flatMap(i => filas(i).map(r => r.anio))).sort();
    $('t-ppto').innerHTML = anios.map(a => {
      const pia = U('PPTO_PIA', a), pim = U('PPTO_PIM', a), dev = U('PPTO_DEV', a), pu = U('PPTO_PUESTO', a);
      const c = (r, f) => r ? `${f(r.valor)}${r.pendiente ? ' <span class="obs" title="' + esc(r.observacion) + '">⚠</span>' : ''}` : '–';
      const ref = dev || pim || pia;
      return `<tr><td><b>${a}</b>${parcial(ref) ? ' <span class="parc">parcial</span>' : ''}</td><td>${alCorte(ref)}<small>${esc(ref.periodo_cubierto || '')}</small></td>
        <td class="n">${c(pia, soles)}</td><td class="n">${c(pim, soles)}</td><td class="n">${pct(varPim(a))}</td>
        <td class="n">${c(dev, soles)}</td><td class="n"><b>${pct(ejecucion(a))}</b></td><td class="n">${soles(saldo(a))}</td>
        <td class="n">${pu ? 'N° ' + pu.valor : '–'}</td></tr>`;
    }).join('') || '<tr><td colspan="9" class="vacio">Sin datos</td></tr>';

    const rsPim = anios.map(a => U('PPTO_PIM', a)).filter(Boolean), rsDev = anios.map(a => U('PPTO_DEV', a));
    lineaCorte('pre-ppto-corte', rsPim);
    grafico('c-ppto', {
      tooltip: tipFila('S/'), legend: leyenda(), grid: rejilla(),
      xAxis: ejeCat(anios.map(a => etiqueta(U('PPTO_DEV', a) || U('PPTO_PIM', a)))), yAxis: ejeNum(),
      series: [
        { name: 'PIM', type: 'bar', data: anios.map(a => barra(U('PPTO_PIM', a), COLOR.gris)) },
        { name: 'Devengado', type: 'bar', data: rsDev.map(r => barra(r, COLOR.granate)),
          label: { show: true, position: 'top', fontSize: 11.5, formatter: p => pct(ejecucion(p.data.fila?.anio)) } },
      ],
    });

    // PIA vs PIM por generica
    const P = H.PRESUPUESTO || [];
    const ultA = unicos(P.map(r => r.anio)).sort().pop();
    const corteG = P.filter(r => r.anio === ultA).map(r => r.fecha_corte).sort().pop();
    const G = P.filter(r => r.anio === ultA && r.fecha_corte === corteG);
    const faltan = anios.filter(a => !P.some(r => r.anio === a));
    $('pre-gen-corte').innerHTML = G.length ? `Corte: <b>${ultA}</b> al ${fecha(corteG)}` +
      (faltan.length ? ` · ${obsHoja('PRESUPUESTO') ? '<span class="obs">⚠ ' : '<span>'}Sin desglose ${faltan.join(', ')} por genérica</span>` : '') : 'Sin datos';
    const gen = G.map(r => r.generica).reverse();
    grafico('c-genericas', {
      tooltip: { trigger: 'axis', valueFormatter: soles }, legend: leyenda(), grid: rejilla({ right: 24 }),
      yAxis: ejeCat(gen, { axisLabel: { fontSize: 11.5, color: SUAVE, width: 150, overflow: 'truncate' } }), xAxis: ejeNum(),
      series: [{ name: 'PIA', type: 'bar', data: gen.map(g => G.find(r => r.generica === g).pia ?? null), itemStyle: { color: COLOR.gris } },
        { name: 'PIM', type: 'bar', data: gen.map(g => G.find(r => r.generica === g).pim ?? null), itemStyle: { color: COLOR.azul } }],
    });

    // multas
    const M = filas('MULTAS');
    lineaCorte('pre-mul-corte', M);
    grafico('c-multas', {
      tooltip: tipFila('S/'), grid: rejilla({ top: 22 }), xAxis: ejeCat(M.map(etiqueta)), yAxis: ejeNum(),
      series: [{ name: 'Recaudación', type: 'bar', barMaxWidth: 60, data: M.map((r, i) => barra(r, etiqueta(r).includes('–') ? COLOR.gris : PALETA[i % PALETA.length])),
        label: { show: true, position: 'top', fontSize: 11.5, formatter: p => soles(p.value) } }],
    });
    const bienio = M.find(r => etiqueta(r).includes('–')), despues = bienio ? M.filter(r => r.anio > bienio.anio) : [];
    $('pre-mul-nota').innerHTML = bienio && despues.length
      ? `${despues.map(etiqueta).join(' + ')} = <b>${soles(suma(despues, r => r.valor))}</b> (${despues.map(r => r.periodo_cubierto).join(' y ')}) frente a ` +
        `${etiqueta(bienio)} = <b>${soles(bienio.valor)}</b> (${esc(bienio.periodo_cubierto)}). ` +
        (despues.some(parcial) ? '<span class="obs">⚠ Periodos no equivalentes: no se calcula la variación.</span>' : '')
      : '';
    // proyeccion al cierre
    const proy = ultimo('MULTAS_PROY'), base = proy && despues.find(r => r.anio === proy.anio - 1);
    if (proy && base && bienio) {
      const total = base.valor + proy.valor;
      $('pre-mul-nota').innerHTML += `<br>Proyección ${proy.anio}: <b>${soles(proy.valor)}</b> → ${base.anio} + ${proy.anio} proyectado = <b>${soles(total)}</b>, ` +
        `<strong>${pct((total - bienio.valor) / bienio.valor * 100)}</strong> frente a ${etiqueta(bienio)}.`;
    }
    // el cierre puede ser el 15 de diciembre
    const ultM = M[M.length - 1];
    if (parcial(ultM)) $('pre-mul-nota').innerHTML += `<br><span class="obs">⚠ ${ultM.anio} va al ${fecha(ultM.fecha_corte)} y se actualiza cada mes. ` +
      'El cierre del año puede hacerse el 15 de diciembre: diciembre no cuenta como mes completo.</span>';

    // archivo
    const A = filas('ARCH_ATENC'), R = filas('ARCH_RECAUDA');
    const anA = unicos([...A, ...R].map(r => r.anio)).sort();
    lineaCorte('pre-arc-corte', R);
    grafico('c-archivo', {
      tooltip: tipFila(), legend: leyenda(), grid: rejilla(),
      xAxis: ejeCat(anA.map(a => etiqueta(U('ARCH_RECAUDA', a) || U('ARCH_ATENC', a)))),
      yAxis: [ejeNum({ name: 'Atenciones', nameTextStyle: { fontSize: 11 } }), ejeNum({ name: 'S/', nameTextStyle: { fontSize: 11 }, splitLine: { show: false } })],
      series: [{ name: 'Atenciones', type: 'bar', data: anA.map(a => barra(U('ARCH_ATENC', a), COLOR.turquesa)) },
        { name: 'Recaudación (S/)', type: 'bar', yAxisIndex: 1, data: anA.map(a => barra(U('ARCH_RECAUDA', a), COLOR.granate)),
          label: { show: true, position: 'top', fontSize: 11, formatter: p => soles(p.value) } }],
    });
    const [r1, r2] = R.slice(-2);
    $('pre-arc-nota').innerHTML = r1 && r2 ? `${etiqueta(r2)} recaudó el ${pct(r2.valor / r1.valor * 100)} de lo recaudado en ${etiqueta(r1)}` +
      (comparables(r1, r2) ? '.' : ` <span class="obs">⚠ ${esc(r2.periodo_cubierto)} frente a ${esc(r1.periodo_cubierto)}: no son periodos equivalentes</span>`) : '';
  }

  // producción y justicia de paz
  function porAnio(id, inds, unidad = 'n', extra = {}) {
    const anios = unicos(inds.flatMap(([i]) => filas(i).map(r => r.anio))).sort();
    const ref = a => inds.map(([i]) => U(i, a)).find(Boolean);
    grafico(id, Object.assign({
      tooltip: tipFila(unidad), legend: inds.length > 1 ? leyenda() : undefined, grid: rejilla({ top: inds.length > 1 ? 34 : 22 }),
      xAxis: ejeCat(anios.map(a => etiqueta(ref(a)))), yAxis: ejeNum(),
      series: inds.map(([i, nombre, color]) => ({ name: nombre, type: 'bar', data: anios.map(a => barra(U(i, a), color)),
        label: { show: true, position: 'top', fontSize: 11, formatter: p => fmt(p.value) } })),
    }, extra));
    return anios.map(ref);
  }
  function produccion() {
    const vio = ultimo('VIO_RESUELTOS'), meta = ultimo('VIO_META'), cur = ultimo('CURIA_USU');
    const vis = ultimo('JP_VISITAS'), serv = ultimo('CAP_SIJ_SERV');
    $('pro-kpis').innerHTML = [
      kpi({ lbl: `Resueltos Módulo de Violencia ${vio ? etiqueta(vio) : ''}`, valor: fmt(vio?.valor), fila: vio, color: COLOR.rosa,
        det: meta ? `<strong>${pct(meta.valor)}</strong> de la meta de producción` : '', barra: meta?.valor }),
      kpi({ lbl: `Servidores capacitados en SIJ ${serv ? etiqueta(serv) : ''}`, valor: fmt(serv?.valor), fila: serv, color: COLOR.azul }),
      kpi({ lbl: `Visitas a juzgados de paz ${vis ? etiqueta(vis) : ''}`, valor: fmt(vis?.valor), fila: vis, color: COLOR.turquesa }),
      kpi({ lbl: 'Usuarios habilitados en CURIA (IA)', valor: fmt(cur?.valor), fila: cur, color: COLOR.lila }),
    ].join('');
    lineaCorte('pro-jor-corte', porAnio('c-jornadas', [['JORN_ACTOS', 'Actos procesales', COLOR.granate]]));
    lineaCorte('pro-exp-corte', porAnio('c-expedientes', [['EXP_REMITIDOS', 'Remitidos al archivo', COLOR.azul], ['EXP_DEVUELTOS', 'Devueltos al archivo', COLOR.ambar]]));
    lineaCorte('pro-sij-corte', porAnio('c-sij', [['CAP_SIJ', 'Capacitaciones', COLOR.lila], ['CAP_SIJ_SERV', 'Servidores capacitados', COLOR.turquesa]]));

    // capacitaciones JP por tipo
    const tipos = (H.CAT_INDICADORES || []).filter(i => String(i.id_indicador).startsWith('JP_CAP_'));
    const anios = unicos(tipos.flatMap(t => filas(t.id_indicador).map(r => r.anio))).sort();
    const refJP = a => tipos.map(t => U(t.id_indicador, a)).find(Boolean);
    lineaCorte('pro-jp-corte', anios.map(refJP));
    const totJP = a => suma(tipos, t => v(t.id_indicador, a));
    grafico('c-jp-cap', {
      tooltip: tipFila(), legend: leyenda({ type: 'scroll' }), grid: rejilla({ top: 40 }),
      xAxis: ejeCat(anios.map(a => `${etiqueta(refJP(a))}\n${fmt(totJP(a))} en total`), { axisLabel: { fontSize: 12, color: SUAVE, lineHeight: 16 } }), yAxis: ejeNum(),
      series: tipos.filter(t => anios.some(a => U(t.id_indicador, a))).map((t, k) => ({
        name: t.nombre.replace('Jueces de paz: ', ''), type: 'bar', stack: 'jp', barMaxWidth: 60,
        data: anios.map(a => barra(U(t.id_indicador, a), PALETA[k % PALETA.length])),
      })),
    });
    lineaCorte('pro-yv-corte', porAnio('c-jp-yachay', [['JP_YACHAY', 'Juzgados con YACHAY 2.0', COLOR.turquesa], ['JP_VISITAS', 'Visitas administrativas', COLOR.azul]]));

    // RCBP y RENAVINA
    const rc = filas('RCBP'), rn = filas('RENAVINA');
    const an = unicos([...rc, ...rn].map(r => r.anio)).sort();
    lineaCorte('pro-reg-corte', [rc[rc.length - 1], rn[rn.length - 1]].filter(Boolean).map(r => Object.assign({}, r, { anio: `${r.id_indicador} ${r.anio}` })));
    grafico('c-registros', {
      tooltip: tipFila(), legend: leyenda(), grid: rejilla(),
      xAxis: ejeCat(an.map(a => etiqueta(U('RCBP', a) || U('RENAVINA', a)))),
      yAxis: [ejeNum({ name: 'RCBP', nameTextStyle: { fontSize: 11 } }), ejeNum({ name: 'RENAVINA', nameTextStyle: { fontSize: 11 }, splitLine: { show: false } })],
      series: [{ name: 'RCBP', type: 'bar', barMaxWidth: 60, data: an.map(a => barra(U('RCBP', a), COLOR.azul)),
        label: { show: true, position: 'top', fontSize: 11, formatter: p => fmt(p.value) } },
        { name: 'RENAVINA', type: 'line', yAxisIndex: 1, symbolSize: 9, lineStyle: { width: 3 }, data: an.map(a => barra(U('RENAVINA', a), COLOR.ambar)),
          label: { show: true, position: 'top', fontSize: 11, formatter: p => fmt(p.value) } }],
    });
  }

  // cumplimiento
  function cumplimiento() {
    const I = H.INTEGRIDAD_CORTES || [];
    const ultF = I.map(r => r.fecha_reporte).sort().pop();
    const IU = I.filter(r => r.fecha_reporte === ultF);
    const cortes = unicos(IU.map(r => r.corte));
    const pc = (c, e) => IU.find(r => r.corte === c && r.etapa === e)?.porcentaje ?? null;
    cortes.sort((a, b) => (pc(a, 2) ?? -1) - (pc(b, 2) ?? -1) || (pc(a, 1) ?? 0) - (pc(b, 1) ?? 0));
    const esJunin = c => /jun[ií]n/i.test(c);
    $('cum-int-corte').innerHTML = ultF ? `Reporte de la UI-PJ del ${fecha(ultF)} · CSJ Junín en granate · «–» = sin avance reportado en la Etapa 2` +
      ((H.VALIDACIONES || []).some(r => r.hoja === 'INTEGRIDAD_CORTES' && r.estado === 'por validar') ? ' <span class="obs">⚠ fecha por validar</span>' : '') : 'Sin datos';
    const fila = (e, base) => cortes.map(c => ({ value: pc(c, e), itemStyle: { color: esJunin(c) ? (e === 1 ? '#c9a3aa' : COLOR.granate) : base } }));
    grafico('c-integridad', {
      tooltip: { trigger: 'axis', valueFormatter: pct }, legend: leyenda(), grid: rejilla({ right: 40 }),
      yAxis: ejeCat(cortes, { axisLabel: { fontSize: 12, color: SUAVE, formatter: c => esJunin(c) ? `{b|${c}}` : c, rich: { b: { fontWeight: 800, color: COLOR.granate } } } }),
      xAxis: ejeNum({ max: 100, axisLabel: { formatter: '{value}%', color: '#9ca3af' } }),
      series: [{ name: 'Etapa 1', type: 'bar', data: fila(1, COLOR.gris), label: { show: true, position: 'right', fontSize: 11, formatter: p => p.value == null ? '–' : pct(p.value) } },
        { name: 'Etapa 2', type: 'bar', data: fila(2, COLOR.azul), label: { show: true, position: 'right', fontSize: 11, formatter: p => p.value == null ? '–' : pct(p.value) } }],
    });

    const n = nicsp();
    $('cum-nic-corte').innerHTML = n ? `${n.anio} · ${alCorte(n.fila)}${marcas(n.fila)}` : 'Sin datos';
    grafico('c-nicsp', n ? {
      tooltip: { trigger: 'item', formatter: p => `<b>${esc(p.name)}</b><br>${fmt(p.value)} de ${n.ident} (${fmt(p.percent)}%)` },
      legend: leyenda({ top: 'bottom' }),
      series: [{ type: 'pie', radius: ['52%', '80%'], center: ['50%', '45%'], padAngle: 2, itemStyle: { borderRadius: 6 },
        label: { show: true, formatter: p => fmt(p.value), fontWeight: 700, fontSize: 14 },
        data: [{ name: 'Implementadas', value: n.impl, itemStyle: { color: COLOR.verde } }, { name: 'Excluidas', value: n.excl, itemStyle: { color: COLOR.gris } },
          { name: 'Pendientes', value: n.pend, itemStyle: { color: COLOR.rosa } }] }],
    } : { series: [] });
    $('cum-nic-nota').innerHTML = n ? `Pendientes calculadas: ${n.ident} identificadas − ${n.impl} implementadas − ${n.excl} excluidas = <b>${n.pend}</b>. ` +
      `Avance: ${pct((n.impl + n.excl) / n.ident * 100)} de las brechas cerradas o excluidas.` : '';

    const sun = ultimo('SUNAFIL_PCT'), e = filas('EMO'), seg = ultimo('SEG_PERSONAL'), sed = ultimo('SEG_SEDES');
    const [e1, e2] = e.slice(-2);
    $('cum-kpis').innerHTML = [
      kpi({ lbl: 'Observaciones SUNAFIL levantadas', valor: pct(sun?.valor), barra: sun?.valor, fila: sun, color: COLOR.verde }),
      kpi({ lbl: `Exámenes médico ocupacionales ${e2 ? etiqueta(e2) : ''}`, valor: fmt(e2?.valor), fila: e2, color: COLOR.turquesa,
        det: e1 && e2 ? (comparables(e1, e2) ? `<strong>${pct((e2.valor - e1.valor) / e1.valor * 100)}</strong> frente a ${etiqueta(e1)} (${fmt(e1.valor)})` : `${etiqueta(e1)}: ${fmt(e1.valor)} (periodos no equivalentes)`) : '' }),
      kpi({ lbl: 'Modelo de Integridad – CSJ Junín', valor: `${pct(IU.find(r => esJunin(r.corte) && r.etapa === 2)?.porcentaje)} <small>Etapa 2</small>`, color: COLOR.granate,
        det: `Etapa 1: <strong>${pct(IU.find(r => esJunin(r.corte) && r.etapa === 1)?.porcentaje)}</strong>`, cte: ultF ? 'Reporte del ' + fecha(ultF) : '' }),
    ].join('');
    lineaCorte('cum-emo-corte', porAnio('c-emo', [['EMO', 'Trabajadores evaluados', COLOR.turquesa]]));

    // seguridad
    const porSede = Object.values(D.ultimos).filter(r => r.id_indicador === 'SEG_PERSONAL' && r.id_sede);
    lineaCorte('cum-seg-corte', [seg].filter(Boolean));
    $('cum-seg').innerHTML = (seg ? `<div class="kpis">${kpi({ lbl: 'Agentes de seguridad', valor: fmt(seg.valor), fila: seg, cte: '' })}
      ${kpi({ lbl: 'Sedes judiciales', valor: fmt(sed?.valor), fila: sed, color: COLOR.azul, cte: '' })}
      ${kpi({ lbl: 'Agentes por sede (promedio)', valor: sed?.valor ? fmt(seg.valor / sed.valor) : '–', color: COLOR.ambar, cte: 'Calculado' })}</div>` : '') +
      (porSede.length ? `<div class="tabla" style="margin-top:12px"><table><thead><tr><th>Sede</th><th>Agentes</th><th>Corte</th></tr></thead><tbody>
        ${porSede.map(r => `<tr><td>${esc(sedeNombre(r.id_sede))}</td><td class="n">${fmt(r.valor)}</td><td>${alCorte(r)}${marcas(r)}</td></tr>`).join('')}</tbody></table></div>`
        : '');
  }

  // equipamiento y patrimonio
  function equipamiento() {
    const io = ultimasIoarr();
    const obsCui = new Set((H.VALIDACIONES || []).filter(r => r.hoja === 'INVERSIONES' && r.estado === 'por validar').map(r => String(r.clave_registro)));
    const chipEst = e => `<span class="chip ${e === 'cerrada' ? 'verde' : 'azul'}">${esc(e || 'sin estado')}</span>`;
    $('t-ioarr').innerHTML = io.map(r => {
      const av = avanceIoarr(r), o = obsCui.has(String(r.cui)) ? ' <span class="obs">⚠ por validar</span>' : '';
      return `<tr><td><b>${esc(r.cui)}</b></td><td>${esc(r.nombre)}<small>${esc(r.destino)} · ${esc(r.sustento)}</small></td><td>${fecha(r.fecha_viabilidad)}</td>
        <td class="n">${soles(r.costo_aprobado)}${r.costo_aprobado == null ? o : ''}</td><td class="n">${soles(r.costo_actualizado)}</td><td class="n">${soles(r.devengado_acumulado)}</td>
        <td class="n"><b>${pct(av)}</b>${esNum(r.programado_anio) ? `<small>Programado en el año: ${soles(r.programado_anio)}</small>` : ''}</td>
        <td>${chipEst(r.estado)}</td><td>${fecha(r.fecha_corte)}</td></tr>`;
    }).join('') || '<tr><td colspan="9" class="vacio">Sin inversiones</td></tr>';

    const E = H.EQUIPAMIENTO || [];
    const grupo = campo => {
      const m = {}; E.forEach(r => { if (esNum(r.cantidad)) m[r[campo] || 'Sin dato'] = (m[r[campo] || 'Sin dato'] || 0) + r.cantidad; });
      return Object.entries(m).sort((a, b) => a[1] - b[1]);
    };
    const sinAnio = E.filter(r => !r.anio).length;
    $('equ-tipo-corte').innerHTML = `Total: <b>${fmt(suma(E, r => r.cantidad))}</b> equipos · años ${unicos(E.map(r => r.anio).filter(Boolean)).sort().join(', ')}` +
      (sinAnio ? ` · <span class="obs">⚠ ${sinAnio} registros sin año</span>` : '');
    for (const [id, campo, color] of [['c-eq-tipo', 'tipo_bien', COLOR.celeste], ['c-eq-destino', 'destino', COLOR.turquesa]]) {
      const g = grupo(campo);
      grafico(id, {
        tooltip: { trigger: 'axis', valueFormatter: fmt }, grid: rejilla({ top: 8, right: 40 }), xAxis: ejeNum(),
        yAxis: ejeCat(g.map(x => x[0]), { axisLabel: { fontSize: 11.5, color: SUAVE, width: 170, overflow: 'truncate' } }),
        series: [{ type: 'bar', name: 'Equipos', data: g.map(x => x[1]), itemStyle: { color }, label: { show: true, position: 'right', fontSize: 11 } }],
      });
    }

    const P = H.PATRIMONIO || [];
    const acciones = unicos(P.map(r => r.accion)), anios = unicos(P.map(r => r.anio)).sort();
    const obsPat = new Set((H.VALIDACIONES || []).filter(r => r.hoja === 'PATRIMONIO' && r.estado === 'por validar')
      .flatMap(r => String(r.clave_registro).split(/[\s/,]+/)));
    grafico('c-patrimonio', {
      tooltip: { trigger: 'axis', valueFormatter: fmt }, legend: leyenda(), grid: rejilla({ top: 40 }),
      xAxis: ejeCat(anios.map(String)), yAxis: ejeNum(),
      series: acciones.map((ac, k) => ({ name: ac, type: 'bar', data: anios.map(a => {
        const rs = P.filter(r => r.anio === a && r.accion === ac);
        const obs = rs.some(r => obsPat.has(r.id));
        return rs.length ? { value: suma(rs, r => r.cantidad), itemStyle: obs ? { color: PALETA[k], opacity: .5, borderColor: COLOR.obs, borderWidth: 2, borderType: 'dashed' } : { color: PALETA[k] } } : null;
      }) })),
    });
    $('t-patrimonio').innerHTML = P.map(r => `<tr><td>${r.anio ?? ''}</td><td>${esc(r.accion)}</td><td class="n">${fmt(r.cantidad)}${obsPat.has(r.id) ? ' <span class="obs">⚠</span>' : ''}</td>
      <td>${esc(r.resolucion) || '<span class="obs">⚠ sin resolución</span>'}<small>${fecha(r.fecha)}</small></td><td>${esc(r.destinatario)}</td></tr>`).join('');
  }

  // infraestructura
  function infraestructura() {
    const O = H.OBRAS || [];
    const sedes = unicos(O.map(o => o.id_sede));
    const conM2 = O.filter(o => m2(o) != null);
    const prov = id => (H.CAT_SEDES || []).find(s => s.id_sede === id)?.provincia;
    const cuenta = (xs, f) => Object.entries(xs.reduce((m, x) => { const k = f(x) || 'Sin dato'; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
    const COL_TIPO = { mantenimiento: COLOR.azul, 'adecuación': COLOR.turquesa, 'ampliación': COLOR.lila, 'nueva infraestructura': COLOR.ambar };
    const mini = partes => `<div class="mini">${partes.map(([n, c, col]) => `<i style="flex:${c};background:${col}" title="${esc(n)}: ${c}"></i>`).join('')}</div>` +
      `<div class="mini-ley">${partes.map(([n, c, col]) => `<span><i style="background:${col}"></i>${esc(n)} <b>${fmt(c)}</b></span>`).join('')}</div>`;
    const porTipo = cuenta(O, o => o.tipo).map(([t, c]) => [t, c, COL_TIPO[t] || COLOR.gris]);
    const porProv = cuenta(O.filter((o, k) => O.findIndex(x => x.id_sede === o.id_sede) === k), o => prov(o.id_sede)).map(([p, c], k) => [p, c, PALETA[k % PALETA.length]]);
    const antes = suma(conM2, o => o.area_antes_m2), despues = suma(conM2, o => o.area_despues_m2);
    const est = [['Ejecutadas', O.filter(o => o.estado === 'ejecutada').length, COLOR.verde], ['En curso', O.filter(o => o.estado === 'en curso').length, COLOR.ambar],
      ['Sin estado', O.filter(o => !o.estado).length, COLOR.gris]].filter(x => x[1]);
    const conf = O.filter(o => !sinConformidad(o)).length;
    $('inf-kpis').innerHTML = [
      kpi({ lbl: 'Obras', valor: fmt(O.length), det: unicos(O.map(o => o.anio).filter(Boolean)).sort().map(a => `${a}: <strong>${O.filter(o => o.anio === a).length}</strong>`).join(' · ') +
        (O.some(o => !o.anio) ? ` · sin año: <strong>${O.filter(o => !o.anio).length}</strong>${obsObras()}` : '') + mini(porTipo), cte: '' }),
      kpi({ lbl: 'Sedes intervenidas', valor: fmt(sedes.length), color: COLOR.azul, det: `en <strong>${porProv.length}</strong> provincias` + mini(porProv), cte: '' }),
      kpi({ lbl: 'm² ganados', valor: `${fmt(suma(conM2, m2), 2)} <small>m²</small>`, color: COLOR.verde,
        det: `<strong>+${pct((despues - antes) / antes * 100)}</strong> de área en ${conM2.length} obras` +
          `<div class="m2"><span>Antes <b>${fmt(antes, 2)} m²</b></span><div class="mini"><i style="flex:${antes};background:#cbd5e1"></i><i style="flex:${despues - antes};background:${COLOR.verde}"></i></div><span>Después <b>${fmt(despues, 2)} m²</b></span></div>`, cte: '' }),
      kpi({ lbl: 'Con conformidad', valor: `${fmt(conf)} <small>de ${fmt(O.length)}</small>`, color: COLOR.ambar, ico: 'check',
        det: mini(est), cte: '' }),
    ].join('');
    const tipos = unicos(O.map(o => o.tipo));
    const orden = sedes.slice().sort((a, b) => O.filter(o => o.id_sede === a).length - O.filter(o => o.id_sede === b).length);
    grafico('c-obras-sede', {
      tooltip: { trigger: 'axis' }, legend: leyenda(), grid: rejilla({ top: 40 }), xAxis: ejeNum({ minInterval: 1 }),
      yAxis: ejeCat(orden.map(sedeNombre), { axisLabel: { fontSize: 11.5, color: SUAVE, width: 190, overflow: 'truncate' } }),
      series: tipos.map((t, k) => ({ name: t, type: 'bar', stack: 'o', data: orden.map(s => O.filter(o => o.id_sede === s && o.tipo === t).length || null), itemStyle: { color: PALETA[k] } })),
    });
    grafico('c-m2', {
      tooltip: { trigger: 'axis', valueFormatter: v => fmt(v, 2) + ' m²' }, legend: leyenda(), grid: rejilla({ top: 40 }),
      xAxis: ejeCat(conM2.map(o => `${sedeNombre(o.id_sede)}\n${o.obra.slice(0, 28)}…`), { axisLabel: { fontSize: 10.5, color: SUAVE, interval: 0, lineHeight: 14 } }),
      yAxis: ejeNum(),
      series: [{ name: 'Antes', type: 'bar', data: conM2.map(o => o.area_antes_m2), itemStyle: { color: COLOR.gris } },
        { name: 'Después', type: 'bar', data: conM2.map(o => o.area_despues_m2), itemStyle: { color: COLOR.verde },
          label: { show: true, position: 'top', fontSize: 11, formatter: p => '+' + fmt(m2(conM2[p.dataIndex]), 2) + ' m²' } }],
    });
    $('t-obras').innerHTML = O.map(o => `<tr><td><b>${esc(sedeNombre(o.id_sede))}</b><small>${esc((H.CAT_SEDES || []).find(s => s.id_sede === o.id_sede)?.provincia || '')}</small></td>
      <td>${o.anio ?? '<span class="obs">⚠ sin año</span>'}</td><td>${esc(o.obra)}</td><td>${esc(o.tipo)}</td><td class="n">${m2(o) == null ? '–' : fmt(m2(o), 2)}</td>
      <td>${o.estado ? `<span class="chip ${o.estado === 'ejecutada' ? 'verde' : 'azul'}">${esc(o.estado)}</span>` : '<span class="obs">⚠ sin estado</span>'}</td>
      <td>${esc(o.documento) || '<span class="obs">⚠ sin documento</span>'}</td><td>${fecha(o.fecha_conformidad) || '–'}</td></tr>`).join('');
  }

  // intervenciones y convenios
  function intervenciones() {
    const I = H.INTERVENCIONES || [];
    const ejes = (H.CAT_EJES || []).map(e => e.eje).filter(e => I.some(r => r.eje === e))
      .sort((a, b) => I.filter(r => r.eje === a).length - I.filter(r => r.eje === b).length);
    grafico('c-ejes', {
      tooltip: { trigger: 'axis' }, grid: rejilla({ top: 8, right: 30 }), xAxis: ejeNum({ minInterval: 1 }), yAxis: ejeCat(ejes),
      series: [{ name: 'Intervenciones', type: 'bar', data: ejes.map(e => I.filter(r => r.eje === e).length), itemStyle: { color: COLOR.granate },
        label: { show: true, position: 'right', fontSize: 11 } }],
    });
    // clic filtra por eje
    charts['c-ejes']?.off('click'); charts['c-ejes']?.on('click', p => { $('int-eje').value = p.name; filtrar(); });

    const llenar = (id, vals, nombre = x => x) => { const s = $(id); if (s.options.length > 1) return; vals.forEach(x => s.add(new Option(nombre(x), x))); };
    llenar('int-eje', ejes.slice().reverse());
    llenar('int-of', unicos(I.map(r => r.id_oficina)).sort(), oficinaNombre);
    llenar('int-anio', unicos(I.map(r => r.anio ?? 'sin año')).sort().map(String));
    const N = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    function filtrar() {
      const q = N($('int-q').value), e = $('int-eje').value, o = $('int-of').value, a = $('int-anio').value;
      const rs = I.filter(r => (!e || r.eje === e) && (!o || r.id_oficina === o) && (!a || String(r.anio ?? 'sin año') === a) &&
        (!q || N([r.titulo, r.brecha, r.solucion, r.sustento, oficinaNombre(r.id_oficina)].join(' ')).includes(q)));
      $('int-n').textContent = `${rs.length} de ${I.length} intervenciones`;
      $('t-interv').innerHTML = rs.map(r => `<tr><td>${r.anio ?? '<span class="obs">⚠ sin año</span>'}</td><td><span class="chip">${esc(r.eje)}</span></td>
        <td>${esc(oficinaNombre(r.id_oficina))}</td><td><b>${esc(r.titulo)}</b>${r.brecha ? `<small>Brecha: ${esc(r.brecha)}</small>` : ''}${r.solucion ? `<small>Solución: ${esc(r.solucion)}</small>` : ''}</td>
        <td><span class="chip ${r.estado === 'concluida' ? 'verde' : 'azul'}">${esc(r.estado)}</span></td><td><small style="color:#6b7280">${esc(r.sustento)}</small></td></tr>`).join('')
        || '<tr><td colspan="6" class="vacio">Ninguna intervención coincide</td></tr>';
    }
    ['int-q', 'int-eje', 'int-of', 'int-anio'].forEach(id => $(id).oninput = filtrar);
    filtrar();

    const C = (H.CONVENIOS || []).slice().sort((a, b) => String(a.fecha_vencimiento).localeCompare(String(b.fecha_vencimiento)));
    const nv = C.filter(porVencer).length;
    $('conv-alerta').innerHTML = `${C.length} instrumentos · <span class="obs">${nv} vencen en los próximos 12 meses</span>`;
    $('t-convenios').innerHTML = C.map(c => {
      const m = c.fecha_vencimiento ? mesesHasta(c.fecha_vencimiento) : null;
      const sit = !c.fecha_vencimiento ? '<span class="chip">sin fecha</span>' : vencido(c) ? '<span class="chip rojo">vencido</span>'
        : porVencer(c) ? `<span class="chip ambar">vence en ${m < 1 ? 'menos de 1 mes' : m + (m === 1 ? ' mes' : ' meses')}</span>` : '<span class="chip verde">vigente</span>';
      return `<tr><td><b>${esc(c.entidad)}</b><small>${esc(c.objeto)}</small></td><td>${esc(c.instrumento)}</td><td>${fecha(c.fecha_vencimiento)}</td>
        <td>${sit}${c.renovacion_automatica === 'Sí' ? '<small>renovación automática</small>' : ''}</td></tr>`;
    }).join('');
  }

  // cifras por validar
  function validar() {
    const V = H.VALIDACIONES || [];
    const cuenta = e => V.filter(r => r.estado === e).length;
    $('val-kpis').innerHTML = [
      kpi({ lbl: 'Por validar', valor: fmt(cuenta('por validar')), color: COLOR.ambar, det: 'Pendientes de respuesta de la oficina' }),
      kpi({ lbl: 'Validadas', valor: fmt(cuenta('validado')), color: COLOR.verde, det: 'Confirmadas sin cambios' }),
      kpi({ lbl: 'Corregidas', valor: fmt(cuenta('corregido')), color: COLOR.azul, det: 'Con corrección anotada en BITACORA' }),
      kpi({ lbl: 'Oficinas involucradas', valor: fmt(unicos(V.map(r => r.id_oficina)).length), color: COLOR.granate }),
    ].join('');
    const chip = e => `<span class="chip ${e === 'validado' ? 'verde' : e === 'corregido' ? 'azul' : 'ambar'}">${esc(e)}</span>`;
    $('t-val').innerHTML = V.map(r => `<tr><td><b>${esc(r.id)}</b></td><td><b>${esc(r.tema)}</b></td><td>${esc(r.que_dice)}</td><td>${esc(r.observacion)}</td>
      <td>${esc(oficinaNombre(r.id_oficina))}</td><td><small style="color:#6b7280">${esc(r.hoja)}<br>${esc(r.clave_registro)}</small></td>
      <td>${chip(r.estado)}${r.fecha_respuesta ? `<small>${fecha(r.fecha_respuesta)}</small>` : ''}</td></tr>`).join('')
      || '<tr><td colspan="7" class="vacio">Sin observaciones</td></tr>';
  }

  // pestañas
  const PINTAR = { res: resumen, pre: presupuesto, pro: produccion, cum: cumplimiento, equ: equipamiento, inf: infraestructura, int: intervenciones, val: validar };
  const pintados = {};
  function mostrar(tab) {
    if (!PINTAR[tab]) tab = 'res';
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    document.querySelectorAll('.tab').forEach(s => s.hidden = s.id !== 'tab-' + tab);
    try { localStorage.setItem('tabGA', tab); } catch {}
    if (!pintados[tab]) { pintados[tab] = true; PINTAR[tab](); }
    requestAnimationFrame(() => Object.values(charts).forEach(c => c.resize()));
  }
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => mostrar(b.dataset.tab));
  addEventListener('resize', () => Object.values(charts).forEach(c => c.resize()));

  fetch('/api/gestion').then(r => r.json()).then(d => {
    D = d; H = d.hojas || {};
    document.querySelectorAll('.ult-corte').forEach(e => e.textContent = fecha(d.resumen?.ultimo_corte) || '–');
    const pv = (H.VALIDACIONES || []).filter(r => r.estado === 'por validar').length;
    $('n-val').textContent = pv || '';
    if (!d.validacion) { document.querySelector('.tabs [data-tab="val"]')?.remove(); $('tab-val')?.remove(); delete PINTAR.val; $('ley-obs')?.remove(); }
    if (d.avisos?.length) {
      const a = $('avisos'); a.hidden = false;
      a.innerHTML = `<b>Revisar gestion_administrativa.xlsx (${d.avisos.length}):</b><ul>${d.avisos.slice(0, 30).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    }
    let tab = location.hash.slice(1); try { tab = tab || localStorage.getItem('tabGA'); } catch {}
    mostrar(tab);
  }).catch(e => {
    const a = $('avisos'); a.hidden = false; a.textContent = 'No se pudo leer /api/gestion: ' + e;
  }).finally(() => requestAnimationFrame(() => $('cargando').classList.add('listo')));
})();
