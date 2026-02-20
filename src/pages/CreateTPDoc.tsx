import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  CircleDot,
  Command,
  FileText,
  Lock,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { WizardStepper, type StageStatus } from "@/components/wizard/WizardStepper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

/**
 * CreateTPDoc (config-driven)
 *
 * Follows the user's 16-stage spec EXACTLY:
 * - Each stage title matches the spec.
 * - Each field is implemented.
 * - Dynamic tables / repeatable blocks are implemented.
 * - Conditional stages are enforced.
 * - Stage 16 is system-derived and read-only.
 */

// -----------------------------
// Options (minimal; replace with your own datasets)
// -----------------------------

const JURISDICTIONS = ["Malaysia", "Singapore", "Indonesia", "Thailand", "Vietnam", "Other"] as const;
const COUNTRIES = ["Malaysia", "Singapore", "United States", "China", "Japan", "United Kingdom", "Other"] as const;
const MARKETS = ["Malaysia", "ASEAN", "APAC", "EU", "US", "Global"] as const;
const BUSINESS_LINES = ["Manufacturing", "Distribution", "Services", "IP / R&D", "Financing", "Other"] as const;
const SERVICE_CATEGORIES = [
  "Management",
  "IT",
  "Marketing",
  "HR",
  "Finance",
  "Legal",
  "Procurement",
  "Other",
] as const;
const BASIS_OF_CHARGE = ["Cost", "Cost + Mark-up", "Fixed fee", "Per head", "Other"] as const;
const BORROWING_TYPES = ["Loan", "Advance"] as const;
const CURRENCIES = ["MYR", "USD", "SGD", "EUR", "GBP", "JPY", "CNY", "Other"] as const;
const REVISION_FREQ = ["Monthly", "Quarterly", "Semi-annually", "Annually", "Ad-hoc"] as const;
const CREDIT_TERMS = ["Immediate", "7 days", "14 days", "30 days", "60 days", "90 days", "Other"] as const;
const PROJECT_STATUS = ["Ongoing", "Completed"] as const;
const LOSS_REASON_CATEGORY = [
  "Start-up / ramp-up",
  "One-off costs",
  "Pricing pressure / competition",
  "Underutilisation",
  "Project delays",
  "FX / currency",
  "Other",
] as const;
const COST_CATEGORIES = [
  "Payroll",
  "Training",
  "Rent",
  "Depreciation",
  "Marketing",
  "Professional fees",
  "Logistics",
  "Utilities",
  "Other",
] as const;
const RPT_TYPES = [
  "Related Party Purchase",
  "Related Party Sales",
  "Other Income",
  "Expenses Paid",
  "Subcontractor Fees Paid",
  "Consultant Fees Paid",
  "Equipment Fees Paid",
  "Expense paid on behalf of/by",
  "Receipt of Advances",
  "Provision of Advances",
  "Rental Paid",
  "Acquisition of PPE",
  "Acquisition of PPE on Behalf",
  "Commission paid",
  "Intercompany Services",
  "Intercompany Financing",
  "Other",
] as const;

// -----------------------------
// Schema helpers
// -----------------------------

type Source = "PRI" | "SB" | "Derived";

type FieldKind =
  | "text"
  | "number"
  | "date"
  | "textarea"
  | "dropdown"
  | "yesno"
  | "checkbox_group"
  | "multi_text"
  | "multi_select"
  | "file"
  | "toggle"
  | "dynamic_table"
  | "repeatable_blocks"
  | "readonly";

type BaseField = {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  help?: string;
  required?: boolean;
  options?: readonly string[];
  /** show this field only if predicate returns true */
  visibleIf?: (state: FormState) => boolean;
};

type DynamicTableField = BaseField & {
  kind: "dynamic_table";
  columns: Array<{
    key: string;
    label: string;
    kind: Exclude<FieldKind, "dynamic_table" | "repeatable_blocks">;
    options?: readonly string[];
    toggleLabel?: string;
  }>
};

type RepeatableBlocksField = BaseField & {
  kind: "repeatable_blocks";
  blockLabel: string;
  blockFields: Array<BaseField | Omit<DynamicTableField, "visibleIf">>;
  min?: number;
  max?: number;
};

type Stage = {
  id: string;
  title: string;
  source: Source;
  purpose: string;
  fields: Array<BaseField | DynamicTableField | RepeatableBlocksField>;
  /** show stage only if predicate returns true */
  visibleIf?: (state: FormState) => boolean;
};

// -----------------------------
// Form State
// -----------------------------

type TableRow = { id: string; [k: string]: any };

type FormState = {
  // 1
  companyName: string;
  brandNames: string[];
  financialYearEnd: string; // ISO date
  jurisdiction: string;
  isLossMaking: boolean | null;

  // 2
  groupOwnership: TableRow[];

  // 3
  majorBusinessLines: string[]; // multi-select
  businessLinesOther: string;
  productsServicesDesc: string;
  keyBusinessDrivers: string;
  mainGeographicMarkets: string[]; // multi-select
  supplyChainDesc: string;
  keyCompetitors: TableRow[];
  industryRegulatoryEconomic: string;
  restructuringOccurred: boolean | null;
  restructuringDetails: string;

  // 4
  intangibleTypes: string[]; // checkbox group
  ipOwnerEntity: string;
  intangibleAgreementsExist: boolean | null;
  intangibleAgreementsUpload: File | null;
  intangibleTransferDuringFY: boolean | null;
  intangibleTransfers: TableRow[];

  // 5
  fundingThirdPartyPct: string;
  fundingIntercompanyPct: string;
  fundingEquityPct: string;
  relatedPartyBorrowings: TableRow[];
  thirdPartyFinancing: TableRow[];

  // 6
  intercompanyServices: TableRow[];

  // 7
  localCompanyOverview: string;
  localBusinessModel: string;
  localBusinessStrategyChoice: string;
  localBusinessStrategyDesc: string;

  // 8
  departments: TableRow[];
  orgChartUpload: File | null;
  managementReportingLine: TableRow[];

  // 9
  formCUpload: File | null;
  taxComputationUpload: File | null;
  managementAccountsUpload: File | null;
  consolidatedGroupRevenue: string;
  localProfitBeforeTax: string;
  apaExists: boolean | null;

  // 10
  lossReasons: Array<{
    id: string;
    reasonCategory: string;
    description: string;
    costCategories: string[];
    supportingDocs: File | null;
  }>;

  // 11
  customers: TableRow[];
  suppliers: TableRow[];
  servicesProvided: TableRow[];

  // 12
  projects: TableRow[];

  // 13
  rptTypesSelected: string[];

  // 14
  rptDetailsByType: Record<string, TableRow[]>;

  // 15
  pricingPolicy: {
    formulaAdopted: string;
    policyOwner: string;
    revisionFrequency: string;
  };

  // 16
  functionsTable: TableRow[];
  risksTable: TableRow[];
  tangibleAssets: string[];
  tradeIntangiblesUsed: string[];
  marketingIntangiblesUsed: string[];

  // 17
  numberOfComparables: string;
  median: string;
  p375: string;
  p625: string;
};

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const initialState: FormState = {
  companyName: "",
  brandNames: [],
  financialYearEnd: "",
  jurisdiction: "Malaysia",
  isLossMaking: null,

  groupOwnership: [],

  majorBusinessLines: [],
  businessLinesOther: "",
  productsServicesDesc: "",
  keyBusinessDrivers: "",
  mainGeographicMarkets: [],
  supplyChainDesc: "",
  keyCompetitors: [],
  industryRegulatoryEconomic: "",
  restructuringOccurred: null,
  restructuringDetails: "",

  intangibleTypes: [],
  ipOwnerEntity: "",
  intangibleAgreementsExist: null,
  intangibleAgreementsUpload: null,
  intangibleTransferDuringFY: null,
  intangibleTransfers: [],

  fundingThirdPartyPct: "",
  fundingIntercompanyPct: "",
  fundingEquityPct: "",
  relatedPartyBorrowings: [],
  thirdPartyFinancing: [],

  intercompanyServices: [],

  localCompanyOverview: "",
  localBusinessModel: "",
  localBusinessStrategyChoice: "",
  localBusinessStrategyDesc: "",

  departments: [],
  orgChartUpload: null,
  managementReportingLine: [],

  formCUpload: null,
  taxComputationUpload: null,
  managementAccountsUpload: null,
  consolidatedGroupRevenue: "",
  localProfitBeforeTax: "",
  apaExists: null,

  lossReasons: [
    { id: uid(), reasonCategory: "", description: "", costCategories: [], supportingDocs: null },
    { id: uid(), reasonCategory: "", description: "", costCategories: [], supportingDocs: null },
    { id: uid(), reasonCategory: "", description: "", costCategories: [], supportingDocs: null },
  ],

  customers: [],
  suppliers: [],
  servicesProvided: [],

  projects: [],

  rptTypesSelected: [],
  rptDetailsByType: {},

  pricingPolicy: {
    formulaAdopted: "",
    policyOwner: "",
    revisionFrequency: "",
  },

  functionsTable: [],
  risksTable: [],
  tangibleAssets: [],
  tradeIntangiblesUsed: [],
  marketingIntangiblesUsed: [],

  numberOfComparables: "",
  median: "",
  p375: "",
  p625: "",
};

