import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, GripVertical, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOCUMENT_SOURCE_PATH_GROUPS } from "@/lib/documentSourcePaths";
import { toast } from "@/components/ui/use-toast";

type SectionRuleItem = {
  id: string;
  section_id: string;
  section: string;
  title: string;
  description: string | null;
};

type TemplateItem = {
  id: string;
  name: string;
  section_id: string | null;
  title: string | null;
};

type TemplateGroupItem = {
  id: string;
  name: string;
  description: string | null;
  templates: Array<{ id: string; name: string; sort_order: number }>;
};

type TableColumn = {
  id: string;
  header: string;
  source_path: string;
  value_template?: string;
};

type MergeCellRule = {
  id: string;
  row_start: string;
  row_end: string;
  col_start: string;
  col_end: string;
};

type ArrayFieldOption = {
  key: string;
  token: string;
  label: string;
  source_path: string;
};

const ARRAY_SOURCE_FIELD_MAP: Record<string, ArrayFieldOption[]> = {
  group_ownership: [
    { key: "entityName", token: "[ENTITY_NAME]", label: "Entity name", source_path: "$row.entityName" },
    {
      key: "principalActivity",
      token: "[PRINCIPAL_ACTIVITY]",
      label: "Principal activity",
      source_path: "$row.principalActivity",
    },
    { key: "shareholderName", token: "[SHAREHOLDER_NAME]", label: "Shareholder", source_path: "$row.shareholderName" },
    { key: "shareholdingPct", token: "[SHAREHOLDING_PCT]", label: "Shareholding %", source_path: "$row.shareholdingPct" },
    { key: "country", token: "[COUNTRY]", label: "Country", source_path: "$row.country" },
  ],
  departments: [
    { key: "departmentName", token: "[DEPARTMENT_NAME]", label: "Department name", source_path: "$row.departmentName" },
    { key: "localHeadcount", token: "[LOCAL_HEADCOUNT]", label: "Local headcount", source_path: "$row.localHeadcount" },
    { key: "expatHeadcount", token: "[EXPAT_HEADCOUNT]", label: "Expatriate headcount", source_path: "$row.expatHeadcount" },
    { key: "hodName", token: "[HOD_NAME]", label: "Head of department", source_path: "$row.hodName" },
  ],
  management_reporting_line: [
    { key: "name", token: "[NAME]", label: "Name", source_path: "$row.name" },
    { key: "title", token: "[TITLE]", label: "Title", source_path: "$row.title" },
    { key: "company", token: "[COMPANY]", label: "Company", source_path: "$row.company" },
    { key: "country", token: "[COUNTRY]", label: "Country", source_path: "$row.country" },
  ],
  customers: [
    { key: "customerName", token: "[CUSTOMER_NAME]", label: "Customer name", source_path: "$row.customerName" },
    { key: "projectName", token: "[PROJECT_NAME]", label: "Project name", source_path: "$row.projectName" },
    { key: "currency", token: "[CURRENCY]", label: "Currency", source_path: "$row.currency" },
    { key: "creditTerm", token: "[CREDIT_TERM]", label: "Credit term", source_path: "$row.creditTerm" },
    { key: "revenueAmount", token: "[REVENUE_AMOUNT]", label: "Revenue amount", source_path: "$row.revenueAmount" },
  ],
  suppliers: [
    { key: "supplierName", token: "[SUPPLIER_NAME]", label: "Supplier name", source_path: "$row.supplierName" },
    { key: "productService", token: "[PRODUCT_SERVICE]", label: "Product/service", source_path: "$row.productService" },
    { key: "country", token: "[COUNTRY]", label: "Country", source_path: "$row.country" },
    { key: "amount", token: "[AMOUNT]", label: "Amount", source_path: "$row.amount" },
  ],
  services_provided: [
    { key: "projectType", token: "[PROJECT_TYPE]", label: "Project type", source_path: "$row.projectType" },
    {
      key: "contractingParty",
      token: "[CONTRACTING_PARTY]",
      label: "Contracting party",
      source_path: "$row.contractingParty",
    },
    { key: "contractDetails", token: "[CONTRACT_DETAILS]", label: "Contract details", source_path: "$row.contractDetails" },
    { key: "contractSum", token: "[CONTRACT_SUM]", label: "Contract sum", source_path: "$row.contractSum" },
    { key: "projectMargin", token: "[PROJECT_MARGIN]", label: "Project margin", source_path: "$row.projectMargin" },
    { key: "startYear", token: "[START_YEAR]", label: "Start year", source_path: "$row.startYear" },
    { key: "completionYear", token: "[COMPLETION_YEAR]", label: "Completion year", source_path: "$row.completionYear" },
    { key: "status", token: "[STATUS]", label: "Status", source_path: "$row.status" },
  ],
  functions_table: [
    { key: "functionName", token: "[FUNCTION_NAME]", label: "Function name", source_path: "$row.functionName" },
    { key: "description", token: "[DESCRIPTION]", label: "Description", source_path: "$row.description" },
  ],
  risks_table: [
    { key: "riskType", token: "[RISK_TYPE]", label: "Risk type", source_path: "$row.riskType" },
    { key: "description", token: "[DESCRIPTION]", label: "Description", source_path: "$row.description" },
    { key: "assumptionLevel", token: "[ASSUMPTION_LEVEL]", label: "Assumption level", source_path: "$row.assumptionLevel" },
  ],
};

