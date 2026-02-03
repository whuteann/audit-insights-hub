import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { ScreeningPromptModal } from "@/components/modals/ScreeningPromptModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockCompanies, mockProcessedCompanies, mockAuditEntries, Company } from "@/data/mockData";

export default function CompanyListing() {
  const navigate = useNavigate();
  const [isScreeningModalOpen, setIsScreeningModalOpen] = useState(false);

  const stats = useMemo(() => {
    // Calculate companies screened this week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    const screenedThisWeek = mockAuditEntries.filter((entry) => {
      if (entry.action !== "Ran Company Screening") return false;
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startOfWeek;
    }).length;

    // Total companies processed
    const totalProcessed = mockProcessedCompanies.length;

    // Total companies in database
    const totalInDatabase = mockCompanies.length;

    return {
      screenedThisWeek,
      totalProcessed,
      totalInDatabase,
    };
  }, []);

  const columns = [
    {
      key: "name",
      header: "Company Name",
      render: (company: Company) => (
        <span className="font-medium text-foreground">{company.name}</span>
      ),
    },
    {
      key: "country",
      header: "Country",
    },
    {
      key: "industry",
      header: "Industry",
    },
    {
      key: "revenue",
      header: "Revenue",
    },
    {
      key: "addedDate",
      header: "Added Date",
      render: (company: Company) => (
        <span className="text-muted-foreground">{company.addedDate}</span>
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
        data={mockCompanies}
        getRowKey={(company) => company.id}
        emptyMessage="No companies yet. Upload an Excel file to get started."
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
