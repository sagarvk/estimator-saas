import PDFDocument from "pdfkit";

// 0.5 inch margin = 36 points
const MARGIN_PT = 36;

const ftToM = (ft) => Number(ft || 0) * 0.3048;
const sqftToSqm = (sqft) => Number(sqft || 0) * 0.092903;

const num2 = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return v.toFixed(2);
};

// ✅ NO currency symbol (₹ removed)
const money = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return v.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function drawCell(doc, x, y, w, h, text, opts = {}) {
  const pad = opts.pad ?? 4;
  const align = opts.align ?? "left";
  const bold = !!opts.bold;
  const fontSize = opts.fontSize ?? 9;
  const wrap = opts.wrap ?? false;

  // border
  doc.rect(x, y, w, h).stroke();

  doc.save();
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(fontSize)
    .fillColor("#000");

  if (wrap) {
    // wrap text (for DESCRIPTION)
    doc.text(String(text ?? ""), x + pad, y + pad, {
      width: w - pad * 2,
      align,
    });
  } else {
    // single-line vertically centered (for other columns)
    const ty = y + (h - fontSize) / 2 - 1;
    doc.text(String(text ?? ""), x + pad, ty, {
      width: w - pad * 2,
      align,
      lineBreak: false,
    });
  }

  doc.restore();
}

function addLetterheadFullPage(doc, letterheadBuffer) {
  if (!letterheadBuffer) return;
  try {
    // ✅ full-bleed background
    doc.image(letterheadBuffer, 0, 0, {
      width: doc.page.width,
      height: doc.page.height,
    });
  } catch {
    // ignore image errors
  }
}

function addFooterAbsolute(doc, signsealBuffer, pageNo, totalPages) {
  const pageW = doc.page.width;
  const pageH = doc.page.height;

  doc.save();

  // Sign+Seal bottom-right (inside printable area)
  if (signsealBuffer) {
    try {
      doc.image(
        signsealBuffer,
        pageW - MARGIN_PT - 140,
        pageH - MARGIN_PT - 90,
        {
          width: 130,
        }
      );
    } catch {}
  }

  // ✅ Page number INSIDE content area (IMPORTANT)
  // If you place text below (pageH - bottomMargin), PDFKit may create a new page.
  const y = pageH - MARGIN_PT - 12;

  doc.font("Helvetica").fontSize(9).fillColor("#000");
  doc.text(`Page ${pageNo} of ${totalPages}`, 0, y, {
    width: pageW,
    align: "center",
    lineBreak: false,
  });

  doc.restore();
}

function formatDateDMY(input) {
  // input can be "YYYY-MM-DD" or ISO string
  try {
    const d = new Date(input);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    // fallback if already in dd/mm/yyyy
    return String(input || "");
  }
}

function drawGrid(doc, x, y, w, h, vLines = [], hLines = []) {
  doc.save();
  doc.lineWidth(1);

  // outer border
  doc.rect(x, y, w, h).stroke();

  // vertical lines (relative positions from 0..w)
  vLines.forEach((vx) => {
    doc
      .moveTo(x + vx, y)
      .lineTo(x + vx, y + h)
      .stroke();
  });

  // horizontal lines (relative positions from 0..h)
  hLines.forEach((hy) => {
    doc
      .moveTo(x, y + hy)
      .lineTo(x + w, y + hy)
      .stroke();
  });

  doc.restore();
}

function drawTextInBox(doc, x, y, w, h, text, opts = {}) {
  const pad = opts.pad ?? 6;
  const align = opts.align ?? "left";
  const bold = !!opts.bold;
  const fontSize = opts.fontSize ?? 12;

  doc.save();
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(fontSize)
    .fillColor("#000");

  // ✅ allow wrapping; vertical padding is handled by pad
  doc.text(String(text ?? ""), x + pad, y + pad, {
    width: w - pad * 2,
    height: h - pad * 2,
    align,
  });

  doc.restore();
}

