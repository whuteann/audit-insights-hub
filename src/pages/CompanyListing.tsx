import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { ScreeningPromptModal } from "@/components/modals/ScreeningPromptModal";
import { mockCompanies, Company } from "@/data/mockData";

export default function CompanyListing() {
  const navigate = useNavigate();
  const [isScreeningModalOpen, setIsScreeningModalOpen] = useState(false);

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
      />
    </div>
  );
}
