import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bold, Italic, List, ListOrdered, Underline as UnderlineIcon } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

export default function EmailTemplateEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: "<p></p>",
    editorProps: {
      attributes: {
        class: "min-h-[320px] rounded-md border bg-background px-3 py-2 text-sm focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!isEdit || !id || !editor) return;
    setIsLoading(true);
    fetch(`${apiBase}/email-templates/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setName(data?.name ?? "");
        editor.commands.setContent(data?.content_html ?? "<p></p>");
      })
      .catch((err) => {
        console.error(err);
        toast({ title: "Load failed", description: "Unable to load email template.", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, [apiBase, editor, id, isEdit]);

  const handleSave = async () => {
    if (!editor) return;
    const trimmedName = name.trim();
    const contentHtml = editor.getHTML();
    const plainText = editor.getText().trim();
    if (!trimmedName) {
      toast({ title: "Name required", description: "Enter a template name.", variant: "destructive" });
      return;
    }
    if (!plainText) {
      toast({ title: "Content required", description: "Enter email content.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `${apiBase}/email-templates/${id}` : `${apiBase}/email-templates`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, content_html: contentHtml }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Saved", description: "Email template saved." });
      navigate("/email-templates");
    } catch (err) {
      console.error(err);
      toast({ title: "Save failed", description: "Unable to save email template.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{isEdit ? "Edit Email Template" : "Create Email Template"}</h1>
          <p className="text-sm text-muted-foreground">Compose reusable email content.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="grid gap-2">
            <Label>Template name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TPD Draft Ready" />
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
              <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBold().run()}>
                <Bold className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleItalic().run()}>
                <Italic className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleUnderline().run()}>
                <UnderlineIcon className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                <List className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
                <ListOrdered className="h-4 w-4" />
              </Button>
            </div>
            <EditorContent editor={editor} />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving || !editor}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
