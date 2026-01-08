import PDFDocument from "pdfkit";

function money(n) {
  if (n === null || n === undefined) return "";
  return Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function generateEstimatePdfBuffer({
  estimate,
  items,
  letterheadPngBuffer,
  signSealPngBuffer,
}) {
  const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));

  function drawPage1Letterhead() {
    if (letterheadPngBuffer) {
      doc.image(letterheadPngBuffer, 36, 18, { width: doc.page.width - 72 });
      doc.y = 150;
    }
  }
  function title(t) {
    doc.font("Helvetica-Bold").fontSize(12).text(t, { align: "center" });
    doc.font("Helvetica").moveDown(0.5);
  }
  function row(cols, widths, opts = {}) {
    const y = doc.y;
    let x = 36;
    doc.fontSize(opts.fontSize || 9);
    for (let i = 0; i < cols.length; i++) {
      doc.text(String(cols[i] ?? ""), x, y, {
        width: widths[i],
        align: opts.align?.[i] || "left",
      });
      x += widths[i];
    }
    doc.moveDown(opts.gap ?? 0.7);
  }

  // Page 1
  drawPage1Letterhead();
  title("ESTIMATE SUMMARY");
  doc.fontSize(10);
  doc.text(`Ref. No: ${estimate.ref_no || ""}`, { align: "right" });
  doc.text(`Date: ${estimate.estimate_date || ""}`, { align: "right" });
  doc.moveDown(0.5);

  doc.text(`Client Name: ${estimate.client_name}`);
  doc.text(`Project Address: ${estimate.project_address}`);
  doc.text(
    `Plot: ${estimate.plot_length_ft || ""} ft x ${
      estimate.plot_width_ft || ""
    } ft`
  );
  doc.text(`Floors: ${estimate.floors || ""}`);
  doc.text(`Built-up Area: ${estimate.builtup_area_sqft} sq.ft.`);
  doc.text(`Rate (per sq.ft): ₹ ${money(estimate.rate_per_sqft)}`);
  doc.text(`Total (Incl. GST): ₹ ${money(estimate.grand_total_incl_gst)}`);

  // Abstract pages
  doc.addPage();
  doc.y = 40;
  title("ABSTRACT SHEET");
  doc.fontSize(9).text(`Ref. No: ${estimate.ref_no || ""}`, { align: "right" });
  doc
    .fontSize(9)
    .text(`Date: ${estimate.estimate_date || ""}`, { align: "right" });
  doc.moveDown(0.2);

  const widths = [30, 265, 55, 45, 65, 70];
  row(["SR", "DESCRIPTION", "QTY", "UNIT", "RATE", "AMOUNT"], widths, {
    fontSize: 9,
    align: ["left", "left", "right", "left", "right", "right"],
    gap: 0.4,
  });
  doc
    .moveTo(36, doc.y)
    .lineTo(doc.page.width - 36, doc.y)
    .stroke();
  doc.moveDown(0.6);

  for (const it of items) {
    row(
      [
        it.sr_no,
        it.description,
        it.qty ?? "",
        it.unit ?? "",
        it.rate != null ? money(it.rate) : "",
        money(it.amount),
      ],
      widths,
      {
        fontSize: 9,
        align: ["left", "left", "right", "left", "right", "right"],
        gap: 0.6,
      }
    );

    if (doc.y > doc.page.height - 120) {
      doc.addPage();
      doc.y = 40;
      title("ABSTRACT SHEET (Cont.)");
      doc
        .fontSize(9)
        .text(`Ref. No: ${estimate.ref_no || ""}`, { align: "right" });
      doc
        .fontSize(9)
        .text(`Date: ${estimate.estimate_date || ""}`, { align: "right" });
      doc.moveDown(0.2);
      row(["SR", "DESCRIPTION", "QTY", "UNIT", "RATE", "AMOUNT"], widths, {
        fontSize: 9,
        align: ["left", "left", "right", "left", "right", "right"],
        gap: 0.4,
      });
      doc
        .moveTo(36, doc.y)
        .lineTo(doc.page.width - 36, doc.y)
        .stroke();
      doc.moveDown(0.6);
    }
  }

  doc.moveDown(0.3);
  doc
    .moveTo(36, doc.y)
    .lineTo(doc.page.width - 36, doc.y)
    .stroke();
  doc.moveDown(0.6);

  row(
    [
      "",
      "Sub Total (Excl. GST)",
      "",
      "",
      "",
      money(estimate.sub_total_excl_gst),
    ],
    widths,
    { fontSize: 10, align: ["left", "left", "right", "left", "right", "right"] }
  );
  row(["", "GST @ 18%", "", "", "", money(estimate.gst_amount)], widths, {
    fontSize: 10,
    align: ["left", "left", "right", "left", "right", "right"],
  });
  row(
    ["", "Total (Incl. GST)", "", "", "", money(estimate.grand_total_incl_gst)],
    widths,
    { fontSize: 10, align: ["left", "left", "right", "left", "right", "right"] }
  );

  // Sign+seal + footer on all pages
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    if (signSealPngBuffer) {
      const imgW = 120,
        imgH = 70;
      doc.image(
        signSealPngBuffer,
        doc.page.width - 36 - imgW,
        doc.page.height - 36 - imgH,
        { width: imgW, height: imgH }
      );
    }
    const pageNo = i - range.start + 1;
    doc
      .fontSize(8)
      .fillColor("gray")
      .text(`Page ${pageNo} / ${range.count}`, 36, doc.page.height - 24, {
        width: doc.page.width - 72,
        align: "center",
      })
      .fillColor("black");
  }

  doc.end();
  return await new Promise((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  );
}
