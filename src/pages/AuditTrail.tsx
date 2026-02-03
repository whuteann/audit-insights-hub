import { useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockAuditEntries, AuditEntry } from "@/data/mockData";

export default function AuditTrail() {
  const actionsThisWeek = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    return mockAuditEntries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startOfWeek;
    }).length;
  }, []);

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

      {/* Actions This Week Card */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Actions This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{actionsThisWeek}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Total actions performed this week
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={mockAuditEntries}
        getRowKey={(entry) => entry.id}
        emptyMessage="No audit entries yet."
      />
    </div>
  );
}