const FIELD_MAP = {
  companyName: "company_name",
  brandNames: "brand_names",
  financialYearEnd: "financial_year_end",
  jurisdiction: "jurisdiction",
  isLossMaking: "is_loss_making",
  groupOwnership: "group_ownership",
  majorBusinessLines: "major_business_lines",
  businessLinesOther: "business_lines_other",
  productsServicesDesc: "products_services_desc",
  keyBusinessDrivers: "key_business_drivers",
  mainGeographicMarkets: "main_geographic_markets",
  supplyChainDesc: "supply_chain_desc",
  keyCompetitors: "key_competitors",
  industryRegulatoryEconomic: "industry_regulatory_economic",
  restructuringOccurred: "restructuring_occurred",
  restructuringDetails: "restructuring_details",
  intangibleTypes: "intangible_types",
  ipOwnerEntity: "ip_owner_entity",
  intangibleAgreementsExist: "intangible_agreements_exist",
  intangibleAgreementsUpload: "intangible_agreements_upload",
  intangibleTransferDuringFY: "intangible_transfer_during_fy",
  intangibleTransfers: "intangible_transfers",
  fundingThirdPartyPct: "funding_third_party_pct",
  fundingIntercompanyPct: "funding_intercompany_pct",
  fundingEquityPct: "funding_equity_pct",
  relatedPartyBorrowings: "related_party_borrowings",
  thirdPartyFinancing: "third_party_financing",
  intercompanyServices: "intercompany_services",
  localCompanyOverview: "local_company_overview",
  localBusinessModel: "local_business_model",
  localBusinessStrategyChoice: "local_business_strategy_choice",
  localBusinessStrategyDesc: "local_business_strategy_desc",
  departments: "departments",
  orgChartUpload: "org_chart_upload",
  managementReportingLine: "management_reporting_line",
  formCUpload: "form_c_upload",
  taxComputationUpload: "tax_computation_upload",
  managementAccountsUpload: "management_accounts_upload",
  consolidatedGroupRevenue: "consolidated_group_revenue",
  localProfitBeforeTax: "local_profit_before_tax",
  apaExists: "apa_exists",
  lossReasons: "loss_reasons",
  customers: "customers",
  suppliers: "suppliers",
  servicesProvided: "services_provided",
  projects: "projects",
  rptTypesSelected: "rpt_types_selected",
  rptDetailsByType: "rpt_details_by_type",
  pricingPolicy: "pricing_policy",
  functionsTable: "functions_table",
  risksTable: "risks_table",
  tangibleAssets: "tangible_assets",
  tradeIntangiblesUsed: "trade_intangibles_used",
  marketingIntangiblesUsed: "marketing_intangibles_used",
  numberOfComparables: "number_of_comparables",
  median: "median",
  p375: "p375",
  p625: "p625",
} as const;

const NUMBER_FIELDS = new Set([
  "fundingThirdPartyPct",
  "fundingIntercompanyPct",
  "fundingEquityPct",
  "consolidatedGroupRevenue",
  "localProfitBeforeTax",
  "numberOfComparables",
  "median",
  "p375",
  "p625",
]);

const DYNAMIC_TABLE_KEYS = new Set([
  "groupOwnership",
  "intangibleTransfers",
  "relatedPartyBorrowings",
  "thirdPartyFinancing",
  "intercompanyServices",
  "departments",
  "customers",
  "suppliers",
  "projects",
  "servicesProvided",
  "keyCompetitors",
  "functionsTable",
  "risksTable",
  "managementReportingLine",
]);

function normalizeTableRows(key: string, value: any): TableRow[] {
  if (Array.isArray(value)) {
    return value.map((row) => {
      if (typeof row === "string") {
        if (key === "keyCompetitors") {
          return {
            id: uid(),
            competitor: row,
            coRegNo: "",
            financialYearEnded: "",
            principalActivity: "",
            country: "",
            acceptedRejected: "",
            reasons: "",
          };
        }
        return { id: uid(), value: row };
      }
      if (key === "keyCompetitors" && row && typeof row === "object") {
        const cleaned: Record<string, any> = {};
        Object.entries(row).forEach(([k, v]) => {
          if (/^\d+$/.test(k)) return;
          cleaned[k] = v;
        });
        return { id: cleaned.id ?? uid(), ...cleaned };
      }
      return { id: row?.id ?? uid(), ...(row ?? {}) };
    });
  }
  if (key === "managementReportingLine" && typeof value === "string" && value.trim()) {
    return [{ id: uid(), name: value.trim(), title: "", company: "", country: "" }];
  }
  return [];
}

function toSerializable(value: any): any {
  if (value instanceof File) return { name: value.name };
  if (Array.isArray(value)) return value.map((v) => toSerializable(v));
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toSerializable(v);
    return out;
  }
  return value;
}

function toApiPayload(
  formState: FormState,
  derivedValues: { testedParty: string; method: string; pli: string },
  fieldKeys: Array<keyof typeof FIELD_MAP>
) {
  const payload: Record<string, any> = { status: "draft" };
  fieldKeys.forEach((key) => {
    const apiKey = FIELD_MAP[key];
    payload[apiKey] = toSerializable((formState as any)[key]);
  });
  if (fieldKeys.includes("numberOfComparables" as keyof typeof FIELD_MAP)) {
    payload.derived_tested_party = derivedValues.testedParty;
    payload.derived_method = derivedValues.method;
    payload.derived_pli = derivedValues.pli;
  }
  return payload;
}

// -----------------------------
// Spec: 16 Stages EXACTLY
// -----------------------------

