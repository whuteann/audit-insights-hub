import { useNavigate } from "react-router-dom";
import { Save, Download, ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { mockScreeningResults, Company } from "@/data/mockData";

export default function ScreeningResults() {
  const navigate = useNavigate();

  const columns = [
    {
      key: "rank",
      header: "Rank",
      render: (company: Company) => {
        const index = mockScreeningResults.findIndex((c) => c.id === company.id);
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{index + 1}</span>
            {index < 3 && <Star className="w-4 h-4 text-status-draft fill-current" />}
          </div>
        );
      },
    },
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
      render: (company: Company) => (
        <Badge variant="secondary">{company.industry}</Badge>
      ),
    },
    {
      key: "revenue",
      header: "Revenue",
    },
  ];

  const handleSaveShortlist = () => {
    alert("Shortlist saved successfully!");
  };

  const handleExportCSV = () => {
    alert("Exporting to CSV...");
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Screening Results"
        description={`Found ${mockScreeningResults.length} comparable companies matching your criteria`}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleSaveShortlist}>
              <Save className="w-4 h-4 mr-2" />
              Save Shortlist
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={mockScreeningResults}
        getRowKey={(company) => company.id}
      />

      <div className="mt-6">
        <Button variant="outline" onClick={() => navigate("/companies")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Companies
        </Button>
      </div>
    </div>
  );
}
