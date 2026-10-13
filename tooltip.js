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
  #tip .bajo { opacity: .65; font-size: 11px; margin-top: 6px; border-top: 1px solid rgba(128,128,128,.25); padding-top: 4px; }`;
  document.head.appendChild(css);
})();
