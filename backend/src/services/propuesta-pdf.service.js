import PDFDocument from 'pdfkit';

const COLOR_INK = '#0b0b15';
const COLOR_GOLD = '#c89a4a';
const COLOR_SLATE = '#475569';
const COLOR_TEXT = '#1f2937';
const COLOR_LINE = '#e5e7eb';

const MARGEN_X = 50;
const MARGEN_TOP = 85;
const MARGEN_BOTTOM = 50;
const ANCHO_PAGINA = 612 - MARGEN_X * 2;

// Dibuja el membrete (encabezado + footer) en la página actual.
// pdfkit dispara `addPage()` automáticamente cuando un `text()` cae bajo
// el margen inferior (incluso con `lineBreak: false`). Como el footer
// está intencionalmente en esa zona, desactivamos el margen inferior
// solo durante el dibujo y lo restauramos al final.
function dibujarMembrete(doc, { numeroPagina }) {
  const margenBottomOriginal = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.save();

  // Banda dorada superior
  doc.rect(0, 0, doc.page.width, 6).fill(COLOR_GOLD);

  doc
    .fontSize(14)
    .fillColor(COLOR_INK)
    .font('Helvetica-Bold')
    .text('ESTRATEGO', MARGEN_X, 24, { lineBreak: false });
  doc
    .fontSize(8)
    .fillColor(COLOR_SLATE)
    .font('Helvetica')
    .text('Business AI Architecture · Florida, United States', MARGEN_X, 42, {
      lineBreak: false,
    });
  doc
    .fontSize(8)
    .fillColor(COLOR_GOLD)
    .text('estratego.us', MARGEN_X, 54, { lineBreak: false });

  // Esquina derecha — número de página
  doc
    .fontSize(8)
    .fillColor(COLOR_SLATE)
    .font('Helvetica')
    .text(`Página ${numeroPagina}`, doc.page.width - MARGEN_X - 100, 42, {
      width: 100,
      align: 'right',
      lineBreak: false,
    });

  // Línea separadora superior
  doc
    .strokeColor(COLOR_LINE)
    .lineWidth(0.5)
    .moveTo(MARGEN_X, 75)
    .lineTo(doc.page.width - MARGEN_X, 75)
    .stroke();

  // Pie de página
  const piePosY = doc.page.height - 30;
  doc
    .strokeColor(COLOR_LINE)
    .lineWidth(0.5)
    .moveTo(MARGEN_X, piePosY - 6)
    .lineTo(doc.page.width - MARGEN_X, piePosY - 6)
    .stroke();
  doc
    .fontSize(7)
    .fillColor(COLOR_SLATE)
    .font('Helvetica-Oblique')
    .text(
      'Documento confidencial — Estratego · Business AI Architecture · estratego.us',
      MARGEN_X,
      piePosY,
      { width: ANCHO_PAGINA, align: 'center', lineBreak: false },
    );

  doc.restore();
  // Restaurar margen inferior original para que el flujo de contenido
  // pueda paginar normalmente en siguientes operaciones.
  doc.page.margins.bottom = margenBottomOriginal;
  // Restaurar posición de escritura al inicio del área de contenido
  doc.x = MARGEN_X;
  doc.y = MARGEN_TOP;
}

