import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Filter, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScreeningPromptModal } from "@/components/modals/ScreeningPromptModal";
import { mockProcessedCompanies, Company } from "@/data/mockData";

export default function ProcessedCompanies() {
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
  ];

  const handleSaveCompanies = () => {
    alert("Companies saved to database!");
    navigate("/companies");
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Processed Companies"
        description="Review the extracted company data before saving"
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIsScreeningModalOpen(true)}>
              <Filter className="w-4 h-4 mr-2" />
              Screen Companies
            </Button>
            <Button onClick={handleSaveCompanies}>
              <Save className="w-4 h-4 mr-2" />
              Save Companies
            </Button>
          </div>
        }
      />

      <Alert className="bg-status-generated/10 border-status-generated/30">
        <CheckCircle2 className="h-4 w-4 text-status-generated" />
        <AlertDescription className="text-foreground">
          Successfully extracted {mockProcessedCompanies.length} companies from your file.
        </AlertDescription>
      </Alert>

      <DataTable
        columns={columns}
        data={mockProcessedCompanies}
        getRowKey={(company) => company.id}
      />

      <div className="mt-6">
        <Button variant="outline" onClick={() => navigate("/companies")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Companies
        </Button>
      </div>

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