function drawAutoRow(doc, x, y, labelW, valueW, label, value, opts = {}) {
  const fontSize = opts.fontSize ?? 12;
  const minH = opts.minH ?? 28;
  const pad = opts.pad ?? 6;

  const labelH = measureTextHeight(doc, label, labelW, {
    fontSize,
    bold: true,
    pad,
  });

  const valueH = measureTextHeight(doc, value, valueW, {
    fontSize,
    bold: true,
    pad,
  });

  const rowH = Math.max(minH, labelH, valueH);

  // borders
  // borders ONCE (outer + middle)
  doc.rect(x, y, labelW + valueW, rowH).stroke();
  doc
    .moveTo(x + labelW, y)
    .lineTo(x + labelW, y + rowH)
    .stroke();

  // text
  drawTextInBox(doc, x, y, labelW, rowH, String(label).toUpperCase(), {
    bold: true,
    fontSize,
    pad,
    align: "left",
  });

  drawTextInBox(
    doc,
    x + labelW,
    y,
    valueW,
    rowH,
    String(value ?? "").toUpperCase(),
    {
      bold: true,
      fontSize,
      pad,
      align: "left",
    }
  );

  return y + rowH;
}

function drawPlotDimensionBlock(doc, x, y, w, h, plotLengthFt, plotWidthFt) {
  const leftW = w * 0.42;
  const rightW = w - leftW;

  const topH = h * 0.5;
  const bottomH = h - topH;

  // ✅ EXACT column widths (no rounding drift)
  const colW = rightW / 4;

  // Grid lines:
  // vertical: split left and right + 3 inner columns on right
  const vLines = [leftW, leftW + colW, leftW + colW * 2, leftW + colW * 3];

  // horizontal: only on RIGHT part (header/value split)
  // ✅ To avoid line crossing left merged cell, we draw it manually only on right
  drawGrid(doc, x, y, w, h, vLines, []); // no horizontal full-width line

  // right-only horizontal line
  doc.save();
  doc.lineWidth(1);
  doc
    .moveTo(x + leftW, y + topH)
    .lineTo(x + w, y + topH)
    .stroke();
  doc.restore();

  // Text
  drawTextInBox(doc, x, y, leftW, h, "PLOT DIMENSIONS", {
    bold: true,
    fontSize: 12,
    align: "left",
  });

  const Lft = Number(plotLengthFt || 0);
  const Wft = Number(plotWidthFt || 0);
  const Lm = ftToM(Lft);
  const Wm = ftToM(Wft);

  const headers = ["L (FT.)", "L (M)", "W (FT.)", "W (M)"];
  const values = [
    Lft > 0 ? num2(Lft) : "-",
    Lft > 0 ? num2(Lm) : "-",
    Wft > 0 ? num2(Wft) : "-",
    Wft > 0 ? num2(Wm) : "-",
  ];

  for (let i = 0; i < 4; i++) {
    const cx = x + leftW + colW * i;
    drawTextInBox(doc, cx, y, colW, topH, headers[i], {
      bold: true,
      fontSize: 11,
      align: "center",
    });
    drawTextInBox(doc, cx, y + topH, colW, bottomH, values[i], {
      bold: true,
      fontSize: 12,
      align: "center",
    });
  }

  return y + h;
}

function measureCellHeight(doc, text, colW, opts = {}) {
  const pad = opts.pad ?? 5;
  const fontSize = opts.fontSize ?? 10;
  const bold = !!opts.bold;

  doc.save();
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);

  const h = doc.heightOfString(String(text ?? ""), {
    width: Math.max(10, colW - pad * 2),
    align: opts.align ?? "left",
  });

  doc.restore();
  return h + pad * 2;
}

function drawCellBorder(doc, x, y, w, h) {
  doc.rect(x, y, w, h).stroke();
}

function drawTextWrap(doc, x, y, w, h, text, opts = {}) {
  const pad = opts.pad ?? 5;
  const align = opts.align ?? "left";
  const bold = !!opts.bold;
  const fontSize = opts.fontSize ?? 10;

  doc.save();
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(fontSize)
    .fillColor("#000");

  doc.text(String(text ?? ""), x + pad, y + pad, {
    width: w - pad * 2,
    height: h - pad * 2,
    align,
  });

  doc.restore();
}

function drawTextSingleLineVCenter(doc, x, y, w, h, text, opts = {}) {
  const pad = opts.pad ?? 5;
  const align = opts.align ?? "center";
  const bold = !!opts.bold;
  const fontSize = opts.fontSize ?? 10;

  doc.save();
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(fontSize)
    .fillColor("#000");

  const ty = y + (h - fontSize) / 2 - 1;
  doc.text(String(text ?? ""), x + pad, ty, {
    width: w - pad * 2,
    align,
    lineBreak: false,
  });

  doc.restore();
}

