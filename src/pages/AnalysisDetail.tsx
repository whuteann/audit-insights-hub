import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Download, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/DataTable";
import { toast } from "@/components/ui/use-toast";
import {
  updateAnalysis,
  type AnalysisCompanyResult as AnalysisCompanyRow,
  type AnalysisDetail as AnalysisRecord,
} from "@/pages/CompanyListing";

const normalizeAnalysis = (analysis: AnalysisRecord): AnalysisRecord => ({
  ...analysis,
  company_results: [...(analysis.company_results || [])].sort((a, b) => a.row_number - b.row_number),
});

export default function AnalysisDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userVerdictFilter, setUserVerdictFilter] = useState("ALL");
  const [computedVerdictFilter, setComputedVerdictFilter] = useState("ALL");
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`${apiBase}/benchmark/analyses/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setAnalysis(normalizeAnalysis(data)))
      .catch((err) => {
        console.error("Failed to load analysis", err);
        toast({
          title: "Load failed",
          description: "Unable to load analysis details.",
          variant: "destructive",
        });
      })
      .finally(() => setIsLoading(false));
  }, [apiBase, id]);

  const filteredResults = useMemo(() => {
    if (!analysis) return [];
    return (analysis.company_results || []).filter((row) => {
      const userVerdictMatch =
        userVerdictFilter === "ALL" ? true : row.user_verdict === userVerdictFilter;
      const computedVerdictMatch =
        computedVerdictFilter === "ALL" ? true : row.verdict === computedVerdictFilter;
      return userVerdictMatch && computedVerdictMatch;
    });
  }, [analysis, userVerdictFilter, computedVerdictFilter]);

  const statusBadgeClass = useMemo(() => {
    const status = (analysis?.status || "").toLowerCase();
    if (status === "completed") return "bg-green-100 text-green-700 border-green-200";
    if (status === "processing") return "bg-amber-100 text-amber-700 border-amber-200";
    if (status === "failed") return "bg-red-100 text-red-700 border-red-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  }, [analysis?.status]);

  const handleDownload = async () => {
    if (!id) return;
    try {
      const verdictQuery =
        userVerdictFilter !== "ALL"
          ? `?verdict=${encodeURIComponent(userVerdictFilter.toLowerCase())}`
          : "";
      const res = await fetch(`${apiBase}/benchmark/analyses/${id}/download${verdictQuery}`);
      if (!res.ok) throw new Error("Failed to download results");
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
      const filename = filenameMatch?.[1] || `benchmark_results_${id}.xlsx`;
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast({
        title: "Download failed",
        description: "Unable to download analysis file.",
        variant: "destructive",
      });
    }
  };

  const handleUserVerdictChange = async (row: AnalysisCompanyRow, value: string) => {
    if (!id) return;
    setUpdatingRowId(row.id);
    const payload = { user_verdict: value === "EMPTY" ? null : value };
    try {
      const res = await fetch(`${apiBase}/benchmark/analyses/${id}/companies/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update verdict");
      const updatedAnalysis = (await res.json()) as AnalysisRecord;
      setAnalysis(normalizeAnalysis(updatedAnalysis));
    } catch (error) {
      console.error(error);
      toast({
        title: "Update failed",
        description: "Unable to update verdict.",
        variant: "destructive",
      });
    } finally {
      setUpdatingRowId(null);
    }
  };

  const startEditingName = () => {
    setNameDraft(analysis?.company_name ?? "");
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
    setNameDraft("");
  };

  const handleSaveName = async () => {
    if (!id || !analysis) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      toast({
        title: "Name required",
        description: "Company name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    if (trimmed === analysis.company_name) {
      cancelEditingName();
      return;
    }

    setIsSavingName(true);
    try {
      const updated = await updateAnalysis(id, { company_name: trimmed }, { apiBase });
      setAnalysis(normalizeAnalysis(updated));
      setIsEditingName(false);
      setNameDraft("");
      toast({ title: "Analysis renamed", description: `Now "${updated.company_name}".` });
    } catch (error) {
      console.error("Failed to rename analysis", error);
      toast({
        title: "Rename failed",
        description: error instanceof Error ? error.message : "Unable to update company name.",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const columns = [
    { key: "row_number", header: "No." },
    {
      key: "company_name",
      header: "Company",
      render: (row: AnalysisCompanyRow) => <span className="font-medium">{row.company.name}</span>,
    },
    {
      key: "website",
      header: "Website",
      render: (row: AnalysisCompanyRow) =>
        row.company.website ? (
          <a href={row.company.website} target="_blank" rel="noreferrer" className="text-accent underline">
            {row.company.website}
          </a>
        ) : (
          "—"
        ),
    },
    {
      key: "country",
      header: "Country",
      render: (row: AnalysisCompanyRow) => row.company.country || "—",
    },
    {
      key: "similarity_score",
      header: "Similarity",
      render: (row: AnalysisCompanyRow) => (row.similarity_score == null ? "—" : row.similarity_score.toFixed(4)),
    },
    { key: "verdict", header: "Computed Verdict" },
    {
      key: "user_verdict",
      header: "Verdict",
      render: (row: AnalysisCompanyRow) => (
        <Select
          value={row.user_verdict ?? "EMPTY"}
          onValueChange={(value) => void handleUserVerdictChange(row, value)}
          disabled={updatingRowId === row.id}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select verdict" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EMPTY">—</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="POTENTIAL">Potential</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (row: AnalysisCompanyRow) => (
        <div className="min-w-[500px] whitespace-normal break-words leading-relaxed">
          {row.reason || "—"}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={
          !analysis ? (
            "Analysis Detail"
          ) : isEditingName ? (
            <span className="flex items-center gap-2">
              <Input
                autoFocus
                value={nameDraft}
                disabled={isSavingName}
                aria-label="Subject company name"
                className="h-10 w-[22rem] max-w-full text-2xl font-semibold"
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleSaveName();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    cancelEditingName();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => void handleSaveName()}
                disabled={isSavingName || !nameDraft.trim()}
              >
                <Check className="w-4 h-4 mr-2" />
                {isSavingName ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEditingName} disabled={isSavingName}>
                <X className="w-4 h-4" />
                <span className="sr-only">Cancel rename</span>
              </Button>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {`Analysis: ${analysis.company_name}`}
              <Button
                size="sm"
                variant="ghost"
                onClick={startEditingName}
                aria-label="Rename subject company"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </span>
          )
        }
        description="Benchmark analysis details and candidate verdicts"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/companies")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleDownload} disabled={!analysis}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        }
      />

      {isLoading || !analysis ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {isLoading ? "Loading analysis..." : "No analysis found."}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[1.35rem] font-semibold leading-tight text-foreground">Summary</p>
                  <p className="text-xs text-muted-foreground">Created {new Date(analysis.created_at).toLocaleString()}</p>
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize shadow-sm ${statusBadgeClass}`}
                >
                  {analysis.status}
                </span>
              </div>

              <div className="h-px bg-border" />

              <div className="rounded-xl bg-muted/35 p-5">
                <div className="grid gap-5 md:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-[26px] font-semibold leading-none text-foreground">{analysis.total_companies}</p>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[26px] font-semibold leading-none text-green-700">{analysis.accepted_count}</p>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Accepted</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[26px] font-semibold leading-none text-amber-700">{analysis.potential_count}</p>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Potential</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[26px] font-semibold leading-none text-red-700">{analysis.rejected_count}</p>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Keyword</p>
                    <p className="truncate text-[15px] text-foreground" title={analysis.filter_keyword || "—"}>
                      {analysis.filter_keyword || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Industry</p>
                    <p className="text-[15px] text-foreground">{analysis.filter_industry || "—"}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Region</p>
                    <p className="text-[15px] text-foreground">{analysis.filter_region || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Status Filter</p>
                    <p className="text-[15px] text-foreground">{analysis.filter_status || "—"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Company Results</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="user-verdict-filter">Filter Verdict</Label>
                <Select value={userVerdictFilter} onValueChange={setUserVerdictFilter}>
                  <SelectTrigger id="user-verdict-filter" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="ACCEPTED">Accepted</SelectItem>
                    <SelectItem value="POTENTIAL">Potential</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Label htmlFor="computed-verdict-filter">Filter Computed Verdict</Label>
                <Select value={computedVerdictFilter} onValueChange={setComputedVerdictFilter}>
                  <SelectTrigger id="computed-verdict-filter" className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="ACCEPTED">Accepted</SelectItem>
                    <SelectItem value="POTENTIAL">Potential</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[1100px]">
                  <DataTable
                    columns={columns}
                    data={filteredResults}
                    getRowKey={(row) => row.id}
                    getRowClassName={(row) => {
                      if (row.user_verdict === "ACCEPTED") return "bg-green-100";
                      if (row.user_verdict === "POTENTIAL") return "bg-orange-100";
                      if (row.user_verdict === "REJECTED") return "bg-red-100";
                      return "";
                    }}
                    emptyMessage="No results for selected verdict."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