// Agrupa el texto en bloques para renderizar de corrido y sin huecos vacíos
// inesperados. Tipos: 'titulo' (sección entre ==== ===), 'parrafo', 'item',
// 'lista', 'espacio'.
function parsearBloques(texto) {
  const lineas = texto.split(/\r?\n/);
  const bloques = [];
  let i = 0;
  let parrafoBuffer = [];

  const flushParrafo = () => {
    if (parrafoBuffer.length === 0) return;
    bloques.push({ tipo: 'parrafo', texto: parrafoBuffer.join(' ') });
    parrafoBuffer = [];
  };

  while (i < lineas.length) {
    const linea = lineas[i];
    const trimmed = linea.trim();

    // Sección entre ==== TITULO ====
    if (
      /^=+$/.test(trimmed) &&
      lineas[i + 1] != null &&
      lineas[i + 2] != null &&
      /^=+$/.test(lineas[i + 2].trim())
    ) {
      flushParrafo();
      bloques.push({ tipo: 'titulo', texto: lineas[i + 1].trim() });
      i += 3;
      continue;
    }

    // Otros separadores sueltos: ignorar
    if (/^=+$/.test(trimmed) || /^-{3,}$/.test(trimmed)) {
      flushParrafo();
      i++;
      continue;
    }

    // Línea en blanco → fin de párrafo
    if (!trimmed) {
      flushParrafo();
      i++;
      continue;
    }

    // Ítem ordenado: "1. Algo"
    if (/^\d+\.\s+/.test(trimmed)) {
      flushParrafo();
      bloques.push({ tipo: 'item', texto: trimmed });
      i++;
      continue;
    }

    // Bullet con guion
    if (/^-\s+/.test(trimmed)) {
      flushParrafo();
      bloques.push({ tipo: 'lista', texto: trimmed.replace(/^-\s+/, '') });
      i++;
      continue;
    }

    // Texto normal — se agrupa hasta encontrar un blanco
    parrafoBuffer.push(trimmed);
    i++;
  }
  flushParrafo();
  return bloques;
}

function renderizarCuerpo(doc, texto) {
  const bloques = parsearBloques(texto);
  const opcionesTexto = { width: ANCHO_PAGINA, lineGap: 1.5, align: 'justify' };

  for (const b of bloques) {
    if (b.tipo === 'titulo') {
      // Caja dorada con título
      if (doc.y > doc.page.height - MARGEN_BOTTOM - 60) doc.addPage();
      doc.moveDown(0.4);
      const y0 = doc.y;
      doc.save();
      doc.rect(MARGEN_X, y0, ANCHO_PAGINA, 20).fill('#f5ecd9');
      doc.rect(MARGEN_X, y0, 4, 20).fill(COLOR_GOLD);
      doc.restore();
      doc
        .fillColor(COLOR_INK)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(b.texto, MARGEN_X + 12, y0 + 5, {
          width: ANCHO_PAGINA - 16,
          align: 'left',
          lineBreak: false,
        });
      doc.y = y0 + 20 + 4;
      continue;
    }

    if (b.tipo === 'item') {
      doc
        .fillColor(COLOR_TEXT)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(b.texto, { ...opcionesTexto, align: 'left' });
      doc.moveDown(0.1);
      continue;
    }

    if (b.tipo === 'lista') {
      const indent = 14;
      doc
        .fillColor(COLOR_TEXT)
        .font('Helvetica')
        .fontSize(10)
        .text('• ' + b.texto, MARGEN_X + indent, doc.y, {
          width: ANCHO_PAGINA - indent,
          lineGap: 1.5,
          align: 'left',
        });
      doc.x = MARGEN_X;
      continue;
    }

    // parrafo
    doc
      .fillColor(COLOR_TEXT)
      .font('Helvetica')
      .fontSize(10)
      .text(b.texto, opcionesTexto);
    doc.moveDown(0.25);
  }
}

export function renderizarPropuestaPDF({
  textoPropuesta,
  nombreCliente,
  nombreEmpresa,
  plan,
}) {
  return new Promise((resolve, reject) => {
    try {
      // bufferPages permite editar páginas anteriores antes de cerrar el doc.
      // Esto nos deja dibujar el membrete al final, evitando que el footer
      // (que cae cerca del borde inferior) dispare paginación falsa.
      const doc = new PDFDocument({
        size: 'LETTER',
        bufferPages: true,
        margins: {
          top: MARGEN_TOP,
          bottom: MARGEN_BOTTOM,
          left: MARGEN_X,
          right: MARGEN_X,
        },
      });

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Renderiza el contenido sin tocar el membrete. pdfkit pagina
      // libremente por overflow del texto.
      renderizarCuerpo(doc, textoPropuesta);

      // Ahora que ya están definidas todas las páginas, dibuja el membrete
      // sobre cada una.
      const range = doc.bufferedPageRange(); // { start, count }
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        dibujarMembrete(doc, { numeroPagina: i + 1 });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
