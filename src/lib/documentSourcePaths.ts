export type SourcePathGroup = {
  label: string;
  options: Array<{ label: string; value: string }>;
};

export const DOCUMENT_SOURCE_PATH_GROUPS: SourcePathGroup[] = [
  {
    label: "Core",
    options: [
      { label: "Company Name", value: "company_name" },
      { label: "Brand Names (joined)", value: "brand_names" },
      { label: "Financial Year End", value: "financial_year_end" },
      { label: "Jurisdiction", value: "jurisdiction" },
      { label: "Derived Method", value: "derived_method" },
      { label: "Derived Tested Party", value: "derived_tested_party" },
      { label: "Derived PLI", value: "derived_pli" },
      { label: "No. Comparables", value: "number_of_comparables" },
      { label: "Median", value: "median" },
      { label: "P37.5", value: "p375" },
      { label: "P62.5", value: "p625" },
    ],
  },
  {
    label: "String Arrays (auto-joined)",
    options: [
      { label: "Major Business Lines", value: "major_business_lines" },
      { label: "Main Geographic Markets", value: "main_geographic_markets" },
      { label: "Intangible Types", value: "intangible_types" },
      { label: "RPT Types Selected", value: "rpt_types_selected" },
      { label: "Tangible Assets", value: "tangible_assets" },
      { label: "Trade Intangibles Used", value: "trade_intangibles_used" },
      { label: "Marketing Intangibles Used", value: "marketing_intangibles_used" },
    ],
  },
  {
    label: "Arrays (map in tables)",
    options: [
      { label: "Group Ownership", value: "group_ownership" },
      { label: "Intercompany Services", value: "intercompany_services" },
      { label: "Departments", value: "departments" },
      { label: "Management Reporting Line", value: "management_reporting_line" },
      { label: "Customers", value: "customers" },
      { label: "Suppliers", value: "suppliers" },
      { label: "Services Provided", value: "services_provided" },
      { label: "Projects", value: "projects" },
      { label: "Functions Table", value: "functions_table" },
      { label: "Risks Table", value: "risks_table" },
      { label: "RPT Details By Type", value: "rpt_details_by_type" },
    ],
  },
  {
    label: "Nested",
    options: [
      { label: "Pricing Policy • Formula", value: "pricing_policy.formulaAdopted" },
      { label: "Pricing Policy • Owner", value: "pricing_policy.policyOwner" },
      { label: "Pricing Policy • Revision", value: "pricing_policy.revisionFrequency" },
    ],
  },
  {
    label: "Row Mapping (table steps)",
    options: [
      { label: "Row Field (example)", value: "$row.example_key" },
      { label: "Row Amount", value: "$row.amount" },
      { label: "Row Related Party", value: "$row.relatedPartyEntity" },
    ],
  },
];
