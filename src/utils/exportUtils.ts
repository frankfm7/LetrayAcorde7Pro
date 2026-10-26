import { Song, Hymnal } from '../types';
import { resolveTheme } from './exportThemes';
import { parseLyricRows } from './exportImage';
import { songToTxt, TXT_SEPARATOR } from './songText';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

// Función auxiliar para descargar blob
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Función auxiliar para obtener todas las letras (todos los idiomas)
const plainChords = (lyrics: string): string =>
  lyrics.split('\n').map(l => (l.trim().startsWith('//') ? l.slice(l.indexOf('//') + 2).replace(/\s+$/, '') : l)).join('\n');

const getAllLyrics = (song: Song): string => {
  let allLyrics = '';
  
  // Si tiene letras por idioma, exportar todas
  if (song.lyricsByLanguage && Object.keys(song.lyricsByLanguage).length > 0) {
    Object.entries(song.lyricsByLanguage).forEach(([lang, lyrics]) => {
      allLyrics += `\n=== ${lang.toUpperCase()} ===\n\n${lyrics}\n`;
    });
  } else {
    // Si no tiene idiomas separados, usar la letra principal
    allLyrics = song.lyrics;
  }
  
  return plainChords(allLyrics);
};

// Exportar como archivo de texto plano
export const exportAsTxt = (songs: Song[]): void => {
  try {
    const content = songs.map(song => songToTxt(song)).join(`\n\n${TXT_SEPARATOR}\n\n`) + '\n';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${songs.length === 1 ? songs[0].title : 'canciones'}.txt`);
  } catch (error) {
    console.error('Error al exportar TXT:', error);
    throw new Error('No se pudo exportar el archivo de texto');
  }
};

// Exportar como JSON
export const exportAsJson = (songs: Song[]): void => {
  try {
    const content = JSON.stringify(songs, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `${songs.length === 1 ? songs[0].title : 'canciones'}.json`);
  } catch (error) {
    console.error('Error al exportar JSON:', error);
    throw new Error('No se pudo exportar el archivo JSON');
  }
};

// Exportar como Word (.docx)
export const exportAsWord = async (songs: Song[]): Promise<void> => {
  try {
    const children: Paragraph[] = [];

    songs.forEach((song, index) => {
      // Título
      children.push(
        new Paragraph({
          text: song.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        })
      );

      // Artista
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: song.artist,
              italics: true,
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        })
      );

      // Información
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Tonalidad: ${song.key} | Compás: ${song.timeSignature} | BPM: ${song.bpm}`,
              size: 20,
              color: '666666',
            }),
          ],
          spacing: { after: 300 },
        })
      );

      // Letras (todos los idiomas)
      if (song.lyricsByLanguage && Object.keys(song.lyricsByLanguage).length > 0) {
        Object.entries(song.lyricsByLanguage).forEach(([lang, lyrics]) => {
          // Encabezado de idioma
          children.push(
            new Paragraph({
              text: `=== ${lang.toUpperCase()} ===`,
              alignment: AlignmentType.CENTER,
              spacing: { before: 300, after: 200 },
              children: [
                new TextRun({
                  text: `=== ${lang.toUpperCase()} ===`,
                  bold: true,
                  size: 24,
                  color: '7c3aed',
                }),
              ],
            })
          );

          // Letra del idioma
          const lines = lyrics.split('\n');
          lines.forEach(line => {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('//')) {
              // Acorde
              const chord = line.slice(line.indexOf('//') + 2).replace(/\s+$/, '');
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: chord,
                      bold: true,
                      color: '7c3aed',
                      size: 22, font: 'Courier New',
                    }),
                  ],
                  spacing: { after: 0 },
                })
              );
            } else if (trimmed.match(/^(VERSO|CORO|PUENTE|INTRO|FINAL)/i)) {
              // Sección
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: trimmed,
                      bold: true,
                      size: 24,
                      color: 'f59e0b',
                    }),
                  ],
                  spacing: { before: 200, after: 100 },
                })
              );
            } else if (trimmed) {
              // Letra normal
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: line,
                      size: 22, font: 'Courier New',
                    }),
                  ],
                  spacing: { after: 50 },
                })
              );
            } else {
              // Línea vacía
              children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
            }
          });
        });
      } else {
        // Letra principal
        const lines = song.lyrics.split('\n');
        lines.forEach(line => {
          const trimmed = line.trim();
          
          if (trimmed.startsWith('//')) {
            const chord = line.slice(line.indexOf('//') + 2).replace(/\s+$/, '');
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: chord,
                    bold: true,
                    color: '7c3aed',
                    size: 22,
                    font: 'Courier New',
                  }),
                ],
                spacing: { after: 0 },
              })
            );
          } else if (trimmed.match(/^(VERSO|CORO|PUENTE|INTRO|FINAL)/i)) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: trimmed,
                    bold: true,
                    size: 24,
                    color: 'f59e0b',
                  }),
                ],
                spacing: { before: 200, after: 100 },
              })
            );
          } else if (trimmed) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 22,
                    font: 'Courier New',
                  }),
                ],
                spacing: { after: 50 },
              })
            );
          } else {
            children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
          }
        });
      }

      // Separador entre canciones (excepto la última)
      if (index < songs.length - 1) {
        children.push(
          new Paragraph({
            text: '\n' + '='.repeat(50) + '\n',
            spacing: { before: 400, after: 400 },
          })
        );
      }
    });

    const doc = new Document({
      sections: [{
        children: children,
      }],
    });

    const blob = await Packer.toBlob(doc);

    saveAs(blob, `${songs.length === 1 ? songs[0].title : 'canciones'}.docx`);
  } catch (error) {
    console.error('Error al exportar Word:', error);
    throw new Error('No se pudo exportar el archivo Word');
  }
};

