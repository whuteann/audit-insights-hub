import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

type EmailTemplateItem = {
  id: string;
  name: string;
  updated_at: string | null;
};

export default function EmailTemplates() {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
  const [items, setItems] = useState<EmailTemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = () => {
    setIsLoading(true);
    fetch(`${apiBase}/email-templates`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error(err);
        toast({ title: "Load failed", description: "Unable to load email templates.", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/email-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      load();
      toast({ title: "Deleted", description: "Email template removed." });
    } catch (err) {
      console.error(err);
      toast({ title: "Delete failed", description: "Unable to delete template.", variant: "destructive" });
    }
  };

  useEffect(() => {
    load();
  }, [apiBase]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Email Templates</h1>
          <p className="text-sm text-muted-foreground">Manage reusable email content.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={isLoading}>Refresh</Button>
          <Button onClick={() => navigate("/email-templates/new")}>Create Template</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-[1fr_160px_180px] gap-3 border-b px-4 py-3 text-xs uppercase text-muted-foreground">
          <div>Name</div>
          <div>Updated</div>
          <div className="text-right">Actions</div>
        </div>
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading templates…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No email templates found.</div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_160px_180px] gap-3 px-4 py-3 text-sm">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.updated_at ? new Date(item.updated_at).toLocaleString() : "—"}
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/email-templates/${item.id}/edit`)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
