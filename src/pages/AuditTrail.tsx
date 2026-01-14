import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { mockAuditEntries, AuditEntry } from "@/data/mockData";

export default function AuditTrail() {
  const columns = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (entry: AuditEntry) => (
        <span className="text-muted-foreground font-mono text-xs">
          {entry.timestamp}
        </span>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (entry: AuditEntry) => (
        <span className="text-foreground">{entry.user}</span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (entry: AuditEntry) => (
        <span className="font-medium text-foreground">{entry.action}</span>
      ),
    },
    {
      key: "target",
      header: "Target Entity",
      render: (entry: AuditEntry) => (
        <span className="text-muted-foreground">{entry.target}</span>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Audit Trail"
        description="View system activity and user actions"
      />

      <DataTable
        columns={columns}
        data={mockAuditEntries}
        getRowKey={(entry) => entry.id}
        emptyMessage="No audit entries yet."
      />
    </div>
  );
}