function calcDescRowHeight(doc, text, colW, baseRowH, opts = {}) {
  const pad = opts.pad ?? 4;
  const fontSize = opts.fontSize ?? 9;

  doc.save();
  doc.font("Helvetica").fontSize(fontSize);

  const h = doc.heightOfString(String(text || ""), {
    width: Math.max(10, colW - pad * 2),
    align: "left",
  });

  doc.restore();

  // text height + padding top+bottom
  const needed = Math.ceil(h + pad * 2);
  return Math.max(baseRowH, needed);
}

function measureTextHeight(doc, text, width, opts = {}) {
  const pad = opts.pad ?? 6;
  const fontSize = opts.fontSize ?? 12;
  const bold = !!opts.bold;

  doc.save();
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);

  const h = doc.heightOfString(String(text ?? ""), {
    width: Math.max(10, width - pad * 2),
    align: opts.align ?? "left",
  });

  doc.restore();
  return h + pad * 2; // include padding top+bottom
}

function drawBuiltupAreaBlock(doc, x, y, w, h, builtupAreaSqft) {
  const leftW = w * 0.42;
  const rightW = w - leftW;

  const topH = h * 0.5;
  const bottomH = h - topH;

  const colW = rightW / 2;

  // Grid lines: left split + one inner split for SQFT/SQM
  const vLines = [leftW, leftW + colW];

  // outer + verticals
  drawGrid(doc, x, y, w, h, vLines, []);

  // right-only horizontal line
  doc.save();
  doc.lineWidth(1);
  doc
    .moveTo(x + leftW, y + topH)
    .lineTo(x + w, y + topH)
    .stroke();
  doc.restore();

  // Left merged label
  drawTextInBox(doc, x, y, leftW, h, "TOTAL BUILTUP AREA", {
    bold: true,
    fontSize: 12,
    align: "left",
  });

  // Right headers
  drawTextInBox(doc, x + leftW, y, colW, topH, "SQ.FT.", {
    bold: true,
    fontSize: 11,
    align: "center",
  });
  drawTextInBox(doc, x + leftW + colW, y, colW, topH, "SQ.M.", {
    bold: true,
    fontSize: 11,
    align: "center",
  });

  const sqft = Number(builtupAreaSqft || 0);
  const sqm = sqftToSqm(sqft);

  // Right values
  drawTextInBox(
    doc,
    x + leftW,
    y + topH,
    colW,
    bottomH,
    sqft > 0 ? num2(sqft) : "-",
    {
      bold: true,
      fontSize: 12,
      align: "center",
    }
  );
  drawTextInBox(
    doc,
    x + leftW + colW,
    y + topH,
    colW,
    bottomH,
    sqft > 0 ? num2(sqm) : "-",
    {
      bold: true,
      fontSize: 12,
      align: "center",
    }
  );

  return y + h;
}

function drawTwoColRow(doc, x, y, labelW, valueW, h, label, value, opts = {}) {
  const fontSize = opts.fontSize ?? 12;
  const pad = opts.pad ?? 6;

  // Draw borders ONCE (outer + middle line)
  doc.rect(x, y, labelW + valueW, h).stroke();
  doc
    .moveTo(x + labelW, y)
    .lineTo(x + labelW, y + h)
    .stroke();

  // Text (NO borders)
  drawCellText(doc, x, y, labelW, h, String(label).toUpperCase(), {
    bold: true,
    fontSize,
    pad,
    align: "left",
    wrap: false,
  });

  drawCellText(
    doc,
    x + labelW,
    y,
    valueW,
    h,
    String(value ?? "").toUpperCase(),
    {
      bold: true,
      fontSize,
      pad,
      align: "left",
      wrap: true, // value can wrap if long
    }
  );

  return y + h;
}

