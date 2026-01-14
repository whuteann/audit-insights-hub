import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileEdit, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TPDocReviewModal } from "@/components/modals/TPDocReviewModal";
import { mockTPDocuments, TPDocument } from "@/data/mockData";

export default function TPDocsListing() {
  const navigate = useNavigate();
  const [selectedDoc, setSelectedDoc] = useState<TPDocument | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const handleContinueEditing = (doc: TPDocument) => {
    navigate(`/tp-docs/create?id=${doc.id}`);
  };

  const handleReview = (doc: TPDocument) => {
    setSelectedDoc(doc);
    setIsReviewModalOpen(true);
  };

  const handleDownload = (doc: TPDocument) => {
    // Mock download
    alert(`Downloading PDF for ${doc.companyName}...`);
  };

  const columns = [
    {
      key: "companyName",
      header: "Company Name",
      render: (doc: TPDocument) => (
        <span className="font-medium text-foreground">{doc.companyName}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (doc: TPDocument) => <StatusBadge status={doc.status} />,
    },
    {
      key: "lastUpdated",
      header: "Last Updated",
      render: (doc: TPDocument) => (
        <span className="text-muted-foreground">{doc.lastUpdated}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (doc: TPDocument) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleContinueEditing(doc)}
          >
            <FileEdit className="w-4 h-4 mr-1" />
            {doc.status === "draft" ? "Continue" : "Edit"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReview(doc)}
          >
            <Eye className="w-4 h-4 mr-1" />
            Review
          </Button>
          {doc.status === "generated" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(doc)}
            >
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="TP Documents"
        description="Manage transfer pricing documentation for your entities"
        actions={
          <Button onClick={() => navigate("/tp-docs/create")}>
            <Plus className="w-4 h-4 mr-2" />
            Create TP Doc
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={mockTPDocuments}
        getRowKey={(doc) => doc.id}
        emptyMessage="No TP documents yet. Create your first one!"
      />

      <TPDocReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        document={selectedDoc}
      />
    </div>
  );
}
