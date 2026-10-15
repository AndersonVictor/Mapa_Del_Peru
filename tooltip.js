// =====================================================================================
//  TOOLTIP: todo lo que se ve al pasar el mouse está en este archivo (ambos mapas lo usan).
//  Después de editarlo, recarga la página (F5).
// =====================================================================================

// 1) COLORES Y TAMAÑOS
const TOOLTIP_ESTILO = {
  fondo: 'rgba(17, 24, 39, .96)',   // gris muy oscuro
  texto: '#ffffff',
  borde: 'rgba(245, 158, 11, .55)', // ámbar
  acento: '#fbbf24',                // dato principal (ámbar)
  hombres: '#6fa8d4',
  mujeres: '#33b3a9',
  ancho: '250px',                   // ancho mínimo
};

// 2) POBLACIÓN POR SEXO: [columna de datos.xlsx, texto]
const TOOLTIP_SEXO = {
  titulo: 'Población por sexo',
  hombres: ['hombre', 'Hombres'],
  mujeres: ['mujer', 'Mujeres'],
};

// 3) OTROS DATOS que van al final, uno debajo del otro: [columna de datos.xlsx, texto, unidad]
//    Cambia el texto, el orden o borra una línea para ocultarla.
const TOOLTIP_FILAS = [
  ['densidad', 'Densidad de la población', ' hab/km²'],
];

// 4) COLUMNAS NUEVAS: cualquier columna que agregues a datos.xlsx aparece sola al final,
//    con su encabezado como texto. Para que NO salga alguna, ponla en esta lista.
const TOOLTIP_OCULTAR = ['nivel'];

// -------------------------------------------------------------------------------------
// (De aquí para abajo no hace falta tocar nada.)
const USADAS = ['id_geografia', 'nombregion', 'nombprov', 'nombdist', 'nombAmbito', 'indicador', 'dato'];
const escT = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const vacioT = v => v === undefined || v === null || String(v).trim() === '';
const numT = v => +String(v ?? '').replace(/[^\d.-]/g, '') || 0;            // "1 049 999" -> 1049999
const fmtT = n => Number(n).toLocaleString('es-PE').replace(/,/g, ' ');     // 1049999 -> "1 049 999"
const pctT = (a, b) => b ? ` (${(a / b * 100).toFixed(1).replace('.', ',')}%)` : '';

// Bloque "por sexo": dos filas con su porcentaje
function bloqueSexo(titulo, hombres, mujeres, txtH = 'Hombres', txtM = 'Mujeres') {
  const t = hombres + mujeres;
  return `<div class="sec">${escT(titulo)}</div>
    <div class="row"><span style="color:${TOOLTIP_ESTILO.hombres}">${txtH}</span><b>${fmtT(hombres)}${pctT(hombres, t)}</b></div>
    <div class="row"><span style="color:${TOOLTIP_ESTILO.mujeres}">${txtM}</span><b>${fmtT(mujeres)}${pctT(mujeres, t)}</b></div>`;
}

// Tooltip de población (mapa general y mapa de trabajo en modo Población)
function tooltipHTML(d, pie = '') {
  const [cH, tH] = TOOLTIP_SEXO.hombres, [cM, tM] = TOOLTIP_SEXO.mujeres;
  const fijas = [cH, cM, ...TOOLTIP_FILAS.map(f => f[0])];
  const extras = Object.keys(d).filter(c => !USADAS.includes(c) && !fijas.includes(c) && !TOOLTIP_OCULTAR.includes(c) && !vacioT(d[c]));
  const dato = (texto, valor) => `<div class="dato"><span>${escT(texto)}</span><b>${escT(valor)}</b></div>`;
  return `<h4>${escT(d.nombdist || d.nombprov || d.nombregion)}</h4>` +
    (vacioT(d.nombAmbito) ? '' : `<div class="amb">${escT(d.nombAmbito)}</div>`) +
    (vacioT(d.dato) ? '' : `<div class="destacado"><span>${escT(d.indicador || 'Dato')}</span><b>${escT(d.dato)}</b></div>`) +
    (vacioT(d[cH]) && vacioT(d[cM]) ? '' : `<div class="sep"></div>` + bloqueSexo(TOOLTIP_SEXO.titulo, numT(d[cH]), numT(d[cM]), tH, tM)) +
    TOOLTIP_FILAS.filter(([c]) => !vacioT(d[c])).map(([c, t, u = '']) => `<div class="sep"></div>` + dato(t, d[c] + u)).join('') +
    extras.map(c => `<div class="sep"></div>` + dato(c, d[c])).join('') + pie;
}