type AssemblyStep = {
  id: string;
  name: string;
  action: "template_section" | "table_section" | "template_group_section";
  template_id: string | null;
  is_enabled: boolean;
  params_json: {
    template_group_id?: string;
    array_source?: string;
    columns?: Array<{ header: string; source_path: string; value_template?: string }>;
    totals?: Array<{ label: string; column_index: number; sum_column_index: number }>;
    merge_cells?: Array<{ row_start: number; row_end: number; col_start: number; col_end: number }>;
  };
};

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const SECTION_TABLE_PRESETS: Record<string, { array_source: string; columns: Array<{ header: string; source_path: string }> }> = {
  "2.4": {
    array_source: "management_reporting_line",
    columns: [
      { header: "Name", source_path: "$row.name" },
      { header: "Title", source_path: "$row.title" },
      { header: "Company", source_path: "$row.company" },
      { header: "Country", source_path: "$row.country" },
    ],
  },
};

export default function AssemblySectionEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";

  const [rule, setRule] = useState<SectionRuleItem | null>(null);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [templateGroups, setTemplateGroups] = useState<TemplateGroupItem[]>([]);
  const [steps, setSteps] = useState<AssemblyStep[]>([]);
  const [newColumnSourceByStep, setNewColumnSourceByStep] = useState<Record<string, string>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${apiBase}/templates/section-rules/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setRule(data ?? null))
      .catch((err) => console.error("Failed to load section rule", err));

    fetch(`${apiBase}/templates`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load templates", err));

    fetch(`${apiBase}/templates/industry-analysis/groups`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setTemplateGroups(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load template groups", err));

    fetch(`${apiBase}/draft-documents/assembly/sections/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        const loaded = Array.isArray(data?.steps) ? data.steps : [];
        const mappedSteps = loaded.map((step: any) => ({
            id: String(step.id ?? uid()),
            name: String(step.name ?? ""),
            action:
              step.action === "table_section"
                ? "table_section"
                : step.action === "template_group_section"
                  ? "template_group_section"
                  : "template_section",
            template_id: step.template_id ?? null,
            is_enabled: step.is_enabled !== false,
            params_json: step.params_json ?? {},
          }));
        setSteps(mappedSteps);
      })
      .catch((err) => console.error("Failed to load section steps", err));
  }, [apiBase, id]);

  useEffect(() => {
    if (!rule || steps.length > 0) return;
    const preset = SECTION_TABLE_PRESETS[rule.section_id];
    if (!preset) return;
    setSteps([
      {
        id: uid(),
        name: `${rule.section_id} table`,
        action: "table_section",
        template_id: null,
        is_enabled: true,
        params_json: {
          array_source: preset.array_source,
          columns: preset.columns.map((col) => ({ ...col })),
          totals: [],
          merge_cells: [],
        },
      },
    ]);
  }, [rule, steps.length]);

  const templateOptions = useMemo(
    () => templates.map((tpl) => ({ value: tpl.id, label: `${tpl.name}${tpl.section_id ? ` (${tpl.section_id})` : ""}` })),
    [templates]
  );

  const fieldOptionsForSource = (arraySource: string) => ARRAY_SOURCE_FIELD_MAP[arraySource] ?? [];
  const arraySourceOptions = useMemo(
    () => DOCUMENT_SOURCE_PATH_GROUPS.find((group) => group.label.includes("Arrays"))?.options ?? [],
    []
  );

  const upsertStepById = (stepId: string, updater: (step: AssemblyStep) => AssemblyStep) => {
    setSteps((prev) => prev.map((entry) => (entry.id === stepId ? updater(entry) : entry)));
  };

  const moveStep = (fromId: string, toId: string) => {
    setSteps((prev) => {
      const fromIndex = prev.findIndex((step) => step.id === fromId);
      const toIndex = prev.findIndex((step) => step.id === toId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const addTemplateStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        id: uid(),
        name: `Template step ${prev.length + 1}`,
        action: "template_section",
        template_id: null,
        is_enabled: true,
        params_json: {},
      },
    ]);
  };

  const addTableStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        id: uid(),
        name: `Table step ${prev.length + 1}`,
        action: "table_section",
        template_id: null,
        is_enabled: true,
        params_json: {
          array_source: "",
          columns: [{ header: "", source_path: "" }],
          totals: [],
          merge_cells: [],
        },
      },
    ]);
  };

  const addGroupStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        id: uid(),
        name: `Group step ${prev.length + 1}`,
        action: "template_group_section",
        template_id: null,
        is_enabled: true,
        params_json: {
          template_group_id: "",
        },
      },
    ]);
  };

  const save = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const payload = {
        steps: steps.map((step) => ({
          name: step.name,
          action: step.action,
          template_id: step.template_id,
          is_enabled: step.is_enabled,
          params_json: step.params_json,
        })),
      };

      const res = await fetch(`${apiBase}/draft-documents/assembly/sections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save section assembly steps");
      toast({ title: "Saved", description: "Section assembly logic updated." });
    } catch (err) {
      console.error(err);
      toast({ title: "Save failed", description: "Unable to save section assembly logic.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Section Assembly Logic</h1>
          <p className="text-sm text-muted-foreground">{rule ? `${rule.section_id} ${rule.title}` : "Loading section..."}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Step</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {rule?.section === "3" ? (
            <Button type="button" variant="outline" onClick={addGroupStep}>
              <Plus className="mr-2 h-4 w-4" />
              Link Group
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={addTemplateStep}>
                <Plus className="mr-2 h-4 w-4" />
                Add Template
              </Button>
              <Button type="button" variant="outline" onClick={addTableStep}>
                <Plus className="mr-2 h-4 w-4" />
                Create Table
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <Card
            key={step.id}
            draggable
            onDragStart={() => setDraggingId(step.id)}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggingId) moveStep(draggingId, step.id);
              setDraggingId(null);
            }}
            className={draggingId === step.id ? "opacity-60" : ""}
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Step {index + 1}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSteps((prev) => prev.filter((entry) => entry.id !== step.id))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Input
                value={step.name}
                onChange={(e) =>
                  setSteps((prev) => prev.map((entry) => (entry.id === step.id ? { ...entry, name: e.target.value } : entry)))
                }
                placeholder="Step name"
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {step.action === "template_section" ? (
                <div className="grid gap-2">
                  <Label>Template</Label>
                  <Select
                    value={step.template_id ?? ""}
                    onValueChange={(value) =>
                      setSteps((prev) =>
                        prev.map((entry) => (entry.id === step.id ? { ...entry, template_id: value } : entry))
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : step.action === "template_group_section" ? (
                <div className="grid gap-2">
                  <Label>Template group</Label>
                  <Select
                    value={step.params_json.template_group_id ?? ""}
                    onValueChange={(value) =>
                      upsertStepById(step.id, (entry) => ({
                        ...entry,
                        params_json: { ...entry.params_json, template_group_id: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose group" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label>Array source</Label>
                    <Select
                      value={step.params_json.array_source ?? ""}
                      onValueChange={(value) =>
                        upsertStepById(step.id, (entry) => ({
                          ...entry,
                          params_json: {
                            ...entry.params_json,
                            array_source: value,
                            columns: [],
                            totals: [],
                          },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select array source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Form arrays</SelectLabel>
                          {arraySourceOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Columns</Label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={newColumnSourceByStep[step.id] ?? ""}
                          onValueChange={(value) =>
                            setNewColumnSourceByStep((prev) => ({ ...prev, [step.id]: value }))
                          }
                        >
                          <SelectTrigger className="w-56">
                            <SelectValue placeholder="Pick placeholder field" />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldOptionsForSource(step.params_json.array_source ?? "").map((opt) => (
                              <SelectItem key={`${opt.key}_${opt.source_path}`} value={opt.source_path}>
                                {opt.token} • {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const sourcePath = newColumnSourceByStep[step.id];
                            if (!sourcePath) return;
                            const picked = fieldOptionsForSource(step.params_json.array_source ?? "").find(
                              (opt) => opt.source_path === sourcePath
                            );
                            upsertStepById(step.id, (entry) => ({
                              ...entry,
                              params_json: {
                                ...entry.params_json,
                                columns: [
                                  ...(entry.params_json.columns ?? []),
                                  {
                                    header: picked?.label ?? "",
                                    source_path: sourcePath,
                                    value_template: picked?.token ?? "",
                                  },
                                ],
                              },
                            }));
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add column
                        </Button>
                      </div>
                    </div>
                    {fieldOptionsForSource(step.params_json.array_source ?? "").length > 0 ? (
                      <div className="rounded-md border bg-muted/30 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Available placeholders</p>
                        <div className="flex flex-wrap gap-2">
                          {fieldOptionsForSource(step.params_json.array_source ?? "").map((opt) => (
                            <button
                              key={`${step.id}_token_${opt.token}`}
                              type="button"
                              className="rounded border bg-background px-2 py-1 text-xs"
                              onClick={() => {
                                if ((step.params_json.columns ?? []).length === 0) return;
                                const lastIndex = (step.params_json.columns ?? []).length - 1;
                                upsertStepById(step.id, (entry) => ({
                                  ...entry,
                                  params_json: {
                                    ...entry.params_json,
                                    columns: (entry.params_json.columns ?? []).map((item, idx) =>
                                      idx === lastIndex
                                        ? {
                                            ...item,
                                            value_template: `${item.value_template ?? ""}${opt.token}`,
                                          }
                                        : item
                                    ),
                                  },
                                }));
                              }}
                              title="Append to latest column cell template"
                            >
                              {opt.token}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Click a token to append it to the latest column's cell template.
                        </p>
                      </div>
                    ) : null}
                    {(step.params_json.columns ?? []).map((column, colIndex) => (
                      <div key={`${step.id}_col_${colIndex}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-[220px_1fr]">
                        <Input
                          value={column.header}
                          onChange={(e) =>
                            upsertStepById(step.id, (entry) => ({
                              ...entry,
                              params_json: {
                                ...entry.params_json,
                                columns: (entry.params_json.columns ?? []).map((item, index) =>
                                  index === colIndex ? { ...item, header: e.target.value } : item
                                ),
                              },
                            }))
                          }
                          placeholder="Column header"
                        />
                        <Select
                          value={column.source_path}
                          onValueChange={(value) =>
                            upsertStepById(step.id, (entry) => ({
                              ...entry,
                              params_json: {
                                ...entry.params_json,
                                columns: (entry.params_json.columns ?? []).map((item, index) =>
                                  index === colIndex ? { ...item, source_path: value } : item
                                ),
                              },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Map value" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Array fields</SelectLabel>
                              {fieldOptionsForSource(step.params_json.array_source ?? "").map((opt) => (
                                <SelectItem key={`${opt.key}_${colIndex}`} value={opt.source_path}>
                                  {opt.token} • {opt.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <Input
                          value={column.value_template ?? ""}
                          onChange={(e) =>
                            upsertStepById(step.id, (entry) => ({
                              ...entry,
                              params_json: {
                                ...entry.params_json,
                                columns: (entry.params_json.columns ?? []).map((item, index) =>
                                  index === colIndex ? { ...item, value_template: e.target.value } : item
                                ),
                              },
                            }))
                          }
                          placeholder="Cell template (optional), e.g. [ENTITY_NAME] - [COUNTRY]"
                        />
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              upsertStepById(step.id, (entry) => ({
                                ...entry,
                                params_json: {
                                  ...entry.params_json,
                                  columns: (entry.params_json.columns ?? []).filter((_, index) => index !== colIndex),
                                },
                              }))
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2 rounded-md border p-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Total label</Label>
                      <Input
                        value={String(step.params_json.totals?.[0]?.label ?? "Total")}
                        onChange={(e) =>
                          setSteps((prev) =>
                            prev.map((entry) =>
                              entry.id === step.id
                                ? {
                                    ...entry,
                                    params_json: {
                                      ...entry.params_json,
                                      totals: [
                                        {
                                          label: e.target.value,
                                          column_index: Number(entry.params_json.totals?.[0]?.column_index ?? 0),
                                          sum_column_index: Number(entry.params_json.totals?.[0]?.sum_column_index ?? 0),
                                        },
                                      ],
                                    },
                                  }
                                : entry
                            )
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Label column index</Label>
                      <Select
                        value={String(step.params_json.totals?.[0]?.column_index ?? 0)}
                        onValueChange={(value) =>
                          setSteps((prev) =>
                            prev.map((entry) =>
                              entry.id === step.id
                                ? {
                                    ...entry,
                                    params_json: {
                                      ...entry.params_json,
                                      totals: [
                                        {
                                          label: String(entry.params_json.totals?.[0]?.label ?? "Total"),
                                          column_index: Number(value || 0),
                                          sum_column_index: Number(entry.params_json.totals?.[0]?.sum_column_index ?? 0),
                                        },
                                      ],
                                    },
                                  }
                                : entry
                            )
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pick column" />
                        </SelectTrigger>
                        <SelectContent>
                          {(step.params_json.columns ?? []).map((column, idx) => (
                            <SelectItem key={`${step.id}_label_col_${idx}`} value={String(idx)}>
                              {idx}: {column.header || `Column ${idx + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sum column index</Label>
                      <Select
                        value={String(step.params_json.totals?.[0]?.sum_column_index ?? 0)}
                        onValueChange={(value) =>
                          setSteps((prev) =>
                            prev.map((entry) =>
                              entry.id === step.id
                                ? {
                                    ...entry,
                                    params_json: {
                                      ...entry.params_json,
                                      totals: [
                                        {
                                          label: String(entry.params_json.totals?.[0]?.label ?? "Total"),
                                          column_index: Number(entry.params_json.totals?.[0]?.column_index ?? 0),
                                          sum_column_index: Number(value || 0),
                                        },
                                      ],
                                    },
                                  }
                                : entry
                            )
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pick numeric column" />
                        </SelectTrigger>
                        <SelectContent>
                          {(step.params_json.columns ?? []).map((column, idx) => (
                            <SelectItem key={`${step.id}_sum_col_${idx}`} value={String(idx)}>
                              {idx}: {column.header || `Column ${idx + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <Label>Merge cells (manual coordinates)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSteps((prev) =>
                            prev.map((entry) =>
                              entry.id === step.id
                                ? {
                                    ...entry,
                                    params_json: {
                                      ...entry.params_json,
                                      merge_cells: [
                                        ...(entry.params_json.merge_cells ?? []),
                                        { row_start: 0, row_end: 0, col_start: 0, col_end: 0 },
                                      ],
                                    },
                                  }
                                : entry
                            )
                          )
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add merge rule
                      </Button>
                    </div>
                    {(step.params_json.merge_cells ?? []).map((mergeRule, mergeIdx) => (
                      <div key={`${step.id}_merge_${mergeIdx}`} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                        <Input
                          type="number"
                          value={Number((mergeRule as any).row_start ?? 0)}
                          onChange={(e) =>
                            setSteps((prev) =>
                              prev.map((entry) =>
                                entry.id === step.id
                                  ? {
                                      ...entry,
                                      params_json: {
                                        ...entry.params_json,
                                        merge_cells: (entry.params_json.merge_cells ?? []).map((item, idx) =>
                                          idx === mergeIdx ? { ...item, row_start: Number(e.target.value || 0) } : item
                                        ),
                                      },
                                    }
                                  : entry
                              )
                            )
                          }
                          placeholder="row_start"
                        />
                        <Input
                          type="number"
                          value={Number((mergeRule as any).row_end ?? 0)}
                          onChange={(e) =>
                            setSteps((prev) =>
                              prev.map((entry) =>
                                entry.id === step.id
                                  ? {
                                      ...entry,
                                      params_json: {
                                        ...entry.params_json,
                                        merge_cells: (entry.params_json.merge_cells ?? []).map((item, idx) =>
                                          idx === mergeIdx ? { ...item, row_end: Number(e.target.value || 0) } : item
                                        ),
                                      },
                                    }
                                  : entry
                              )
                            )
                          }
                          placeholder="row_end"
                        />
                        <Input
                          type="number"
                          value={Number((mergeRule as any).col_start ?? 0)}
                          onChange={(e) =>
                            setSteps((prev) =>
                              prev.map((entry) =>
                                entry.id === step.id
                                  ? {
                                      ...entry,
                                      params_json: {
                                        ...entry.params_json,
                                        merge_cells: (entry.params_json.merge_cells ?? []).map((item, idx) =>
                                          idx === mergeIdx ? { ...item, col_start: Number(e.target.value || 0) } : item
                                        ),
                                      },
                                    }
                                  : entry
                              )
                            )
                          }
                          placeholder="col_start"
                        />
                        <Input
                          type="number"
                          value={Number((mergeRule as any).col_end ?? 0)}
                          onChange={(e) =>
                            setSteps((prev) =>
                              prev.map((entry) =>
                                entry.id === step.id
                                  ? {
                                      ...entry,
                                      params_json: {
                                        ...entry.params_json,
                                        merge_cells: (entry.params_json.merge_cells ?? []).map((item, idx) =>
                                          idx === mergeIdx ? { ...item, col_end: Number(e.target.value || 0) } : item
                                        ),
                                      },
                                    }
                                  : entry
                              )
                            )
                          }
                          placeholder="col_end"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSteps((prev) =>
                              prev.map((entry) =>
                                entry.id === step.id
                                  ? {
                                      ...entry,
                                      params_json: {
                                        ...entry.params_json,
                                        merge_cells: (entry.params_json.merge_cells ?? []).filter((_, idx) => idx !== mergeIdx),
                                      },
                                    }
                                  : entry
                              )
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Section Logic"}
        </Button>
      </div>
    </div>
  );
}