// Exportar como PDF (letra en tipografía monoespaciada para que los acordes queden alineados)
const parseColor = (c: string): [number, number, number] => {
  const hex = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(c);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return [0, 0, 0];
};

export interface PdfOptions {
  themeId?: string;
  hymnals?: Hymnal[];
}

export const exportAsPdf = (songs: Song[], opts: PdfOptions = {}): void => {
  try {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const PW = 210;
    const PH = 297;
    const M = 16;
    const usable = PW - M * 2;
    const MM = 0.3528; // mm por punto

    songs.forEach((song, idx) => {
      const hymnal = opts.hymnals?.find(h => h.id === song.hymnalId);
      const theme = resolveTheme(opts.themeId || hymnal?.exportTheme || 'light', hymnal);
      const c0 = parseColor(theme.colors[0]);
      const c1 = parseColor(theme.colors[theme.colors.length > 1 ? 1 : 0]);
      const text = parseColor(theme.text);
      const chordC = parseColor(theme.chord);
      const sectionC = parseColor(theme.section);
      const mutedC = parseColor(theme.muted);
      const isPlain = theme.colors.length === 1 && theme.colors[0].toLowerCase() === '#ffffff';

      const paintPage = () => {
        if (isPlain) return;
        if (theme.colors.length === 1) {
          pdf.setFillColor(c0[0], c0[1], c0[2]);
          pdf.rect(0, 0, PW, PH, 'F');
          return;
        }
        const bands = 70;
        for (let b = 0; b < bands; b++) {
          const t = b / (bands - 1);
          pdf.setFillColor(
            Math.round(c0[0] + (c1[0] - c0[0]) * t),
            Math.round(c0[1] + (c1[1] - c0[1]) * t),
            Math.round(c0[2] + (c1[2] - c0[2]) * t)
          );
          pdf.rect(0, (PH / bands) * b, PW, PH / bands + 0.6, 'F');
        }
      };
      const footer = () => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(mutedC[0], mutedC[1], mutedC[2]);
        pdf.text(`${song.title}  ·  Letra&Acorde7Pro`, PW / 2, PH - 8, { align: 'center' });
      };

      if (idx > 0) pdf.addPage();
      paintPage();

      // Bloques de letra (un bloque por idioma si la canción es bilingüe)
      const blocks: Array<{ label?: string; lyrics: string }> =
        song.lyricsByLanguage && Object.keys(song.lyricsByLanguage).length > 1
          ? Object.entries(song.lyricsByLanguage).map(([label, lyrics]) => ({ label, lyrics }))
          : [{ lyrics: song.lyrics || '' }];

      const allRows = blocks.map(b => parseLyricRows(b.lyrics));
      const maxChars = Math.max(10, ...allRows.flat().map(r => (r.type === 'blank' ? 0 : r.text.length)));
      const fs = Math.max(7.5, Math.min(11, usable / (maxChars * 0.6 * MM)));
      const lineH = fs * MM * 1.5;
      const chordH = fs * MM * 1.15;

      let y = M + 4;
      const ensure = (needed: number) => {
        if (y + needed > PH - M - 6) {
          footer();
          pdf.addPage();
          paintPage();
          y = M + 4;
        }
      };

      // Título e información
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(text[0], text[1], text[2]);
      const titleLines: string[] = pdf.splitTextToSize(song.title, usable);
      titleLines.forEach(l => { pdf.text(l, M, y + 7); y += 9.5; });
      y += 1;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(mutedC[0], mutedC[1], mutedC[2]);
      const info = [[song.hymnalDetail, song.hymnalNumber].filter(Boolean).join(' '), song.artist && song.artist !== 'Desconocido' ? song.artist : '', song.key ? `Tono ${song.key}` : '', song.timeSignature, song.bpm ? `${song.bpm} BPM` : ''].filter(Boolean).join('   •   ');
      pdf.text(info, M, y + 4);
      y += 8;
      pdf.setDrawColor(chordC[0], chordC[1], chordC[2]);
      pdf.setLineWidth(0.8);
      pdf.line(M, y, M + 22, y);
      y += 7;

      blocks.forEach((block, bi) => {
        if (block.label) {
          ensure(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor(sectionC[0], sectionC[1], sectionC[2]);
          pdf.text(`=== ${block.label.toUpperCase()} ===`, M, y + 4);
          y += 9;
        }
        const rows = allRows[bi];
        rows.forEach((row, ri) => {
          if (row.type === 'blank') { y += lineH * 0.6; return; }
          if (row.type === 'section') {
            ensure(lineH * 3);
            y += 2;
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.setTextColor(sectionC[0], sectionC[1], sectionC[2]);
            pdf.text(row.text, M, y + 4);
            y += 7;
            return;
          }
          if (row.type === 'chords') {
            // la línea de acordes y la de letra de abajo no se separan entre páginas
            ensure(chordH + lineH + 1);
            pdf.setFont('courier', 'bold');
            pdf.setFontSize(fs);
            pdf.setTextColor(chordC[0], chordC[1], chordC[2]);
            pdf.text(row.text, M, y + fs * MM);
            y += chordH;
            return;
          }
          ensure(lineH);
          pdf.setFont('courier', 'normal');
          pdf.setFontSize(fs);
          pdf.setTextColor(text[0], text[1], text[2]);
          pdf.text(row.text, M, y + fs * MM);
          y += lineH;
          void ri;
        });
      });
      footer();
    });

    pdf.save(`${songs.length === 1 ? songs[0].title : 'canciones'}.pdf`);
  } catch (error) {
    console.error('Error al exportar PDF:', error);
    throw new Error('No se pudo exportar el archivo PDF');
  }
};