// Tooltip de jueces (mapa de trabajo, modo Jueces). Mismo orden que la medida RESUMEN del Power BI.
function tooltipJuecesHTML(j, titulo, departamento, pie = '') {
  const v = c => j?.[c] ?? 0;
  const punto = (color, texto, valor) => `<div class="row"><span><i class="punto" style="background:${color}"></i>${texto}</span><b>${valor}</b></div>`;
  return `<h4>${titulo}</h4><div class="amb">${departamento}</div>
    <div class="destacado"><span>Jueces y juezas</span><b>${v('total')}</b></div>
    <div class="sep"></div>${bloqueSexo('Por sexo', v('varones'), v('mujeres'), 'Varones', 'Mujeres')}
    <div class="sep"></div><div class="sec">Por condición</div>
    ${punto('#22c55e', 'Titulares', v('titulares'))}
    ${punto('#a78bfa', 'Provisionales', v('prov'))}
    ${punto('#f59e0b', 'Supernumerarios', v('supern'))}
    <div class="sep"></div><div class="sec">Por instancia</div>
    ${punto('#38bdf8', 'Salas', v('sala'))}
    ${punto('#2dd4bf', 'Juzgados especializados', v('jesp'))}
    ${punto('#a5b4fc', 'Juzgados de paz letrado', v('jpl'))}${pie}`;
}

(() => {
  const e = TOOLTIP_ESTILO, css = document.createElement('style');
  css.textContent = `
  #tip { position: absolute; left: 0; top: 0; will-change: transform; pointer-events: none; display: none; z-index: 5;
    min-width: ${e.ancho}; max-width: 330px; background: ${e.fondo}; color: ${e.texto}; border: 1px solid ${e.borde};
    border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.35); padding: 14px 16px;
    font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
  #tip h4 { margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -.01em; }
  #tip .amb { color: #9ca3af; font-size: 11.5px; margin-top: 1px; }
  #tip .destacado { margin-top: 10px; background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.18);
    border-radius: 8px; padding: 7px 11px; }
  #tip .destacado span { display: block; color: ${e.acento}; font-weight: 700; font-size: 12.5px; }
  #tip .destacado b { display: block; color: ${e.acento}; font-size: 25px; font-weight: 800; line-height: 1.1; letter-spacing: .01em; }
  #tip .sep { border-top: 1px solid rgba(255,255,255,.12); margin: 10px 0 8px; }
  #tip .sec { color: #9ca3af; font-size: 12px; font-weight: 700; letter-spacing: .02em; margin-bottom: 3px; }
  #tip .row { display: flex; justify-content: space-between; gap: 14px; font-size: 13px; margin-top: 2px; }
  #tip .row span { display: inline-flex; align-items: center; gap: 7px; font-weight: 600; }
  #tip .row b { font-weight: 800; white-space: nowrap; }
  #tip .punto { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex: none; }
  #tip .dato span { display: block; color: #9ca3af; font-size: 12px; font-weight: 600; }
  #tip .dato b { font-size: 14px; font-weight: 800; }
  #tip .bajo { color: #9ca3af; font-size: 11.5px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,.12); padding-top: 7px; }`;
  document.head.appendChild(css);
})();
