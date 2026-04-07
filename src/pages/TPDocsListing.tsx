import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileEdit, Eye, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatusType } from "@/components/ui/StatusBadge";
import { useAuth } from "@/context/AuthContext";

type DocumentListItem = {
  id: string;
  company_name: string | null;
  jurisdiction: string | null;
  financial_year_end: string | null;
  status: string | null;
  updated_at: string;
  owner_user_id?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
};

export default function TPDocsListing() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    const draftCount = documents.filter((doc) => doc.status === "draft").length;
    const generatedCount = documents.filter((doc) => doc.status === "generated").length;
    
    // Calculate documents generated this week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    const generatedThisWeek = documents.filter((doc) => {
      if (doc.status !== "generated") return false;
      const docDate = new Date(doc.updated_at);
      return docDate >= startOfWeek;
    }).length;

    return { draft: draftCount, generated: generatedCount, generatedThisWeek };
  }, [documents]);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/documents?limit=15`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setDocuments(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Failed to load documents", err);
      })
      .finally(() => setLoading(false));
  }, [apiBase]);

  const handleContinueEditing = (doc: DocumentListItem) => {
    navigate(`/tp-docs/create?id=${doc.id}`);
  };

  const handleReview = (doc: DocumentListItem) => {
    navigate(`/tp-docs/review?id=${doc.id}`);
  };

  const handleDownload = (doc: DocumentListItem) => {
    // Mock download
    alert(`Downloading PDF for ${doc.company_name ?? "document"}...`);
  };

  const handleCreate = async () => {
    try {
      const res = await fetch(`${apiBase}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "draft",
          user_id: user?.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to create draft");
      const draft = await res.json();
      navigate(`/tp-docs/create?id=${encodeURIComponent(draft.id)}`);
    } catch (err) {
      console.error(err);
      alert("Could not create a draft. Please try again.");
    }
  };

  const handleDelete = async (doc: DocumentListItem) => {
    const confirmed = window.confirm(
      `Delete TP document "${doc.company_name ?? doc.id}"? This can be restored only by DB update.`,
    );
    if (!confirmed) return;

    setDeletingDocumentId(doc.id);
    try {
      const response = await fetch(`${apiBase}/documents/${doc.id}`, { method: "DELETE" });
      if (!response.ok) {
        const errPayload = await response.json().catch(() => null);
        const detail =
          errPayload && typeof errPayload.detail === "string"
            ? errPayload.detail
            : "Could not delete document";
        throw new Error(detail);
      }
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not delete document");
    } finally {
      setDeletingDocumentId((current) => (current === doc.id ? null : current));
    }
  };

  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: "companyName",
        header: "Company Name",
        render: (doc: DocumentListItem) => (
          <span className="font-medium text-foreground">{doc.company_name ?? "—"}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (doc: DocumentListItem) => (
          <StatusBadge status={(doc.status ?? "draft") as StatusType} />
        ),
      },
      {
        key: "lastUpdated",
        header: "Last Updated",
        render: (doc: DocumentListItem) => (
          <span className="text-muted-foreground">{new Date(doc.updated_at).toLocaleDateString()}</span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (doc: DocumentListItem) => (
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(doc)}
              disabled={deletingDocumentId === doc.id}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        ),
      },
    ];

    if (!isAdmin) {
      return baseColumns;
    }

    return [
      baseColumns[0],
      {
        key: "owner",
        header: "Owner",
        render: (doc: DocumentListItem) => (
          <span className="text-muted-foreground">
            {doc.owner_name || doc.owner_email || "Unassigned"}
          </span>
        ),
      },
      ...baseColumns.slice(1),
    ];
  }, [deletingDocumentId, isAdmin]);

  return (
    <div className="page-container">
      <PageHeader
        title="TP Documents"
        description="Manage transfer pricing documentation for your entities"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create TP Doc
          </Button>
        }
      />

      {/* Status Counter Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Draft Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statusCounts.draft}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Documents in draft status
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Generated Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statusCounts.generated}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Completed and generated documents
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Generated This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statusCounts.generatedThisWeek}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Documents generated this week
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
      data={documents}
      getRowKey={(doc) => doc.id}
      emptyMessage={loading ? "Loading documents..." : "No TP documents yet. Create your first one!"}
    />
    </div>
  );
}
