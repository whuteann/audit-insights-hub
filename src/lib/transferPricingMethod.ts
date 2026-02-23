export type DerivedMethodResult = {
  testedParty: string;
  method: "TNMM" | "CPM" | "RPM" | "CUP" | "PSM";
  pli: string;
  confidence: number;
  reasons: string[];
};

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function getAny(obj: Record<string, any>, ...keys: string[]): any {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

const METHOD_PLI: Record<DerivedMethodResult["method"], string> = {
  TNMM: "Operating Margin (ROS)",
  CPM: "Cost Plus Mark-up",
  RPM: "Gross Margin",
  CUP: "Price per controlled transaction",
  PSM: "Residual/Contribution Split",
};

export function deriveTransferPricingMethod(input: Record<string, any>): DerivedMethodResult {
  const companyName = getAny(input, "companyName", "company_name") || "(Company)";
  const testedParty = String(companyName);

  const rptTypes = asArray(getAny(input, "rptTypesSelected", "rpt_types_selected")).map(String);
  const rptDetails = asRecord(getAny(input, "rptDetailsByType", "rpt_details_by_type"));
  const majorBusinessLines = asArray(getAny(input, "majorBusinessLines", "major_business_lines")).map((v) =>
    String(v).toLowerCase()
  );
  const intangibleTypes = asArray(getAny(input, "intangibleTypes", "intangible_types")).map((v) =>
    String(v).toLowerCase()
  );
  const intercompanyServices = asArray(getAny(input, "intercompanyServices", "intercompany_services"));
  const customers = asArray(getAny(input, "customers"));
  const risksTable = asArray(getAny(input, "risksTable", "risks_table"));
  const pricingPolicy = asRecord(getAny(input, "pricingPolicy", "pricing_policy"));

  const hasSales = rptTypes.includes("Related Party Sales");
  const hasPurchases = rptTypes.includes("Related Party Purchase");
  const hasServices = rptTypes.includes("Intercompany Services") || intercompanyServices.length > 0;
  const hasManyRPT = rptTypes.length >= 3;

  const hasDistributionProfile = majorBusinessLines.some((line) =>
    ["distribution", "resale", "trading"].some((keyword) => line.includes(keyword))
  );
  const hasManufacturingOrServiceProfile = majorBusinessLines.some((line) =>
    ["manufacturing", "services", "service"].some((keyword) => line.includes(keyword))
  );

  const highRiskCount = risksTable.filter((risk) =>
    String(risk?.assumptionLevel ?? risk?.assumption_level ?? "")
      .toLowerCase()
      .includes("high")
  ).length;

  let hasInvoiceEvidence = false;
  Object.values(rptDetails).forEach((rows) => {
    asArray(rows).forEach((row) => {
      const invoices = row?.invoices;
      if (hasText(invoices)) hasInvoiceEvidence = true;
    });
  });

  const hasComparableThirdPartySales = customers.length > 0;
  const hasIntangibleComplexity = intangibleTypes.length > 0;
  const pricingPolicyComplete =
    hasText(pricingPolicy.formulaAdopted || pricingPolicy.formula_adopted) &&
    hasText(pricingPolicy.policyOwner || pricingPolicy.policy_owner) &&
    hasText(pricingPolicy.revisionFrequency || pricingPolicy.revision_frequency);

  const scores: Record<DerivedMethodResult["method"], number> = {
    TNMM: 2,
    CPM: 0,
    RPM: 0,
    CUP: 0,
    PSM: 0,
  };

  const reasons: string[] = [];

  if (hasDistributionProfile && hasSales) {
    scores.RPM += 3;
    reasons.push("Distribution + related party sales profile supports RPM screening.");
  }

  if (hasManufacturingOrServiceProfile && hasPurchases) {
    scores.CPM += 3;
    reasons.push("Manufacturing/service profile with related party purchases supports CPM screening.");
  }

  if (hasServices) {
    scores.CPM += 1;
    scores.TNMM += 1;
    reasons.push("Intercompany services are present; CPM/TNMM remain relevant.");
  }

  if (hasInvoiceEvidence && hasComparableThirdPartySales) {
    scores.CUP += 4;
    reasons.push("Invoice evidence and third-party transaction context support CUP feasibility.");
  }

  if (hasIntangibleComplexity) {
    scores.PSM += 3;
    scores.TNMM += 1;
    reasons.push("Intangibles are involved, increasing PSM relevance for value split scenarios.");
  }

  if (highRiskCount > 0) {
    scores.TNMM += 2;
    scores.PSM += 1;
    reasons.push("Higher-risk profile reduces routine-method fit and favors TNMM/PSM.");
  }

  if (hasSales && hasPurchases) {
    scores.TNMM += 2;
    reasons.push("Both related party sales and purchases are present; TNMM is robust across mixed flows.");
  }

  if (hasManyRPT) {
    scores.TNMM += 4;
    scores.CPM = Math.max(scores.CPM - 1, 0);
    scores.RPM = Math.max(scores.RPM - 1, 0);
    reasons.push("Multiple RPT categories detected; single-transaction methods are less reliable than TNMM.");
  }

  if (hasPurchases && !hasSales && pricingPolicyComplete) {
    scores.CPM += 1;
    reasons.push("Complete pricing policy with purchase-focused profile modestly supports CPM.");
  }

  const methods: DerivedMethodResult["method"][] = ["TNMM", "CUP", "PSM", "RPM", "CPM"];
  const sorted = methods.sort((a, b) => scores[b] - scores[a]);
  const selectedMethod = sorted[0];

  if (selectedMethod === "TNMM" && !reasons.some((r) => r.includes("TNMM"))) {
    reasons.push("TNMM selected as the most reliable default where direct comparables are limited.");
  }

  const topScore = scores[sorted[0]];
  const secondScore = scores[sorted[1]];
  const confidence = Math.max(55, Math.min(90, 60 + (topScore - secondScore) * 8));

  return {
    testedParty,
    method: selectedMethod,
    pli: METHOD_PLI[selectedMethod],
    confidence,
    reasons,
  };
}
