import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/DataTable";
import { toast } from "@/components/ui/use-toast";

type AnalysisCompanyRow = {
  id: string;
  row_number: number;
  similarity_score: number | null;
  verdict: string;
  reason: string;
  company: {
    id: string;
    name: string;
    country: string | null;
    website: string | null;
  };
};

type AnalysisDetail = {
  id: string;
  company_name: string;
  target_description: string;
  status: string;
  created_at: string;
  updated_at: string;
  total_companies: number;
  accepted_count: number;
  potential_count: number;
  rejected_count: number;
  filter_keyword: string | null;
  filter_region: string | null;
  filter_industry: string | null;
  filter_status: string | null;
  filter_revenue_min: string | null;
  filter_revenue_max: string | null;
  company_results: AnalysisCompanyRow[];
};

export default function AnalysisDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verdictFilter, setVerdictFilter] = useState("ALL");

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`${apiBase}/benchmark/analyses/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setAnalysis(data))
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
    if (verdictFilter === "ALL") return analysis.company_results || [];
    return (analysis.company_results || []).filter((row) => row.verdict === verdictFilter);
  }, [analysis, verdictFilter]);

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
      const verdictQuery = verdictFilter !== "ALL" ? `?verdict=${encodeURIComponent(verdictFilter.toLowerCase())}` : "";
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
    { key: "verdict", header: "Verdict" },
    { key: "reason", header: "Reason" },
  ];

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={analysis ? `Analysis: ${analysis.company_name}` : "Analysis Detail"}
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
                <Label htmlFor="verdict-filter">Verdict</Label>
                <Select value={verdictFilter} onValueChange={setVerdictFilter}>
                  <SelectTrigger id="verdict-filter" className="w-40">
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
              <DataTable
                columns={columns}
                data={filteredResults}
                getRowKey={(row) => row.id}
                emptyMessage="No results for selected verdict."
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
