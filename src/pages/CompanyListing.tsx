import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Filter, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { ScreeningPromptModal } from "@/components/modals/ScreeningPromptModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
const PAGE_LIMIT = 50;

type VisibilityFilter = "all" | "visible" | "hidden";

const VISIBILITY_COPY: Record<
  VisibilityFilter,
  { statTitle: string; statCaption: string; emptyMessage: string }
> = {
  all: {
    statTitle: "Total Analyses",
    statCaption: "All analyses, hidden and visible",
    emptyMessage: "No analyses yet. Upload an Excel file to get started.",
  },
  visible: {
    statTitle: "Total Analyses",
    statCaption: "Total analyses performed",
    emptyMessage: "No analyses yet. Upload an Excel file to get started.",
  },
  hidden: {
    statTitle: "Hidden Analyses",
    statCaption: "Analyses currently hidden",
    emptyMessage: "No hidden analyses.",
  },
};

/** Mirrors backend `CompanyOut`. */
export type AnalysisCompany = {
  id: string;
  name: string;
  description: string | null;
  country: string | null;
  website: string | null;
  summary: string | null;
};

/** Mirrors backend `AnalysisCompanyOut`. */
export type AnalysisCompanyResult = {
  id: string;
  row_number: number;
  similarity_score: number | null;
  verdict: string;
  user_verdict: string | null;
  reason: string;
  company: AnalysisCompany;
};

/** Mirrors backend `AnalysisOut` — the shape returned by `GET /benchmark/analyses`. */
export type Analysis = {
  id: string;
  company_name: string;
  target_description: string;
  target_summary: string | null;
  filter_keyword: string | null;
  filter_region: string | null;
  filter_industry: string | null;
  filter_status: string | null;
  filter_revenue_min: string | null;
  filter_revenue_max: string | null;
  total_companies: number;
  accepted_count: number;
  potential_count: number;
  rejected_count: number;
  source_filename: string | null;
  status: string;
  error_message: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
};

/** Mirrors backend `AnalysisDetailOut`. */
export type AnalysisDetail = Analysis & {
  company_results: AnalysisCompanyResult[];
};

/**
 * Mirrors backend `AnalysisUpdate`. Omitted keys are left untouched by the
 * server (`exclude_unset`), so only send what you actually want to change.
 */
export type AnalysisUpdate = {
  company_name?: string;
  is_hidden?: boolean;
};

export type UpdateAnalysisOptions = {
  /** Defaults to `VITE_API_BASE_URL`. */
  apiBase?: string;
  signal?: AbortSignal;
};

/**
 * `PATCH /benchmark/analyses/{analysis_id}` — rename an analysis and/or toggle
 * its visibility. Returns the full updated analysis, including its sorted
 * company results.
 *
 * @throws Error carrying the server's `detail` message when the request fails.
 */