const STAGES: Stage[] = [
  {
    id: "1",
    title: "1. Engagement & Entity Setup",
    source: "SB",
    purpose: "Global anchors for boilerplate & scoping",
    fields: [
      { key: "companyName", label: "Company name", kind: "text", required: true },
      { key: "brandNames", label: "Brand name(s)", kind: "multi_text", placeholder: "Add brand and press Enter" },
      { key: "financialYearEnd", label: "Financial year end", kind: "date", required: true },
      { key: "jurisdiction", label: "Jurisdiction", kind: "dropdown", options: [...JURISDICTIONS] },
      { key: "isLossMaking", label: "Is this entity loss-making?", kind: "yesno" },
    ],
  },
  {
    id: "2",
    title: "2. Group Ownership Structure",
    source: "PRI",
    purpose: "Schedule 1 → Section 2.1",
    fields: [
      {
        key: "groupOwnership",
        label: "Group ownership structure",
        kind: "dynamic_table",
        columns: [
          { key: "entityName", label: "Entity name", kind: "text" },
          { key: "principalActivity", label: "Principal activity", kind: "text" },
          { key: "shareholderName", label: "Shareholder name", kind: "text" },
          { key: "shareholdingPct", label: "Shareholding %", kind: "number" },
          { key: "country", label: "Country", kind: "dropdown", options: [...COUNTRIES] },
        ],
      },
    ],
  },
  {
    id: "3",
    title: "3. Group Business Overview",
    source: "PRI",
    purpose: "Schedule 1 narrative, Appendix reference",
    fields: [
      {
        key: "majorBusinessLines",
        label: "Major business lines",
        kind: "multi_select",
        options: [...BUSINESS_LINES],
        help: "Select all that apply. Use 'Other' + text if needed.",
      },
      { key: "businessLinesOther", label: "If Other, specify", kind: "text", visibleIf: (s) => s.majorBusinessLines.includes("Other") },
      { key: "productsServicesDesc", label: "Products / services description", kind: "textarea" },
      { key: "keyBusinessDrivers", label: "Key business drivers", kind: "textarea" },
      {
        key: "mainGeographicMarkets",
        label: "Main geographic markets",
        kind: "multi_select",
        options: [...MARKETS],
      },
      { key: "supplyChainDesc", label: "Supply chain description", kind: "textarea" },
      {
        key: "keyCompetitors",
        label: "Key competitors",
        kind: "dynamic_table",
        columns: [
          { key: "competitor", label: "Competitor", kind: "text" },
          { key: "coRegNo", label: "Co. reg. no.", kind: "text" },
          { key: "financialYearEnded", label: "Financial year ended", kind: "date" },
          { key: "principalActivity", label: "Principal activity", kind: "text" },
          { key: "country", label: "Country", kind: "dropdown", options: [...COUNTRIES] },
          { key: "acceptedRejected", label: "Accepted / Rejected", kind: "dropdown", options: ["Accepted", "Rejected"] },
          { key: "reasons", label: "Reasons", kind: "text" },
        ],
      },
      { key: "industryRegulatoryEconomic", label: "Industry / regulatory / economic conditions", kind: "textarea" },
      { key: "restructuringOccurred", label: "Business restructuring occurred?", kind: "yesno" },
      {
        key: "restructuringDetails",
        label: "Restructuring details",
        kind: "textarea",
        visibleIf: (s) => s.restructuringOccurred === true,
      },
    ],
  },
  {
    id: "4",
    title: "4. Intangible Assets",
    source: "PRI",
    purpose: "Schedule 1 + FAR assets",
    fields: [
      {
        key: "intangibleTypes",
        label: "Types of intangibles used",
        kind: "checkbox_group",
        options: ["trade", "marketing", "tech"],
      },
      { key: "ipOwnerEntity", label: "IP owner entity", kind: "dropdown", options: [...COUNTRIES] /* placeholder list */ },
      { key: "intangibleAgreementsExist", label: "Intangible agreements exist?", kind: "yesno" },
      {
        key: "intangibleAgreementsUpload",
        label: "Upload intangible agreements",
        kind: "file",
        visibleIf: (s) => s.intangibleAgreementsExist === true,
      },
      { key: "intangibleTransferDuringFY", label: "Intangible transfer during FY?", kind: "yesno" },
      {
        key: "intangibleTransfers",
        label: "Intangible transfers",
        kind: "dynamic_table",
        visibleIf: (s) => s.intangibleTransferDuringFY === true,
        columns: [
          { key: "fromEntity", label: "From entity", kind: "text" },
          { key: "toEntity", label: "To entity", kind: "text" },
          { key: "description", label: "Description", kind: "text" },
          { key: "date", label: "Date", kind: "date" },
          { key: "consideration", label: "Consideration amount", kind: "number" },
        ],
      },
    ],
  },
  {
    id: "5",
    title: "5. Intercompany Financing",
    source: "PRI",
    purpose: "Schedule 1 finance + Sections 3.6–3.7",
    fields: [
      { key: "fundingThirdPartyPct", label: "Funding structure: % third-party", kind: "number" },
      { key: "fundingIntercompanyPct", label: "Funding structure: % intercompany loans", kind: "number" },
      { key: "fundingEquityPct", label: "Funding structure: % equity", kind: "number" },
      {
        key: "relatedPartyBorrowings",
        label: "Related party borrowing table",
        kind: "dynamic_table",
        columns: [
          { key: "lender", label: "Lender", kind: "text" },
          { key: "type", label: "Type", kind: "dropdown", options: [...BORROWING_TYPES] },
          { key: "currency", label: "Currency", kind: "dropdown", options: [...CURRENCIES] },
          { key: "amount", label: "Amount", kind: "number" },
          { key: "interestRate", label: "Interest rate", kind: "number" },
        ],
      },
      {
        key: "thirdPartyFinancing",
        label: "Third-party financing table",
        kind: "dynamic_table",
        columns: [
          { key: "lender", label: "Lender", kind: "text" },
          { key: "type", label: "Type", kind: "dropdown", options: [...BORROWING_TYPES] },
          { key: "currency", label: "Currency", kind: "dropdown", options: [...CURRENCIES] },
          { key: "amount", label: "Amount", kind: "number" },
          { key: "interestRate", label: "Interest rate", kind: "number" },
        ],
      },
    ],
  },
  {
    id: "6",
    title: "6. Intercompany Services",
    source: "PRI",
    purpose: "Schedule 1 services + Section 3",
    fields: [
      {
        key: "intercompanyServices",
        label: "Intercompany service agreements",
        kind: "dynamic_table",
        columns: [
          { key: "serviceCategory", label: "Service category", kind: "dropdown", options: [...SERVICE_CATEGORIES] },
          { key: "serviceProvider", label: "Service provider entity", kind: "text" },
          { key: "serviceRecipient", label: "Service recipient entity", kind: "text" },
          { key: "basisOfCharge", label: "Basis of charge", kind: "dropdown", options: [...BASIS_OF_CHARGE] },
          { key: "markupPct", label: "Mark-up %", kind: "number" },
          { key: "agreement", label: "Agreement uploaded", kind: "file" },
        ],
      },
    ],
  },
  {
    id: "7",
    title: "7. Local Company Profile",
    source: "SB",
    purpose: "Section 2.3–2.7",
    fields: [
      { key: "localCompanyOverview", label: "Company overview", kind: "textarea" },
      { key: "localBusinessModel", label: "Business model", kind: "textarea", help: "Guided textarea: describe value chain, customers, revenue drivers." },
      {
        key: "localBusinessStrategyChoice",
        label: "Business strategy",
        kind: "dropdown",
        options: ["Cost leadership", "Differentiation", "Focus/niche", "Growth/expansion", "Stability", "Other"],
      },
      { key: "localBusinessStrategyDesc", label: "Business strategy (details)", kind: "textarea" },
    ],
  },
  {
    id: "8",
    title: "8. Organisation & Headcount",
    source: "PRI",
    purpose: "Section 2.5 + substance analysis",
    fields: [
      {
        key: "departments",
        label: "Departments",
        kind: "dynamic_table",
        columns: [
          { key: "departmentName", label: "Department name", kind: "text" },
          { key: "localHeadcount", label: "Local headcount", kind: "number" },
          { key: "expatHeadcount", label: "Expat headcount", kind: "number" },
          { key: "hodName", label: "Head of department name", kind: "text" },
        ],
      },
      { key: "orgChartUpload", label: "Organisation chart upload", kind: "file" },
      {
        key: "managementReportingLine",
        label: "Local management reporting line",
        kind: "dynamic_table",
        columns: [
          { key: "name", label: "Name", kind: "text" },
          { key: "title", label: "Title", kind: "text" },
          { key: "company", label: "Company", kind: "text" },
          { key: "country", label: "Country", kind: "dropdown", options: [...COUNTRIES] },
        ],
      },
    ],
  },
  {
    id: "9",
    title: "9. Financial & Tax Data",
    source: "PRI",
    purpose: "Schedule 1 & benchmarking context",
    fields: [
      { key: "formCUpload", label: "Form C upload", kind: "file" },
      { key: "taxComputationUpload", label: "Tax computation upload", kind: "file" },
      { key: "managementAccountsUpload", label: "Management accounts upload", kind: "file" },
      { key: "consolidatedGroupRevenue", label: "Consolidated group revenue", kind: "number" },
      { key: "localProfitBeforeTax", label: "Local profit / loss before tax", kind: "number" },
      { key: "apaExists", label: "APA exists?", kind: "yesno" },
    ],
  },
  {
    id: "10",
    title: "10. Loss-Making Justification (Conditional)",
    source: "PRI",
    purpose: "Local File loss narrative",
    visibleIf: (s) => s.isLossMaking === true,
    fields: [
      {
        key: "lossReasons",
        label: "Top 3 loss reasons",
        kind: "repeatable_blocks",
        blockLabel: "Reason",
        min: 3,
        max: 3,
        blockFields: [
          { key: "reasonCategory", label: "Reason category", kind: "dropdown", options: [...LOSS_REASON_CATEGORY] },
          { key: "description", label: "Description", kind: "textarea" },
          { key: "costCategories", label: "Cost category impacted", kind: "multi_select", options: [...COST_CATEGORIES] },
          { key: "supportingDocs", label: "Supporting documents", kind: "file" },
        ],
      },
    ],
  },
  {
    id: "11",
    title: "11. Services Provided, Customers & Suppliers",
    source: "PRI",
    purpose: "Section 2.9 + comparability",
    fields: [
      {
        key: "servicesProvided",
        label: "Services provided",
        kind: "dynamic_table",
        columns: [
          { key: "projectType", label: "Project type", kind: "text" },
          { key: "contractingParty", label: "Contracting party", kind: "text" },
          { key: "contractDetails", label: "Contract details", kind: "text" },
          { key: "contractSum", label: "Contract sum", kind: "number" },
          { key: "projectMargin", label: "Project margin", kind: "number" },
          { key: "startYear", label: "Start year", kind: "date" },
          { key: "completionYear", label: "Completion year", kind: "date" },
          { key: "status", label: "Status", kind: "text" },
        ],
      },
      {
        key: "customers",
        label: "Main Customers",
        kind: "dynamic_table",
        columns: [
          { key: "customerName", label: "Customer name", kind: "text" },
          { key: "projectName", label: "Project name", kind: "text" },
          { key: "currency", label: "Currency", kind: "dropdown", options: [...CURRENCIES] },
          { key: "creditTerm", label: "Credit term", kind: "dropdown", options: [...CREDIT_TERMS] },
          { key: "revenueAmount", label: "Revenue amount", kind: "number" },
        ],
      },
      {
        key: "suppliers",
        label: "Main Suppliers",
        kind: "dynamic_table",
        columns: [
          { key: "thirdPartySuppliers", label: "Third Party Suppliers", kind: "text" },
          { key: "servicesDescription", label: "Services Decription", kind: "text" },
          { key: "currency", label: "Currency", kind: "dropdown", options: [...CURRENCIES] },
          { key: "creditTerm", label: "Credit Term", kind: "dropdown", options: [...CREDIT_TERMS] },
          { key: "amountRm", label: "Amount (RM)", kind: "number" },
        ],
      },
    ],
  },
  {
    id: "12",
    title: "12. Projects",
    source: "PRI",
    purpose: "Business substance support",
    fields: [
      {
        key: "projects",
        label: "Projects",
        kind: "dynamic_table",
        columns: [
          { key: "projectName", label: "Project name", kind: "text" },
          { key: "description", label: "Description", kind: "text" },
          { key: "startYear", label: "Start year", kind: "number" },
          { key: "completionYear", label: "Completion year", kind: "number" },
          { key: "status", label: "Status", kind: "dropdown", options: [...PROJECT_STATUS] },
        ],
      },
    ],
  },
  {
    id: "13",
    title: "13. Related Party Transactions – Scoping",
    source: "PRI",
    purpose: "Controls which transaction forms render",
    fields: [
      { key: "rptTypesSelected", label: "Transaction types", kind: "multi_select", options: [...RPT_TYPES] },
    ],
  },
  {
    id: "14",
    title: "14. Related Party Transactions – Detail",
    source: "PRI",
    purpose: "Populate Sections 3.1–3.11",
    fields: [
      {
        key: "rptDetailsByType",
        label: "RPT Details",
        kind: "readonly",
        help:
          "This stage renders one dynamic table per selected transaction type from Stage 13.",
      },
    ],
  },
  {
    id: "15",
    title: "15. Pricing Policy",
    source: "PRI",
    purpose: "Pricing policy narrative inputs",
    fields: [
      {
        key: "pricingPolicy",
        label: "Pricing policy",
        kind: "readonly",
      },
    ],
  },
  {
    id: "16",
    title: "16. Functional Analysis (FAR)",
    source: "SB",
    purpose: "Section 4 generation",
    fields: [
      {
        key: "functionsTable",
        label: "Functions table",
        kind: "dynamic_table",
        columns: [
          { key: "functionName", label: "Function name", kind: "text" },
          { key: "description", label: "Description", kind: "text" },
          { key: "intensity", label: "Intensity", kind: "dropdown", options: ["low", "medium", "high"] },
        ],
      },
      {
        key: "risksTable",
        label: "Risks table",
        kind: "dynamic_table",
        columns: [
          { key: "riskType", label: "Risk type", kind: "text" },
          { key: "description", label: "Description", kind: "text" },
          { key: "assumptionLevel", label: "Assumption level", kind: "dropdown", options: ["High", "Medium", "Low", "NIL"] },
        ],
      },
      { key: "tangibleAssets", label: "Tangible assets", kind: "multi_text", placeholder: "Add asset and press Enter" },
      { key: "tradeIntangiblesUsed", label: "Trade intangibles used", kind: "multi_text", placeholder: "Add item and press Enter" },
      { key: "marketingIntangiblesUsed", label: "Marketing intangibles used", kind: "multi_text", placeholder: "Add item and press Enter" },
    ],
  },
  {
    id: "17",
    title: "17. Benchmark Results",
    source: "SB",
    purpose: "Section 1.8 + Section 5 conclusion",
    fields: [
      { key: "numberOfComparables", label: "Number of comparables", kind: "number" },
      { key: "median", label: "Median", kind: "number" },
      { key: "p375", label: "37.5 percentile", kind: "number" },
      { key: "p625", label: "62.5 percentile", kind: "number" },
    ],
  },
];

