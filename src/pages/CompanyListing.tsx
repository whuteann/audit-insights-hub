import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Filter, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { ScreeningPromptModal } from "@/components/modals/ScreeningPromptModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

type AnalysisListItem = {
  id: string;
  company_name: string;
  status: string;
  total_companies: number;
  accepted_count: number;
  potential_count: number;
  rejected_count: number;
  created_at: string;
};

export default function CompanyListing() {
  const navigate = useNavigate();
  const [isScreeningModalOpen, setIsScreeningModalOpen] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${apiBase}/benchmark/analyses?limit=50&offset=0`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setAnalyses(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Failed to load analyses", err);
        toast({
          title: "Load failed",
          description: "Unable to load benchmark analyses.",
          variant: "destructive",
        });
      })
      .finally(() => setIsLoading(false));
  }, [apiBase]);

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

  const columns = [
    {
      key: "company_name",
      header: "Subject Company",
      render: (analysis: AnalysisListItem) => (
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
      render: (analysis: AnalysisListItem) => (
        <span className="text-muted-foreground">{new Date(analysis.created_at).toLocaleString()}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (analysis: AnalysisListItem) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/companies/analyses/${analysis.id}`)}
        >
          <Eye className="w-4 h-4 mr-2" />
          View
        </Button>
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
            <Button variant="outline" onClick={() => navigate("/companies/upload")}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Excel
            </Button>
            <Button onClick={() => setIsScreeningModalOpen(true)}>
              <Filter className="w-4 h-4 mr-2" />
              Screen Companies
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Screened This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.screenedThisWeek}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Companies screened this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">In Database</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalInDatabase}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Total companies in database
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={analyses}
        getRowKey={(analysis) => analysis.id}
        emptyMessage={isLoading ? "Loading analyses..." : "No analyses yet. Upload an Excel file to get started."}
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