export async function updateAnalysis(
  analysisId: string,
  update: AnalysisUpdate,
  { apiBase = DEFAULT_API_BASE, signal }: UpdateAnalysisOptions = {},
): Promise<AnalysisDetail> {
  // The server rejects an empty patch with a 400; fail before the round trip.
  if (update.company_name === undefined && update.is_hidden === undefined) {
    throw new Error("No fields provided to update");
  }

  const res = await fetch(`${apiBase}/benchmark/analyses/${analysisId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
    signal,
  });

  if (!res.ok) {
    const detail = await res
      .json()
      .then((body) => (body as { detail?: unknown } | null)?.detail)
      .catch(() => null);
    throw new Error(
      typeof detail === "string" ? detail : `Failed to update analysis (${res.status})`,
    );
  }

  return (await res.json()) as AnalysisDetail;
}

/** `GET /benchmark/analyses` — one visibility set at a time, newest first. */
async function listAnalyses(hidden: boolean, apiBase: string): Promise<Analysis[]> {
  const res = await fetch(
    `${apiBase}/benchmark/analyses?limit=${PAGE_LIMIT}&offset=0&hidden=${hidden}`,
  );
  if (!res.ok) throw new Error(`Failed to load analyses (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? (data as Analysis[]) : [];
}

export default function CompanyListing() {
  const navigate = useNavigate();
  const [isScreeningModalOpen, setIsScreeningModalOpen] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visibility, setVisibility] = useState<VisibilityFilter>("visible");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const load = async (): Promise<Analysis[]> => {
      if (visibility !== "all") {
        return listAnalyses(visibility === "hidden", apiBase);
      }
      // The endpoint has no "all" mode, so ask for both sets. The newest
      // PAGE_LIMIT rows overall are necessarily contained in the union of the
      // newest PAGE_LIMIT of each set, so this page stays exact.
      const [visible, hidden] = await Promise.all([
        listAnalyses(false, apiBase),
        listAnalyses(true, apiBase),
      ]);
      return [...visible, ...hidden]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, PAGE_LIMIT);
    };

    load()
      .then((rows) => {
        if (!cancelled) setAnalyses(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load analyses", err);
        toast({
          title: "Load failed",
          description: "Unable to load benchmark analyses.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiBase, visibility]);

  const handleToggleHidden = async (analysis: Analysis) => {
    const nextHidden = !analysis.is_hidden;
    setTogglingId(analysis.id);
    try {
      const updated = await updateAnalysis(analysis.id, { is_hidden: nextHidden }, { apiBase });
      setAnalyses((current) =>
        visibility === "all"
          ? current.map((row) => (row.id === updated.id ? updated : row))
          // The row no longer matches the active filter, so drop it from the list.
          : current.filter((row) => row.id !== updated.id),
      );
      toast({
        title: updated.is_hidden ? "Analysis hidden" : "Analysis unhidden",
        description: `${updated.company_name} is now ${updated.is_hidden ? "hidden" : "visible"}.`,
      });
    } catch (error) {
      console.error("Failed to toggle analysis visibility", error);
      toast({
        title: "Update failed",
        description:
          error instanceof Error ? error.message : "Unable to update analysis visibility.",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const screenedThisWeek = analyses.filter((analysis) => {
      const created = new Date(analysis.created_at);
      return created >= startOfWeek;
    }).length;
    const totalInDatabase = analyses.length;

    return {
      screenedThisWeek,
      totalInDatabase,
    };
  }, [analyses]);

  const copy = VISIBILITY_COPY[visibility];

  const columns = [
    {
      key: "company_name",
      header: "Subject Company",
      render: (analysis: Analysis) => (
        <span className="font-medium text-foreground">{analysis.company_name}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
    },
    {
      key: "total_companies",
      header: "Total",
    },
    {
      key: "accepted_count",
      header: "Accepted",
    },
    {
      key: "potential_count",
      header: "Potential",
    },
    {
      key: "rejected_count",
      header: "Rejected",
    },
    {
      key: "created_at",
      header: "Created",
      render: (analysis: Analysis) => (
        <span className="text-muted-foreground">{new Date(analysis.created_at).toLocaleString()}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (analysis: Analysis) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/companies/analyses/${analysis.id}`)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={togglingId === analysis.id}
            onClick={() => void handleToggleHidden(analysis)}
          >
            {analysis.is_hidden ? (
              <Eye className="w-4 h-4 mr-2" />
            ) : (
              <EyeOff className="w-4 h-4 mr-2" />
            )}
            {analysis.is_hidden ? "Unhide" : "Hide"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Companies"
        description="Manage your company database for comparable screening"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="visibility-filter" className="text-sm text-muted-foreground">
                Show:
              </Label>
              <Select
                value={visibility}
                onValueChange={(value) => setVisibility(value as VisibilityFilter)}
              >
                <SelectTrigger id="visibility-filter" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visible">Not Hidden</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => navigate("/companies/upload")}>
              <Upload className="w-4 h-4 mr-2" />
              Screen Companies
            </Button>
            {/* <Button onClick={() => setIsScreeningModalOpen(true)}>
              <Filter className="w-4 h-4 mr-2" />
              Screen Companies
            </Button> */}
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {/* <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Screened This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.screenedThisWeek}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Companies screened this week
            </p>
          </CardContent>
        </Card> */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{copy.statTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalInDatabase}</div>
            <p className="text-sm text-muted-foreground mt-1">{copy.statCaption}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={analyses}
        getRowKey={(analysis) => analysis.id}
        getRowClassName={(analysis) => (analysis.is_hidden ? "opacity-60" : "")}
        emptyMessage={isLoading ? "Loading analyses..." : copy.emptyMessage}
      />

      <ScreeningPromptModal
        isOpen={isScreeningModalOpen}
        onClose={() => setIsScreeningModalOpen(false)}
        onSubmit={() => {
          setIsScreeningModalOpen(false);
          navigate("/companies/screening-results");
        }}
        allowExtractedListOnly={false}
      />
    </div>
  );
}
