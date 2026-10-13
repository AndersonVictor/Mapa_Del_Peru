// =====================================================================================
//  TOOLTIP: todo lo que se ve al pasar el mouse está en este archivo (ambos mapas lo usan).
//  Después de editarlo, recarga la página con Ctrl+F5.
// =====================================================================================

// 1) COLORES Y TAMAÑOS
const TOOLTIP_ESTILO = {
  fondo: '#ffffff',
  texto: '#222222',
  borde: '#c8102e',        // franja de la izquierda
  colorDato: '#c8102e',    // color del número grande
  tamanoDato: '20px',
  tamanoTexto: '13px',
  ancho: '210px',          // ancho mínimo
};

// 2) FILAS FIJAS: [nombre de la columna en datos.xlsx, texto que se muestra]
//    Cambia el texto, el orden o borra una línea para ocultarla.
const TOOLTIP_FILAS = [
  ['hombre', 'Hombres'],
  ['mujer', 'Mujeres'],
  ['densidad', 'Densidad'],
];

// 3) COLUMNAS NUEVAS: cualquier columna que agregues a datos.xlsx aparece sola debajo,
//    con su encabezado como texto. Para que NO salga alguna, ponla en esta lista.
const TOOLTIP_OCULTAR = ['nivel'];

// 4) TOOLTIP DE JUECES (mapa de trabajo, modo ⚖️ Jueces). Mismo orden que la medida RESUMEN del Power BI.
//    Puedes cambiar textos y emojis; los nombres entre ${ } son los datos.
function tooltipJuecesHTML(j, titulo, departamento, pie = '') {
  const v = c => j?.[c] ?? 0;
  return `<h4>📍 ${titulo.toUpperCase()} — ${departamento}</h4>
    <div class="sep"></div>
    <div class="big">⚖️ ${v('total')} <small>Jueces y Juezas</small></div>
    <div class="row"><span>👨 Varones</span><b>${v('varones')}</b></div>
    <div class="row"><span>👩 Mujeres</span><b>${v('mujeres')}</b></div>
    <div class="sep"></div>
    <div class="sec">📌 POR CONDICIÓN</div>
    <div class="row"><span>🟢 Titulares</span><b>${v('titulares')}</b></div>
    <div class="row"><span>🟡 Provisionales</span><b>${v('prov')}</b></div>
    <div class="row"><span>🔴 Supernumerarios</span><b>${v('supern')}</b></div>
    <div class="sep"></div>
    <div class="sec">🏛️ POR INSTANCIA</div>
    <div class="row"><span>🏢 Salas</span><b>${v('sala')}</b></div>
    <div class="row"><span>⚡ J. Especializados</span><b>${v('jesp')}</b></div>
    <div class="row"><span>🏘️ JPL</span><b>${v('jpl')}</b></div>${pie}`;
}

// -------------------------------------------------------------------------------------
// (De aquí para abajo no hace falta tocar nada.)
const USADAS = ['id_geografia', 'nombregion', 'nombprov', 'nombdist', 'nombAmbito', 'indicador', 'dato'];

function tooltipHTML(d, pie = '') {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const vacio = v => v === undefined || v === null || String(v).trim() === '';
  const fila = (txt, v) => vacio(v) ? '' : `<div class="row"><span>${esc(txt)}</span><b>${esc(v)}</b></div>`;
  const fijas = TOOLTIP_FILAS.map(f => f[0]);
  const extras = Object.keys(d).filter(c => !USADAS.includes(c) && !fijas.includes(c) && !TOOLTIP_OCULTAR.includes(c));
  return `<h4>${esc(d.nombdist || d.nombprov || d.nombregion)}</h4>` +
    (vacio(d.nombAmbito) ? '' : `<div class="amb">${esc(d.nombAmbito)}</div>`) +
    (vacio(d.indicador) ? '' : `<div>${esc(d.indicador)}</div>`) +
    (vacio(d.dato) ? '' : `<div class="big">${esc(d.dato)}</div>`) +
    TOOLTIP_FILAS.map(([c, txt]) => fila(txt, d[c])).join('') +
    extras.map(c => fila(c, d[c])).join('') + pie;
}

(() => {
  const e = TOOLTIP_ESTILO, css = document.createElement('style');
  css.textContent = `
  #tip { position: absolute; left: 0; top: 0; will-change: transform; pointer-events: none; display: none; z-index: 5;
    min-width: ${e.ancho}; max-width: 320px; background: ${e.fondo}; color: ${e.texto}; border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,.25); padding: 10px 12px; font-size: ${e.tamanoTexto}; line-height: 1.45;
    border-left: 4px solid ${e.borde}; }
  #tip h4 { margin: 0 0 2px; font-size: 14px; }
  #tip .amb { opacity: .65; font-size: 11px; margin-bottom: 6px; }
  #tip .big { font-size: ${e.tamanoDato}; font-weight: 700; color: ${e.colorDato}; }
  #tip .row { display: flex; justify-content: space-between; gap: 12px; }
  #tip .big small { font-size: 12px; font-weight: 600; }
  #tip .sep { border-top: 1px solid rgba(128,128,128,.3); margin: 6px 0; }
  #tip .sec { font-size: 11px; font-weight: 700; opacity: .7; margin-bottom: 2px; }
  #tip .bajo { opacity: .65; font-size: 11px; margin-top: 6px; border-top: 1px solid rgba(128,128,128,.25); padding-top: 4px; }`;
  document.head.appendChild(css);
})();