function drawCellText(doc, x, y, w, h, text, opts = {}) {
  const pad = opts.pad ?? 4;
  const align = opts.align ?? "left";
  const bold = !!opts.bold;
  const fontSize = opts.fontSize ?? 9;
  const wrap = !!opts.wrap;

  doc.save();
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(fontSize)
    .fillColor("#000");

  if (wrap) {
    doc.text(String(text ?? ""), x + pad, y + pad, {
      width: w - pad * 2,
      align,
    });
  } else {
    const ty = y + (h - fontSize) / 2 - 1;
    doc.text(String(text ?? ""), x + pad, ty, {
      width: w - pad * 2,
      align,
      lineBreak: false,
    });
  }

  doc.restore();
}

function drawRowGrid(doc, x, y, widths, h) {
  const totalW = widths.reduce((a, b) => a + b, 0);

  // outer border once
  doc.rect(x, y, totalW, h).stroke();

  // internal vertical lines once
  let cx = x;
  for (let i = 0; i < widths.length - 1; i++) {
    cx += widths[i];
    doc
      .moveTo(cx, y)
      .lineTo(cx, y + h)
      .stroke();
  }
}

function drawAbstractHeaderRow(doc, x, y, cols) {
  const h = 24;

  // draw borders once for the full header row
  drawRowGrid(
    doc,
    x,
    y,
    cols.map((c) => c.w),
    h
  );

  // draw only text (no border per cell)
  cols.forEach((c) => {
    drawCellText(doc, c.x, y, c.w, h, (c.label || "").toUpperCase(), {
      bold: true,
      align: c.align || "center",
      fontSize: 9,
      wrap: false,
    });
  });

  return y + h;
}

