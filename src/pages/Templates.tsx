import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TemplateItem = {
  id: string;
  name: string;
  content: any[];
  section_rules_id: string;
  section_id: string;
  section: string;
  title: string;
  description: string | null;
  updated_at: string | null;
};

export default function Templates() {
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<TemplateItem | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftJson, setDraftJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const openEditor = (tpl: TemplateItem) => {
    setSelected(tpl);
    setDraftName(tpl.name);
    setDraftJson(JSON.stringify(tpl.content ?? [], null, 2));
    setError(null);
  };

  const closeEditor = () => {
    setSelected(null);
    setDraftName("");
    setDraftJson("");
    setError(null);
  };

  const saveTemplate = async () => {
    if (!selected) return;
    setError(null);
    let parsed: any = null;
    try {
      parsed = JSON.parse(draftJson);
      if (!Array.isArray(parsed)) {
        setError("Content must be a JSON array of blocks.");
        return;
      }
    } catch (e) {
      setError("Invalid JSON.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${apiBase}/templates/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName.trim() || selected.name, content: parsed }),
      });
      if (!res.ok) throw new Error("Failed to save template");
      const updated = await res.json();
      setTemplates((prev) =>
        prev.map((t) => (t.id === selected.id ? { ...t, ...updated } : t))
      );
      closeEditor();
    } catch (err) {
      console.error(err);
      setError("Failed to save template.");
    } finally {
      setIsSaving(false);
    }
  };

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      if (a.section === b.section) return a.section_id.localeCompare(b.section_id);
      return a.section.localeCompare(b.section);
    });
  }, [templates]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Manage section templates used in document assembly.
          </p>
        </div>
        <Button variant="outline" onClick={loadTemplates} disabled={isLoading}>
          Refresh
        </Button>
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
                <div className="font-medium">{tpl.section_id}</div>
                <div>{tpl.title}</div>
                <div className="text-xs text-muted-foreground">
                  {tpl.updated_at ? new Date(tpl.updated_at).toLocaleDateString() : "—"}
                </div>
                <div className="text-right">
                  <Button size="sm" variant="outline" onClick={() => openEditor(tpl)}>
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => (!open ? closeEditor() : null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Template name</Label>
              <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
            </div>
            <div className="grid gap-2 flex-1">
              <Label>Content (JSON array)</Label>
              <Textarea
                value={draftJson}
                onChange={(e) => setDraftJson(e.target.value)}
                className="font-mono text-xs min-h-[45vh]"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={closeEditor}>
                Cancel
              </Button>
              <Button onClick={saveTemplate} disabled={isSaving}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