const SECTION_CONFIG = [
  { id: "engagement", title: "Engagement", stageIds: ["1", "2"] },
  { id: "business", title: "Business", stageIds: ["3", "7", "8", "11", "12"] },
  { id: "far", title: "FAR", stageIds: ["4", "6", "16"] },
  { id: "method", title: "Method", stageIds: ["5", "13", "14", "15"] },
  { id: "financials", title: "Financials", stageIds: ["9", "10"] },
  { id: "review", title: "Review", stageIds: ["17"] },
] as const;

// -----------------------------
// Field renderers
// -----------------------------

function Chips({ items, onRemove }: { items: string[]; onRemove: (idx: number) => void }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it, idx) => (
        <span
          key={`${it}_${idx}`}
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs"
        >
          {it}
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="ml-1 rounded-full px-1 hover:bg-muted"
            aria-label="Remove"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

function MultiTextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>
      <Chips
        items={value}
        onRemove={(idx) => {
          const next = [...value];
          next.splice(idx, 1);
          onChange(next);
        }}
      />
    </div>
  );
}

function MultiSelectInput({
  label,
  value,
  onChange,
  options,
  help,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  options: readonly string[];
  help?: string;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      <div className="grid gap-2 md:grid-cols-2">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted/30"
          >
            <Checkbox
              checked={value.includes(opt)}
              onCheckedChange={() => toggle(opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Button type="button" variant={value === true ? "default" : "outline"} onClick={() => onChange(true)}>
          Yes
        </Button>
        <Button type="button" variant={value === false ? "default" : "outline"} onClick={() => onChange(false)}>
          No
        </Button>
      </div>
    </div>
  );
}

function FileUpload({
  label,
  value,
  onChange,
  accept,
}: {
  label: string;
  value: File | null;
  onChange: (f: File | null) => void;
  accept?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept={accept}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="outline" onClick={() => {}}>
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>
      {value ? <p className="text-xs text-muted-foreground">Selected: {value.name}</p> : null}
    </div>
  );
}

function DynamicTable({
  label,
  rows,
  onChange,
  columns,
}: {
  label: string;
  rows: TableRow[];
  onChange: (rows: TableRow[]) => void;
  columns: DynamicTableField["columns"];
}) {
  const add = () => {
    const row: TableRow = { id: uid() };
    for (const c of columns) row[c.key] = c.kind === "toggle" ? false : "";
    onChange([...rows, row]);
  };

  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));

  const update = (id: string, key: string, value: any) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r, idx) => (
            <Card key={r.id} className="border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Entry {idx + 1}</CardTitle>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {columns.map((c) => {
                    const showLabel = Boolean(c.label);
                    if (c.kind === "toggle" && !showLabel) {
                      return (
                        <div key={c.key} className="flex items-center gap-2 h-9 min-h-[72px]">
                          <Checkbox
                            checked={Boolean(r[c.key])}
                            onCheckedChange={(v) => update(r.id, c.key, Boolean(v))}
                          />
                          <span className="text-xs text-muted-foreground">
                            {c.toggleLabel ?? ""}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={c.key} className={showLabel ? "space-y-2" : ""}>
                        {showLabel ? (
                          <Label className="text-xs text-muted-foreground">{c.label}</Label>
                        ) : null}
                        {c.kind === "dropdown" ? (
                        <Select
                          value={r[c.key] ?? ""}
                          onValueChange={(v) => update(r.id, c.key, v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={c.label} />
                          </SelectTrigger>
                          <SelectContent>
                            {(c.options ?? []).map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : c.kind === "file" ? (
                        <Input
                          type="file"
                          className="h-9"
                          onChange={(e) => update(r.id, c.key, e.target.files?.[0] ?? null)}
                        />
                        ) : c.kind === "toggle" ? (
                          <div className="flex items-center gap-2 h-9">
                            <Checkbox
                              checked={Boolean(r[c.key])}
                              onCheckedChange={(v) => update(r.id, c.key, Boolean(v))}
                            />
                            {c.toggleLabel ? (
                              <span className="text-xs text-muted-foreground">{c.toggleLabel}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {Boolean(r[c.key]) ? "Related" : "Third party"}
                              </span>
                            )}
                          </div>
                        ) : (
                        <Input
                          className="h-9"
                          type={c.kind === "number" ? "number" : c.kind === "date" ? "date" : "text"}
                          value={r[c.key] ?? ""}
                          onChange={(e) => update(r.id, c.key, e.target.value)}
                          placeholder={c.label}
                        />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------
// Derived methodology (simple deterministic heuristic)
// -----------------------------

function deriveMethodology(state: FormState) {
  const testedParty = state.companyName || "(Company)";

  const hasSales = state.rptTypesSelected.includes("Related Party Sales");
  const hasPurchases = state.rptTypesSelected.includes("Related Party Purchase");
  const hasServices = state.rptTypesSelected.includes("Intercompany Services") || state.intercompanyServices.length > 0;

  // Risk profile proxy: count high risks
  const highRisks = state.risksTable.filter((r) => (r.assumptionLevel ?? "").toString().toLowerCase() === "high").length;
  const isRoutine = highRisks === 0;

  // Heuristic method pick
  let method = "TNMM";
  if (hasSales && !hasPurchases && isRoutine) method = "RPM";
  else if (hasPurchases && !hasSales && isRoutine) method = "CPM";
  else if (hasServices && isRoutine) method = "TNMM";
  else if (!isRoutine) method = "PSM";

  // PLI heuristic
  let pli = "Operating Margin (ROS)";
  if (method === "CPM") pli = "Cost Plus Mark-up";
  if (method === "RPM") pli = "Gross Margin";
  if (method === "PSM") pli = "Residual/Contribution Split";

  return { testedParty, method, pli };
}

function hasValue(val: any) {
  if (val === null || val === undefined) return false;
  if (val instanceof File) return true;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "string") return val.trim().length > 0;
  if (typeof val === "number") return Number.isFinite(val);
  if (typeof val === "boolean") return val === true;
  if (typeof val === "object") return Object.keys(val).length > 0;
  return false;
}

function fieldHasValue(field: Stage["fields"][number], state: FormState) {
  if ((field as RepeatableBlocksField).kind === "repeatable_blocks") {
    const rf = field as RepeatableBlocksField;
    const blocks = state.lossReasons ?? [];
    return blocks.some((block) =>
      rf.blockFields.some((bf) => hasValue((block as any)[(bf as BaseField).key]))
    );
  }

  if ((field as DynamicTableField).kind === "dynamic_table") {
    const tf = field as DynamicTableField;
    const rows = (state as any)[tf.key] as TableRow[];
    return (rows ?? []).length > 0;
  }

  if ((field as BaseField).kind === "readonly") return false;

  const bf = field as BaseField;
  const val = (state as any)[bf.key];
  if (bf.kind === "yesno") return typeof val === "boolean";
  return hasValue(val);
}

// -----------------------------
// Main Component
// -----------------------------

export default function CreateTPDoc() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("id");
  const [currentStageId, setCurrentStageId] = useState<string>("1");
  const [state, setState] = useState<FormState>(initialState);
  const [sectionMapOpen, setSectionMapOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mapQuery, setMapQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [documentCache, setDocumentCache] = useState<any>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";

  const buildStateFromDocument = useCallback((doc: Record<string, any>) => {
    const next: Partial<FormState> = {};
    (Object.keys(FIELD_MAP) as Array<keyof typeof FIELD_MAP>).forEach((key) => {
      const apiKey = FIELD_MAP[key];
      if (doc[apiKey] !== undefined && doc[apiKey] !== null) {
        const value = doc[apiKey];
        if (DYNAMIC_TABLE_KEYS.has(key as string)) {
          (next as any)[key] = normalizeTableRows(key as string, value);
        } else {
          (next as any)[key] =
            NUMBER_FIELDS.has(key as string) && typeof value === "number" ? String(value) : value;
        }
      }
    });
    return { ...initialState, ...next };
  }, []);

  const applyDocumentToState = useCallback((doc: Record<string, any>) => {
    const nextState = buildStateFromDocument(doc);
    setState((prev) => ({ ...prev, ...nextState }));
  }, [buildStateFromDocument]);

  const getStageFieldKeys = useCallback((st: Stage) => {
    if (st.id === "14") return ["rptDetailsByType"] as Array<keyof typeof FIELD_MAP>;
    if (st.id === "15") return ["pricingPolicy"] as Array<keyof typeof FIELD_MAP>;
    const keys: Array<keyof typeof FIELD_MAP> = [];
    st.fields.forEach((f) => {
      if ((f as BaseField).kind === "readonly") return;
      keys.push((f as any).key as keyof typeof FIELD_MAP);
    });
    return keys;
  }, []);

  const visibleStages = useMemo(() => {
    return STAGES.filter((st) => (st.visibleIf ? st.visibleIf(state) : true));
  }, [state]);

  const stageIndex = useMemo(
    () => visibleStages.findIndex((st) => st.id === currentStageId),
    [currentStageId, visibleStages]
  );

  const stage = visibleStages[Math.max(0, stageIndex)] ?? STAGES[0];

  const derived = useMemo(() => deriveMethodology(state), [state]);

  const setField = (key: keyof FormState, value: any) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const saveDraft = useCallback(async (st: Stage) => {
    if (!draftId) return;
    const fieldKeys = getStageFieldKeys(st);
    const payload = toApiPayload(state, derived, fieldKeys);

    console.log(payload);
    try {
      const res = await fetch(`${apiBase}/drafts/${draftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save draft");
      const doc = await res.json();
      setDocumentCache(doc);
      sessionStorage.setItem(`tpgps-doc-${draftId}`, JSON.stringify(doc));
      applyDocumentToState(doc);
      toast({
        title: "Draft saved",
        description: "Your changes have been saved successfully.",
      });
    } catch (err) {
      console.error("Failed to save draft", err);
    }
  }, [apiBase, draftId, derived, state, applyDocumentToState, getStageFieldKeys]);

  useEffect(() => {
    if (stageIndex === -1 && visibleStages.length > 0) {
      setCurrentStageId(visibleStages[0].id);
    }
  }, [stageIndex, visibleStages]);

  useEffect(() => {
    if (!draftId || draftLoaded) return;
    const cached = draftId ? sessionStorage.getItem(`tpgps-doc-${draftId}`) : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setDocumentCache(parsed);
        applyDocumentToState(parsed);
        setDraftLoaded(true);
        return;
      } catch {
        sessionStorage.removeItem(`tpgps-doc-${draftId}`);
      }
    }
    if (documentCache) {
      applyDocumentToState(documentCache);
      setDraftLoaded(true);
      return;
    }
    fetch(`${apiBase}/drafts/${draftId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((doc) => {
        setDocumentCache(doc);
        sessionStorage.setItem(`tpgps-doc-${draftId}`, JSON.stringify(doc));
        applyDocumentToState(doc);
      })
      .catch((err) => {
        console.error("Failed to load draft", err);
      })
      .finally(() => {
        setDraftLoaded(true);
      });
  }, [apiBase, draftId, draftLoaded, documentCache, applyDocumentToState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSectionMapOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!draftId || !draftLoaded || !documentCache) return;
    applyDocumentToState(documentCache);
  }, [documentCache, draftId, draftLoaded, applyDocumentToState]);

  const completionState = useMemo(() => {
    if (documentCache) return buildStateFromDocument(documentCache);
    return state;
  }, [buildStateFromDocument, documentCache, state]);

  const stageCompletion = useMemo(() => {
    const result: Record<
      string,
      { requiredComplete: boolean; hasAnyValue: boolean; isComplete: boolean }
    > = {};

    for (const st of visibleStages) {
      if (st.id === "14") {
        const selected = completionState.rptTypesSelected;
        const hasAnyValue = selected.some((type) => (completionState.rptDetailsByType[type] ?? []).length > 0);
        const requiredComplete =
          selected.length === 0
            ? true
            : selected.every((type) => (completionState.rptDetailsByType[type] ?? []).length > 0);
        const isComplete = selected.length === 0 ? false : requiredComplete;
        result[st.id] = { requiredComplete, hasAnyValue, isComplete };
        continue;
      }
      if (st.id === "15") {
        const locked = !completionState.rptTypesSelected.includes("Related Party Purchase");
        if (locked) {
          result[st.id] = { requiredComplete: true, hasAnyValue: false, isComplete: true };
          continue;
        }
        const policy = completionState.pricingPolicy;
        const hasAnyValue = Boolean(
          policy.formulaAdopted?.trim() ||
          policy.policyOwner?.trim() ||
          policy.revisionFrequency?.trim()
        );
        const requiredComplete = Boolean(
          policy.formulaAdopted?.trim() &&
          policy.policyOwner?.trim() &&
          policy.revisionFrequency?.trim()
        );
        result[st.id] = { requiredComplete, hasAnyValue, isComplete: requiredComplete };
        continue;
      }

      const visibleFields = st.fields.filter((f) =>
        "visibleIf" in f && typeof f.visibleIf === "function" ? f.visibleIf(completionState) : true
      );
      const requiredFields = visibleFields.filter((f) => (f as BaseField).required);
      const requiredComplete = requiredFields.every((f) => fieldHasValue(f, completionState));
      const hasAnyValue = visibleFields.some((f) => fieldHasValue(f, completionState));
      const isComplete = requiredFields.length > 0 ? requiredComplete : hasAnyValue;

      result[st.id] = { requiredComplete, hasAnyValue, isComplete };
    }

    return result;
  }, [completionState, visibleStages]);

  const isPricingPolicyLocked = useMemo(
    () => !completionState.rptTypesSelected.includes("Related Party Purchase"),
    [completionState.rptTypesSelected]
  );

  const furthestUnlockedIndex = useMemo(() => {
    let idx = visibleStages.length - 1;
    for (let i = 0; i < visibleStages.length; i += 1) {
      const st = visibleStages[i];
      if (!stageCompletion[st.id]?.requiredComplete) {
        idx = i;
        break;
      }
    }
    return idx;
  }, [stageCompletion, visibleStages]);

  const stageStatuses = useMemo(() => {
    const result: Record<string, StageStatus> = {};
    visibleStages.forEach((st, index) => {
      const completion = stageCompletion[st.id];
      if (st.id === "15" && isPricingPolicyLocked) {
        result[st.id] = "locked";
        return;
      }
      const isLocked = index > furthestUnlockedIndex;
      if (isLocked) result[st.id] = "locked";
      else if (completion?.isComplete) result[st.id] = "done";
      else if (completion?.hasAnyValue) result[st.id] = "in_progress";
      else result[st.id] = "todo";
    });
    return result;
  }, [furthestUnlockedIndex, isPricingPolicyLocked, stageCompletion, visibleStages]);

  const sections = useMemo(() => {
    return SECTION_CONFIG.map((section) => {
      const stagesInSection = section.stageIds
        .map((id) => visibleStages.find((st) => st.id === id))
        .filter(Boolean) as Stage[];
      const doneCount = stagesInSection.filter((st) => stageStatuses[st.id] === "done").length;
      const totalCount = stagesInSection.length || 1;
      const completionPct = Math.round((doneCount / totalCount) * 100);
      return {
        id: section.id,
        title: section.title,
        completionPct,
        stages: stagesInSection.map((st) => ({
          id: st.id,
          title: st.title,
          status: stageStatuses[st.id],
        })),
      };
    });
  }, [stageStatuses, visibleStages]);

  const overallCompletion = useMemo(() => {
    if (!visibleStages.length) return 0;
    const done = visibleStages.filter((st) => stageStatuses[st.id] === "done").length;
    return Math.round((done / visibleStages.length) * 100);
  }, [stageStatuses, visibleStages]);

  const filteredSections = useMemo(() => {
    if (sectionFilter === "all") {
      return [
        {
          id: "all",
          title: "",
          completionPct: overallCompletion,
          stages: visibleStages.map((st) => ({
            id: st.id,
            title: st.title,
            status: stageStatuses[st.id],
          })),
        },
      ];
    }
    return sections.filter((section) => section.id === sectionFilter);
  }, [sectionFilter, sections, stageStatuses, visibleStages, overallCompletion]);

  const selectStage = (id: string) => {
    const targetIndex = visibleStages.findIndex((st) => st.id === id);
    if (targetIndex === -1) return;
    if (targetIndex <= furthestUnlockedIndex) {
      setCurrentStageId(id);
    }
  };

  const blockingStages = useMemo(() => {
    if (stageIndex <= 0) return [];
    return visibleStages
      .slice(0, stageIndex)
      .filter((st) => !stageCompletion[st.id]?.requiredComplete)
      .map((st) => st.title);
  }, [stageCompletion, stageIndex, visibleStages]);

  const canGoNext = stageCompletion[stage.id]?.requiredComplete === true;

  const [reviewSummaries, setReviewSummaries] = useState<
    Array<{
      sectionId: string;
      sectionTitle: string;
      stages: Array<{ id: string; title: string; items: Array<{ label: string; value: string }> }>;
    }>
  >([]);

  useEffect(() => {
    if (!reviewOpen || !draftId) return;
    fetch(`${apiBase}/drafts/${draftId}/review`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setReviewSummaries(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load review summaries", err);
      });
  }, [apiBase, draftId, reviewOpen]);

  const back = () => {
    if (stageIndex <= 0) navigate("/tp-docs");
    else setCurrentStageId(visibleStages[stageIndex - 1]?.id ?? "1");
  };

  const next = async () => {
    if (!stageCompletion[stage.id]?.requiredComplete) return;
    await saveDraft(stage);
    if (stageIndex >= visibleStages.length - 1) {
      // eslint-disable-next-line no-alert
      alert("All stages completed (stub). Trigger draft generation here.");
      return;
    }
    setCurrentStageId(visibleStages[stageIndex + 1]?.id ?? stage.id);
  };

  const renderField = (f: Stage["fields"][number]) => {
    // Field-level visibility
    if ("visibleIf" in f && typeof f.visibleIf === "function" && !f.visibleIf(state)) return null;

    // Special Stage 14 renderer: tables per selected RPT type
    if (stage.id === "14" && f.key === "rptDetailsByType") {
      const selected = state.rptTypesSelected;
      if (!selected.length) {
        return <p className="text-sm text-muted-foreground">No transaction types selected in Stage 13.</p>;
      }

      return (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            For each selected transaction type, add line items with the required fields.
          </p>
          {selected.map((type) => {
            const rows = state.rptDetailsByType[type] ?? [];
            let columns: DynamicTableField["columns"] = [
              { key: "relatedPartyEntity", label: "Related party entity", kind: "text" },
              { key: "natureOfTransaction", label: "Nature of transaction", kind: "text" },
              { key: "amount", label: "Amount", kind: "number" },
              { key: "country", label: "Country", kind: "text" },
            ];
            if (type === "Receipt of Advances" || type === "Provision of Advances") {
              columns = [
                { key: "relatedPartyEntity", label: "Related party", kind: "text" },
                { key: "amount", label: "Amount", kind: "number" },
              ];
            }
            if (type === "Rental Paid") {
              columns = [
                { key: "relatedPartyEntity", label: "Related party", kind: "text" },
                { key: "assetType", label: "Type of asset", kind: "text" },
                { key: "location", label: "Location", kind: "text" },
                { key: "rentalRatePerMonth", label: "Rental rate per month", kind: "number" },
                { key: "purpose", label: "Purpose", kind: "text" },
                { key: "amount", label: "Amount", kind: "number" },
              ];
            }
            if (type === "Commission paid") {
              columns = [
                { key: "relatedPartyEntity", label: "Related party", kind: "text" },
                { key: "amount", label: "Amount", kind: "number" },
              ];
            }
            if (type === "Expense paid on behalf of/by") {
              columns.push({
                key: "onBehalfOf",
                label: "",
                kind: "toggle",
                toggleLabel: "On behalf of related party",
              });
            }
            return (
              <div key={type} className="space-y-3">
                <Separator />
                <h3 className="text-base font-semibold">{type}</h3>
                <DynamicTable
                  label="Line items"
                  rows={rows}
                  onChange={(nextRows) =>
                    setState((s) => ({
                      ...s,
                      rptDetailsByType: { ...s.rptDetailsByType, [type]: nextRows },
                    }))
                  }
                  columns={columns}
                />
              </div>
            );
          })}
        </div>
      );
    }

    if (stage.id === "15" && f.key === "pricingPolicy") {
      const locked = !state.rptTypesSelected.includes("Related Party Purchase");
      return (
        <div className="space-y-4">
          {locked ? (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Pricing policy is locked until “Related Party Purchase” is selected in Stage 13.
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Formula adopted and its application</Label>
            <Textarea
              value={state.pricingPolicy.formulaAdopted}
              disabled={locked}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  pricingPolicy: { ...s.pricingPolicy, formulaAdopted: e.target.value },
                }))
              }
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Who determines the pricing policy</Label>
            <Input
              value={state.pricingPolicy.policyOwner}
              disabled={locked}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  pricingPolicy: { ...s.pricingPolicy, policyOwner: e.target.value },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>How often the pricing policy being revised</Label>
            <Input
              value={state.pricingPolicy.revisionFrequency}
              disabled={locked}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  pricingPolicy: { ...s.pricingPolicy, revisionFrequency: e.target.value },
                }))
              }
            />
          </div>
        </div>
      );
    }

    // Repeatable blocks
    if ((f as RepeatableBlocksField).kind === "repeatable_blocks") {
      const rf = f as RepeatableBlocksField;
      const blocks = state.lossReasons;

      return (
        <div className="space-y-4">
          <div>
            <Label className="text-base">{rf.label}</Label>
            <p className="text-xs text-muted-foreground">Exactly 3 blocks.</p>
          </div>
          {blocks.map((b, idx) => (
            <Card key={b.id} className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{rf.blockLabel} {idx + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Reason category</Label>
                  <Select
                    value={b.reasonCategory}
                    onValueChange={(v) =>
                      setState((s) => ({
                        ...s,
                        lossReasons: s.lossReasons.map((x) => (x.id === b.id ? { ...x, reasonCategory: v } : x)),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOSS_REASON_CATEGORY.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={b.description}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        lossReasons: s.lossReasons.map((x) => (x.id === b.id ? { ...x, description: e.target.value } : x)),
                      }))
                    }
                    rows={4}
                  />
                </div>

                <MultiSelectInput
                  label="Cost category impacted"
                  value={b.costCategories}
                  options={COST_CATEGORIES}
                  onChange={(nextCats) =>
                    setState((s) => ({
                      ...s,
                      lossReasons: s.lossReasons.map((x) => (x.id === b.id ? { ...x, costCategories: nextCats } : x)),
                    }))
                  }
                />

                <FileUpload
                  label="Supporting documents"
                  value={b.supportingDocs}
                  onChange={(file) =>
                    setState((s) => ({
                      ...s,
                      lossReasons: s.lossReasons.map((x) => (x.id === b.id ? { ...x, supportingDocs: file } : x)),
                    }))
                  }
                  accept=".pdf,image/*"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // Dynamic tables
    if ((f as DynamicTableField).kind === "dynamic_table") {
      const tf = f as DynamicTableField;
      const rows = (state as any)[tf.key] as TableRow[];
      return (
        <DynamicTable
          label={tf.label}
          rows={rows}
          onChange={(nextRows) => setField(tf.key as keyof FormState, nextRows)}
          columns={tf.columns}
        />
      );
    }

    // Standard fields
    const bf = f as BaseField;
    const val = (state as any)[bf.key];
    const label = bf.required ? `${bf.label} *` : bf.label;

    switch (bf.kind) {
      case "text":
        return (
          <div className="space-y-2">
            <Label>{label}</Label>
            <Input
              value={val ?? ""}
              placeholder={bf.placeholder}
              onChange={(e) => setField(bf.key as keyof FormState, e.target.value)}
            />
          </div>
        );
      case "number":
        return (
          <div className="space-y-2">
            <Label>{label}</Label>
            <Input
              type="number"
              value={val ?? ""}
              placeholder={bf.placeholder}
              onChange={(e) => setField(bf.key as keyof FormState, e.target.value)}
            />
          </div>
        );
      case "date":
        return (
          <div className="space-y-2">
            <Label>{label}</Label>
            <Input
              type="date"
              value={val ?? ""}
              onChange={(e) => setField(bf.key as keyof FormState, e.target.value)}
            />
          </div>
        );
      case "textarea":
        return (
          <div className="space-y-2">
            <Label>{label}</Label>
            {bf.help ? <p className="text-xs text-muted-foreground">{bf.help}</p> : null}
            <Textarea
              value={val ?? ""}
              placeholder={bf.placeholder}
              rows={5}
              onChange={(e) => setField(bf.key as keyof FormState, e.target.value)}
            />
          </div>
        );
      case "dropdown":
        return (
          <div className="space-y-2">
            <Label>{label}</Label>
            <Select
              value={val ?? ""}
              onValueChange={(v) => setField(bf.key as keyof FormState, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={bf.placeholder ?? "Select"} />
              </SelectTrigger>
              <SelectContent>
                {(bf.options ?? []).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "yesno":
        return (
          <YesNo
            label={label}
            value={val ?? null}
            onChange={(v) => setField(bf.key as keyof FormState, v)}
          />
        );
      case "checkbox_group":
        return (
          <MultiSelectInput
            label={label}
            value={Array.isArray(val) ? val : []}
            options={bf.options ?? []}
            onChange={(nextVals) => setField(bf.key as keyof FormState, nextVals)}
          />
        );
      case "multi_text":
        return (
          <MultiTextInput
            label={label}
            value={Array.isArray(val) ? val : []}
            placeholder={bf.placeholder}
            onChange={(nextVals) => setField(bf.key as keyof FormState, nextVals)}
          />
        );
      case "multi_select":
        return (
          <MultiSelectInput
            label={label}
            value={Array.isArray(val) ? val : []}
            options={bf.options ?? []}
            help={bf.help}
            onChange={(nextVals) => setField(bf.key as keyof FormState, nextVals)}
          />
        );
      case "file":
        return (
          <FileUpload
            label={label}
            value={val ?? null}
            onChange={(file) => setField(bf.key as keyof FormState, file)}
            accept=".pdf,image/*"
          />
        );
      case "toggle":
        // used only in tables
        return null;
      case "readonly":
        return (
          <p className="text-sm text-muted-foreground">{bf.help ?? "Read-only"}</p>
        );
      default:
        return null;
    }
  };

  return (
    <div className="page-container max-w-7xl mx-auto h-screen overflow-hidden flex flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Create Transfer Pricing Document"
          description="Config-driven TP data capture with sectioned navigation"
          actions={
            <>
              <Badge variant="secondary">{overallCompletion}% complete</Badge>
              <Button variant="outline" onClick={() => setSectionMapOpen(true)}>
                <Command className="h-4 w-4 mr-2" />
                Section Map
              </Button>
              <Button variant="outline" onClick={() => setReviewOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Review
              </Button>
            </>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_320px] flex-1 min-h-0">
        <aside className="overflow-y-auto pr-2">
          <div className="rounded-2xl border bg-muted/20 p-4 shadow-sm">
            <div className="mb-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Filter by section</Label>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sections (1–17)</SelectItem>
                  {SECTION_CONFIG.map((section) => {
                    const completion = sections.find((s) => s.id === section.id)?.completionPct ?? 0;
                    return (
                      <SelectItem key={section.id} value={section.id}>
                        {section.title} · {completion}%
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <WizardStepper
              sections={filteredSections}
              currentStageId={stage.id}
              onSelectStage={selectStage}
            />
          </div>
        </aside>

        <div className="space-y-6 min-w-0 overflow-y-auto pr-2">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{stage.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{stage.purpose}</p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <Badge variant="outline" className="capitalize">
                    {stageStatuses[stage.id]?.replace("_", " ")}
                  </Badge>
                  <div>
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-sm font-medium">{stage.source}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Prerequisites: </span>
                {blockingStages.length === 0
                  ? "None. You can proceed freely."
                  : `Complete required fields in: ${blockingStages.join(", ")}`}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {stage.fields.map((f) => {
                const fieldEl = renderField(f);
                return fieldEl ? <div key={(f as any).key}>{fieldEl}</div> : null;
              })}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={back}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {stageIndex <= 0 ? "Cancel" : "Back"}
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => saveDraft(stage)}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button onClick={next} disabled={!canGoNext}>
                {stageIndex >= visibleStages.length - 1 ? "Finish" : "Update & Next"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
          {!canGoNext ? (
            <p className="text-xs text-muted-foreground">
              Complete required fields in this stage to continue forward.
            </p>
          ) : null}
        </div>

        <aside className="overflow-y-auto pr-2">
          <div className="space-y-6 h-full">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Overall completion</span>
                  <span className="font-medium">{overallCompletion}%</span>
                </div>
                <Progress value={overallCompletion} />
              </div>
              <div className="space-y-3">
                {sections.map((section) => (
                  <div key={section.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{section.title}</span>
                      <span>{section.completionPct}%</span>
                    </div>
                    <Progress value={section.completionPct} className="h-2" />
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setReviewOpen(true)}>
                <Search className="h-4 w-4 mr-2" />
                Open Review Drawer
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Derived Outputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Tested party</p>
                <p className="font-medium">{derived.testedParty}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Selected method</p>
                <p className="font-medium">{derived.method}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">PLI</p>
                <p className="font-medium">{derived.pli}</p>
              </div>
            </CardContent>
          </Card>
          </div>
        </aside>
      </div>

      <Drawer open={reviewOpen} onOpenChange={setReviewOpen}>
        <DrawerContent className="!left-auto !right-0 !top-0 !bottom-0 !h-dvh !w-full max-w-md rounded-none border-l overflow-hidden flex flex-col">
          <DrawerHeader>
            <DrawerTitle>Review completed sections</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 min-h-0 px-6 pb-40 space-y-6 overflow-y-auto">
            {reviewSummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Complete a section to see its summary here.
              </p>
            ) : (
              reviewSummaries.map((section) => (
                <div key={section.sectionId} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{section.sectionTitle}</h3>
                    <Badge variant="secondary">Complete</Badge>
                  </div>
                  {section.stages.map((st) => (
                    <Card key={st.id} className="border-dashed">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{st.title}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              selectStage(st.id);
                              setReviewOpen(false);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {st.items.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No captured values.</p>
                        ) : (
                          st.items.map((item) => (
                            <div key={item.label} className="text-xs">
                              <span className="text-muted-foreground">{item.label}: </span>
                              <span className="font-medium">{item.value}</span>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={sectionMapOpen} onOpenChange={setSectionMapOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Section Map</DialogTitle>
            <DialogDescription>
              Search by stage title, purpose, or source. Jump instantly to unlocked stages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={mapQuery}
                onChange={(e) => setMapQuery(e.target.value)}
                placeholder="Search stages..."
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Command className="h-3 w-3" />K
              </div>
            </div>
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {visibleStages
                .filter((st) => {
                  const query = mapQuery.trim().toLowerCase();
                  if (!query) return true;
                  return (
                    st.title.toLowerCase().includes(query) ||
                    st.purpose.toLowerCase().includes(query) ||
                    st.source.toLowerCase().includes(query)
                  );
                })
                .map((st) => {
                  const status = stageStatuses[st.id];
                  const locked = status === "locked";
                  const statusIcon =
                    status === "locked" ? (
                      <Lock className="h-3 w-3" />
                    ) : status === "done" ? (
                      <Check className="h-3 w-3" />
                    ) : status === "in_progress" ? (
                      <CircleDot className="h-3 w-3" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    );
                  return (
                    <button
                      key={st.id}
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        selectStage(st.id);
                        setSectionMapOpen(false);
                      }}
                      className="w-full rounded-md border px-4 py-3 text-left hover:bg-muted/30 disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{st.title}</p>
                          <p className="text-xs text-muted-foreground">{st.purpose}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {statusIcon}
                          <span className="capitalize">{status?.replace("_", " ")}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
