function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export async function buildEstimateSnapshot({
  db,
  engineerId,
  input,
  gstRate,
}) {
  const {
    client_name,
    project_address,
    plot_length_ft,
    plot_width_ft,
    floors,
    builtup_area_sqft,
    ptype_id,
    quality_id,
  } = input;

  const { data: quality, error: qErr } = await db
    .from("construction_quality")
    .select("id, rate_per_sqft, ptype_id")
    .eq("id", quality_id)
    .eq("ptype_id", ptype_id)
    .single();
  if (qErr || !quality) throw new Error("Invalid quality selection");

  const area = Number(builtup_area_sqft);
  const ratePerSqft = Number(quality.rate_per_sqft);

  const grandTotal = round2(area * ratePerSqft); // incl GST
  const subTotal = round2(grandTotal / (1 + gstRate)); // excl GST
  const gstAmount = round2(grandTotal - subTotal);

  // addons (ptype override else global)
  const { data: addonRows } = await db
    .from("estimate_addons")
    .select("*")
    .eq("active", true)
    .or(`ptype_id.eq.${ptype_id},ptype_id.is.null`);

  const byKey = new Map();
  for (const row of addonRows || []) {
    const prev = byKey.get(row.key);
    if (!prev) byKey.set(row.key, row);
    else if (prev.ptype_id === null && row.ptype_id !== null)
      byKey.set(row.key, row);
  }

  const contingency = byKey.get("CONTINGENCY_WATER") || {
    label: "Add for Contingencies & Water Charges",
    percent: 2.5,
    sort_order: 900,
  };
  const electrification = byKey.get("ELECTRIFICATION_OTHER") || {
    label: "Add for Electrification & Other Charges",
    percent: 2.5,
    sort_order: 910,
  };

  const addon1Amount = round2(subTotal * (Number(contingency.percent) / 100));
  const addon2Amount = round2(
    subTotal * (Number(electrification.percent) / 100)
  );
  const remainingBudget = round2(subTotal - addon1Amount - addon2Amount);

  const { data: items, error: dErr } = await db
    .from("description_items")
    .select("*")
    .eq("ptype_id", ptype_id)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (dErr || !items?.length)
    throw new Error("No description items for this project type");

  const sumPercent = items.reduce((s, it) => s + Number(it.percent || 0), 0);
  if (sumPercent <= 0) throw new Error("Description percents must sum > 0");

  const ruleCodes = [
    ...new Set(
      items
        .filter((i) => i.use_assumption_qty && i.rule_code)
        .map((i) => i.rule_code)
    ),
  ];
  const rulesByCode = new Map();
  if (ruleCodes.length) {
    const { data: rules } = await db
      .from("qty_rules_area_band")
      .select("*")
      .in("rule_code", ruleCodes)
      .eq("active", true);
    for (const r of rules || []) {
      if (!rulesByCode.has(r.rule_code)) rulesByCode.set(r.rule_code, []);
      rulesByCode.get(r.rule_code).push(r);
    }
    for (const [k, arr] of rulesByCode.entries()) {
      arr.sort((a, b) => Number(a.area_min_sqft) - Number(b.area_min_sqft));
      rulesByCode.set(k, arr);
    }
  }

  function pickRuleValue(rule_code) {
    const bands = rulesByCode.get(rule_code) || [];
    const band = bands.find(
      (b) => area >= Number(b.area_min_sqft) && area <= Number(b.area_max_sqft)
    );
    return band ? Number(band.value) : null;
  }

  let sr = 1;
  const lineItems = items.map((it) => {
    const portion = Number(it.percent) / sumPercent;
    const amount = round2(remainingBudget * portion);

    let qty = null;
    let rate = null;
    const unit = it.unit || "";

    if (it.use_assumption_qty && it.rule_code) {
      const assumedQty = pickRuleValue(it.rule_code);
      if (assumedQty && assumedQty > 0) {
        qty = round2(assumedQty);
        rate = round2(amount / qty); // derived rate (your accepted approach)
      } else {
        const base = Number(it.base_rate || 0);
        if (base > 0) {
          qty = round2(amount / base);
          rate = round2(base);
        }
      }
    } else {
      const base = Number(it.base_rate || 0);
      if (base > 0) {
        qty = round2(amount / base);
        rate = round2(base);
      }
    }

    return {
      sr_no: sr++,
      description: it.description,
      qty,
      unit,
      rate,
      amount,
      is_addon: false,
      sort_order: it.sort_order,
    };
  });

  lineItems.push({
    sr_no: sr++,
    description: `${contingency.label} @ ${Number(contingency.percent).toFixed(
      2
    )}%`,
    qty: null,
    unit: "LS",
    rate: null,
    amount: addon1Amount,
    is_addon: true,
    sort_order: contingency.sort_order || 900,
  });
  lineItems.push({
    sr_no: sr++,
    description: `${electrification.label} @ ${Number(
      electrification.percent
    ).toFixed(2)}%`,
    qty: null,
    unit: "LS",
    rate: null,
    amount: addon2Amount,
    is_addon: true,
    sort_order: electrification.sort_order || 910,
  });

  const sum = round2(lineItems.reduce((s, x) => s + Number(x.amount || 0), 0));
  const diff = round2(subTotal - sum);
  if (diff !== 0)
    lineItems[lineItems.length - 1].amount = round2(
      Number(lineItems[lineItems.length - 1].amount) + diff
    );

  return {
    header: {
      engineer_id: engineerId,
      client_name,
      project_address,
      plot_length_ft,
      plot_width_ft,
      floors,
      builtup_area_sqft: area,
      ptype_id,
      quality_id,
      rate_per_sqft: ratePerSqft,
      grand_total_incl_gst: grandTotal,
      sub_total_excl_gst: subTotal,
      gst_amount: gstAmount,
      status: "pending_payment",
    },
    items: lineItems,
  };
}
