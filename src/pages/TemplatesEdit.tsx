import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function TemplatesEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";

  const [template, setTemplate] = useState<TemplateItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftJson, setDraftJson] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`${apiBase}/templates/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setTemplate(data);
        setDraftName(data.name ?? "");
        setDraftJson(JSON.stringify(data.content ?? [], null, 2));
      })
      .catch((err) => {
        console.error("Failed to load template", err);
        setError("Failed to load template.");
      })
      .finally(() => setIsLoading(false));
  }, [apiBase, id]);

  const saveTemplate = async () => {
    if (!template) return;
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
      const res = await fetch(`${apiBase}/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName.trim() || template.name,
          content: parsed,
        }),
      });
      if (!res.ok) throw new Error("Failed to save template");
      const updated = await res.json();
      setTemplate((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err) {
      console.error("Failed to save template", err);
      setError("Failed to save template.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Edit Template</h1>
          <p className="text-sm text-muted-foreground">
            {template ? `${template.section_id} ${template.title}` : "Loading template..."}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/templates")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="grid gap-2">
            <Label>Template name</Label>
            <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Content (JSON array)</Label>
            <Textarea
              value={draftJson}
              onChange={(e) => setDraftJson(e.target.value)}
              className="font-mono text-xs min-h-[55vh]"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end">
            <Button onClick={saveTemplate} disabled={isSaving || !template}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

