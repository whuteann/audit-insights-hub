import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type TemplateItem = {
  id: string;
  name: string;
  content: any[];
  section_rules_id: string | null;
  section_id: string | null;
  section: string | null;
  title: string | null;
  description: string | null;
  updated_at: string | null;
};

export default function Templates() {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadTemplates = () => {
    setIsLoading(true);
    fetch(`${apiBase}/templates`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setTemplates(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load templates", err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadTemplates();
  }, [apiBase]);

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      const aSection = a.section ?? "999";
      const bSection = b.section ?? "999";
      if (aSection === bSection) return (a.section_id ?? "").localeCompare(b.section_id ?? "");
      return aSection.localeCompare(bSection);
    });
  }, [templates]);

  const createTemplate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      setIsCreating(true);
      const res = await fetch(`${apiBase}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create template");
      const created = await res.json();
      navigate(`/templates/edit/${created.id}`);
    } catch (err) {
      console.error("Failed to create template", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Manage section templates used in document assembly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="New template title"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void createTemplate();
              }
            }}
          />
          <Button onClick={createTemplate} disabled={isCreating || !newName.trim()}>
            {isCreating ? "Creating..." : "Add New"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/templates/industry-analysis")}>
            Industry Analysis
          </Button>
          <Button variant="outline" onClick={loadTemplates} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-[140px_1fr_120px_120px] gap-3 border-b px-4 py-3 text-xs uppercase text-muted-foreground">
          <div>Section</div>
          <div>Title</div>
          <div>Updated</div>
          <div className="text-right">Actions</div>
        </div>
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading templates…</div>
        ) : sortedTemplates.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No templates found.</div>
        ) : (
          <div className="divide-y">
            {sortedTemplates.map((tpl) => (
              <div key={tpl.id} className="grid grid-cols-[140px_1fr_120px_120px] gap-3 px-4 py-3 text-sm">
                <div className="font-medium">{tpl.section_id ?? "-"}</div>
                <div>{tpl.title ?? tpl.name}</div>
                <div className="text-xs text-muted-foreground">
                  {tpl.updated_at ? new Date(tpl.updated_at).toLocaleDateString() : "—"}
                </div>
                <div className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/templates/edit/${tpl.id}`)}
                  >
                    Edit
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
