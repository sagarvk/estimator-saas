function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}
function round3(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 1000) / 1000;
}

function applyQtyRule(rule, ctx) {
  if (!rule) return null;

  if (typeof rule === "string") {
    try {
      rule = JSON.parse(rule);
    } catch {
      return null;
    }
  }

  // Your current water tank style:
  // { basis:"BUILTUP_AREA_SQFT", rules:[{qty, upto?},{from,to,qty},{from,qty}] }
  if (rule.basis && Array.isArray(rule.rules)) {
    const basis = String(rule.basis).toUpperCase();
    const key = basis === "BUILTUP_AREA_SQFT" ? "builtup_area_sqft" : null;
    if (!key) return null;

    const v = Number(ctx?.[key]);
    if (!Number.isFinite(v)) return null;

    for (const r of rule.rules) {
      const from = r.from == null ? -Infinity : Number(r.from); // inclusive-ish
      const to =
        r.to != null
          ? Number(r.to)
          : r.upto != null
          ? Number(r.upto)
          : Infinity;

      if (v > from && v <= to) return Number(r.qty) || 0;
      if (from === -Infinity && v <= to) return Number(r.qty) || 0;
      if (to === Infinity && v > from) return Number(r.qty) || 0;
    }
    return null;
  }

  // Old threshold style support (optional)
  if (rule.type === "threshold") {
    const v = Number(ctx?.[rule.by]);
    if (!Number.isFinite(v)) return null;
    for (const step of rule.steps || []) {
      if (step.max == null) return Number(step.qty) || 0;
      if (v <= Number(step.max)) return Number(step.qty) || 0;
    }
    return null;
  }

  return null;
}

/**
 * Main builder: makes breakup to exactly fit inside TOTAL_EXCL_GST,
 * by carving out extras first, then distributing the remainder.
 */
export function buildEstimate({
  builtupAreaSqft,
  ratePerSqft,
  gstRate = 0.18, // 0.18
  descriptions = [],
  charges = {}, // {contingencies_percent, electrification_percent}
}) {
  const builtup = Number(builtupAreaSqft);
  const rate = Number(ratePerSqft);

  const totalInclGst = round2(builtup * rate);
  const totalExclGst = round2(totalInclGst / (1 + gstRate));
  const gstAmount = round2(totalInclGst - totalExclGst);
  const gstPercent = gstRate * 100;

  const contPct = Number(charges?.contingencies_percent ?? 2.5);
  const elecPct = Number(charges?.electrification_percent ?? 2.5);
  const extraPctTotal = contPct + elecPct;

  // ✅ Correct base for extras so that (work + extras) == totalExclGst
  const workSubtotal = round2(totalExclGst / (1 + extraPctTotal / 100));

  const ctx = { builtup_area_sqft: builtup };

  // 1) Pre-calc FIXED_QTY + LUMPSUM totals (they must be inside workSubtotal)
  const fixedRows = [];
  let fixedTotal = 0;

  // 2) Collect percent items for later
  const percentItems = [];

  for (const d of descriptions) {
    const dRate = Number(d.rate || 0);
    const calc = String(d.calc_enum || "").toUpperCase();

    if (calc === "FIXED_QTY") {
      const ruleQty = applyQtyRule(d.qty_rule_json, ctx);
      const qty = round3(ruleQty ?? Number(d.fixed_qty || 0));
      const amount = round2(qty * dRate);

      fixedTotal = round2(fixedTotal + amount);
      fixedRows.push({
        name: d.name,
        unit: d.unit || "",
        rate: dRate,
        qty,
        amount,
      });
    } else if (calc === "LUMPSUM") {
      const qty = 1;
      const amount = round2(dRate);

      fixedTotal = round2(fixedTotal + amount);
      fixedRows.push({
        name: d.name,
        unit: d.unit || "",
        rate: dRate,
        qty,
        amount,
      });
    } else {
      // PERCENT
      percentItems.push(d);
    }
  }

  // 3) Remaining amount for percent distribution
  let percentBase = round2(workSubtotal - fixedTotal);
  if (percentBase < 0) percentBase = 0;

  // If your percent list doesn't sum to 100, you can normalize.
  const sumPercent = percentItems.reduce(
    (s, d) => s + Number(d.percent || 0),
    0
  );
  const normalize = sumPercent > 0 && Math.abs(sumPercent - 100) > 0.0001;

  const percentRows = [];
  let percentTotal = 0;

  for (const d of percentItems) {
    const dRate = Number(d.rate || 0);
    const pct = Number(d.percent || 0);

    const effectivePct = normalize ? (pct * 100) / sumPercent : pct;

    const amount = round2((percentBase * effectivePct) / 100);
    const qty = round3(dRate > 0 ? amount / dRate : 0);

    percentTotal = round2(percentTotal + amount);
    percentRows.push({
      name: d.name,
      unit: d.unit || "",
      rate: dRate,
      qty,
      amount,
    });
  }

  // 4) Extras calculated on workSubtotal (not on totalExclGst)
  const contAmt = round2((workSubtotal * contPct) / 100);
  const elecAmt = round2((workSubtotal * elecPct) / 100);

  const rows = [
    ...percentRows,
    ...fixedRows,
    {
      name: "Contingencies & Water Charges",
      unit: "%",
      rate: contPct,
      qty: 1,
      amount: contAmt,
      is_extra: true,
    },
    {
      name: "Electrification & Other Charges",
      unit: "%",
      rate: elecPct,
      qty: 1,
      amount: elecAmt,
      is_extra: true,
    },
  ];

  // 5) Final totals (force match)
  const exclGstFromRows = round2(percentTotal + fixedTotal + contAmt + elecAmt);

  // To avoid 1-2 rupee mismatch due to rounding, snap subtotal to computed target:
  const sub_total_excl_gst = totalExclGst;

  return {
    rows,
    meta: {
      builtup,
      ratePerSqft: rate,
      workSubtotal,
      percentBase,
      fixedTotal,
      percentTotal,
      extrasTotal: round2(contAmt + elecAmt),
      exclGstFromRows,
      normalizedPercents: normalize,
      sumPercent,
    },
    subtotalExclGst: sub_total_excl_gst,
    gstPercent,
    gstAmount,
    totalInclGst,
  };
}