export async function buildEstimatePdfBuffer({
  letterheadBuffer,
  signsealBuffer,

  refNo,
  estDate,

  clientName,
  projectAddress,
  plotLengthFt,
  plotWidthFt,
  floors,
  builtupArea,
  ratePerSqft,

  rows,
  subtotal,
  gstAmount,
  total,
  gstPercent = 18,
}) {
  return await new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: MARGIN_PT,
          left: MARGIN_PT,
          right: MARGIN_PT,
          bottom: MARGIN_PT,
        },
        bufferPages: true, // needed for total pages
        autoFirstPage: true,
      });

      const chunks = [];
      doc.on("data", (d) => chunks.push(d));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // =========================
      // PAGE 1 — SUMMARY
      // =========================
      addLetterheadFullPage(doc, letterheadBuffer);

      // Content start AFTER letterhead area visually (but letterhead is background)
      let y = 140;

      // Ref No & Date (BOLD)
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#000");
      doc.text(`REF. NO.: ${String(refNo || "").toUpperCase()}`, MARGIN_PT, y);
      const dateDMY = formatDateDMY(estDate);
      doc.text(`DATE: ${String(dateDMY || "").toUpperCase()}`, MARGIN_PT, y, {
        width: doc.page.width - MARGIN_PT * 2,
        align: "right",
      });
      y += 30;

      doc.font("Helvetica-Bold").fontSize(16);
      doc.text("ESTIMATE SUMMARY", MARGIN_PT, y, {
        width: doc.page.width - MARGIN_PT * 2,
        align: "center",
      });
      y += 18;

      const x0 = MARGIN_PT;
      const tableW = doc.page.width - MARGIN_PT * 2;
      const labelW = Math.round(tableW * 0.42);
      const valueW = tableW - labelW;
      //const rowH = 24;

      // ✅ don’t show 0 if user didn’t enter plot size / floors
      const plFt =
        plotLengthFt != null && Number(plotLengthFt) > 0
          ? Number(plotLengthFt)
          : null;
      const pwFt =
        plotWidthFt != null && Number(plotWidthFt) > 0
          ? Number(plotWidthFt)
          : null;

      const plM = plFt ? ftToM(plFt) : null;
      const pwM = pwFt ? ftToM(pwFt) : null;

      const buaSqft = Number(builtupArea || 0);
      const buaSqm = sqftToSqm(buaSqft);

      const approxRate = buaSqft > 0 ? Number(total || 0) / buaSqft : 0;

      const plotText =
        plFt && pwFt
          ? `${num2(plFt)} FT (${num2(plM)} M)  x  ${num2(pwFt)} FT (${num2(
              pwM
            )} M)`
          : "-";

      const floorsText =
        floors != null && String(floors).trim() !== "" && Number(floors) > 0
          ? String(floors)
          : "-";

      const summaryRows = [
        ["NAME OF CLIENT", String(clientName || "").toUpperCase()],
        ["ADDRESS", String(projectAddress || "").toUpperCase()],
        ["PLOT DIMENSION", plotText],
        [
          "TOTAL BUILTUP AREA",
          `${num2(buaSqft)} SQ.FT. (${num2(buaSqm)} SQ.M.)`,
        ],
        ["NO. OF FLOORS", floorsText],
        ["SUB TOTAL ESTIMATE AMOUNT", money(subtotal)],
        [`GST AMOUNT @ ${num2(gstPercent)}%`, money(gstAmount)],
        ["TOTAL ESTIMATE AMOUNT", money(total)],
        ["APPROXIMATE RATE PER SQ.FT.", money(approxRate)],
      ];

      // ✅ All items on first page in bold
      //summaryRows.forEach(([lbl, val]) => {
      //  drawCell(doc, x0, y, labelW, rowH, lbl, { bold: true, fontSize: 10 });
      //  drawCell(doc, x0 + labelW, y, valueW, rowH, val, {
      //    bold: true,
      //    fontSize: 10,
      //  });
      //  y += rowH;
      //});

      const rowH = 28; // a bit bigger for readability
      const blockH = 56; // 2-row block like screenshot

      // NAME OF CLIENT
      const minRowH = 28;
      const fontSize = 12;

      // NAME OF CLIENT (auto-height)
      y = drawAutoRow(
        doc,
        x0,
        y,
        labelW,
        valueW,
        "NAME OF CLIENT",
        clientName,
        {
          minH: minRowH,
          fontSize,
        }
      );

      // ADDRESS (auto-height)
      y = drawAutoRow(doc, x0, y, labelW, valueW, "ADDRESS", projectAddress, {
        minH: minRowH,
        fontSize,
      });

      // ✅ PLOT DIMENSION BLOCK (like screenshot)
      y = drawPlotDimensionBlock(
        doc,
        x0,
        y,
        tableW,
        blockH,
        plotLengthFt,
        plotWidthFt
      );

      // ✅ BUILTUP AREA BLOCK (like screenshot)
      y = drawBuiltupAreaBlock(doc, x0, y, tableW, blockH, builtupArea);

      // NO. OF FLOORS
      y = drawTwoColRow(
        doc,
        x0,
        y,
        labelW,
        valueW,
        rowH,
        "NO. OF FLOORS",
        floorsText,
        {
          fontSize: 12,
        }
      );

      // SUBTOTAL
      y = drawTwoColRow(
        doc,
        x0,
        y,
        labelW,
        valueW,
        rowH,
        "SUB TOTAL ESTIMATE AMOUNT",
        money(subtotal),
        { fontSize: 12 }
      );

      // GST
      y = drawTwoColRow(
        doc,
        x0,
        y,
        labelW,
        valueW,
        rowH,
        `GST AMOUNT @ ${num2(gstPercent)}%`,
        money(gstAmount),
        { fontSize: 12 }
      );

      // TOTAL
      y = drawTwoColRow(
        doc,
        x0,
        y,
        labelW,
        valueW,
        rowH,
        "TOTAL ESTIMATE AMOUNT",
        money(total),
        {
          fontSize: 12,
        }
      );

      // APPROX RATE
      y = drawTwoColRow(
        doc,
        x0,
        y,
        labelW,
        valueW,
        rowH,
        "APPROXIMATE RATE PER SQ.FT.",
        money(approxRate),
        { fontSize: 12 }
      );

      // =========================
      // PAGE 2+ — ABSTRACT
      // =========================

      doc.addPage();

      let ay = MARGIN_PT;

      doc.font("Helvetica-Bold").fontSize(12).fillColor("#000");
      doc.text("ABSTRACT SHEET", MARGIN_PT, ay, {
        width: doc.page.width - MARGIN_PT * 2,
        align: "center",
      });
      ay += 18;

      const ax = MARGIN_PT;
      const aw = doc.page.width - MARGIN_PT * 2;

      const cols = [
        { key: "sr", label: "SR", w: Math.round(aw * 0.07), align: "center" },
        {
          key: "name",
          label: "DESCRIPTION",
          w: Math.round(aw * 0.43),
          align: "left",
        },
        {
          key: "unit",
          label: "UNIT",
          w: Math.round(aw * 0.1),
          align: "center",
        },
        { key: "qty", label: "QTY", w: Math.round(aw * 0.1), align: "right" },
        {
          key: "rate",
          label: "RATE",
          w: Math.round(aw * 0.15),
          align: "right",
        },
        {
          key: "amount",
          label: "AMOUNT",
          w:
            aw -
            (Math.round(aw * 0.07) +
              Math.round(aw * 0.43) +
              Math.round(aw * 0.1) +
              Math.round(aw * 0.1) +
              Math.round(aw * 0.15)),
          align: "right",
        },
      ];

      let cx = ax;
      cols.forEach((c) => {
        c.x = cx;
        cx += c.w;
      });

      const rowH2 = 22;

      const drawHeader = () => {
        ay = drawAbstractHeaderRow(doc, ax, ay, cols);
      };

      const ensureSpace = (needH = rowH2) => {
        const bottomLimit = doc.page.height - MARGIN_PT - 100;
        if (ay + needH > bottomLimit) {
          doc.addPage();
          ay = MARGIN_PT;

          doc.font("Helvetica-Bold").fontSize(12);
          doc.text("ABSTRACT SHEET", MARGIN_PT, ay, {
            width: doc.page.width - MARGIN_PT * 2,
            align: "center",
          });
          ay += 18;

          drawHeader();
        }
      };

      // First header
      drawHeader();

      // Line items
      // Line items
      (rows || []).forEach((r, idx) => {
        // compute height based ONLY on description column (name)
        const descText = String(r.name || "").toUpperCase();
        const descCol = cols.find((c) => c.key === "name");

        const rowH = calcDescRowHeight(doc, descText, descCol.w, rowH2, {
          fontSize: 9,
          pad: 4,
        });

        // ensureSpace must consider rowH now
        const bottomLimit = doc.page.height - MARGIN_PT - 100;
        if (ay + rowH > bottomLimit) {
          doc.addPage();
          ay = MARGIN_PT;

          doc.font("Helvetica-Bold").fontSize(12);
          doc.text("ABSTRACT SHEET", MARGIN_PT, ay, {
            width: doc.page.width - MARGIN_PT * 2,
            align: "center",
          });
          ay += 18;

          drawHeader();
        }

        const values = {
          sr: String(idx + 1),
          name: descText,
          unit: String(r.unit || "").toUpperCase(),
          qty: r.qty != null ? num2(r.qty) : "",
          rate: r.rate != null ? money(r.rate) : "",
          amount: r.amount != null ? money(r.amount) : "",
        };

        // draw borders once per row
        drawRowGrid(
          doc,
          ax,
          ay,
          cols.map((c) => c.w),
          rowH
        );

        // draw text without borders
        cols.forEach((c) => {
          drawCellText(doc, c.x, ay, c.w, rowH, values[c.key], {
            bold: false,
            fontSize: 9,
            align: c.align || "left",
            wrap: c.key === "name", // wrap only description
          });
        });

        ay += rowH;
      });

      // ✅ totals rows INSIDE TABLE with borders
      const totalsRow = (label, value, bold = true) => {
        ensureSpace(rowH2);

        const leftW = cols[0].w + cols[1].w + cols[2].w + cols[3].w + cols[4].w;
        const amtW = cols[5].w;

        // draw grid once (2 columns only)
        drawRowGrid(doc, ax, ay, [leftW, amtW], rowH2);

        drawCellText(doc, ax, ay, leftW, rowH2, String(label).toUpperCase(), {
          bold,
          fontSize: 9,
          align: "right",
        });

        drawCellText(doc, ax + leftW, ay, amtW, rowH2, value, {
          bold,
          fontSize: 9,
          align: "right",
        });

        ay += rowH2;
      };

      totalsRow("SUB TOTAL", money(subtotal), true);
      totalsRow(`GST @ ${num2(gstPercent)}%`, money(gstAmount), true);
      totalsRow("GRAND TOTAL", money(total), true);

      // =========================
      // PAGE NUMBERS + SIGNSEAL (NO EXTRA PAGES)
      // =========================
      const range = doc.bufferedPageRange(); // { start, count }
      const totalPages = range.count;

      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        addFooterAbsolute(doc, signsealBuffer, i + 1, totalPages);
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
