import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

type GroupTemplate = {
  id: string;
  name: string;
  sort_order: number;
  updated_at: string | null;
};

type TemplateGroup = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string | null;
  templates: GroupTemplate[];
};

export default function TemplatesIndustryAnalysis() {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";

  const [groups, setGroups] = useState<TemplateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newTemplateNames, setNewTemplateNames] = useState<Record<string, string>>({});
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");

  const loadGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/templates/industry-analysis/groups`);
      if (!res.ok) throw new Error("Failed to load groups");
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load Industry Analysis template groups.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [apiBase]);

  const sortedGroups = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        templates: [...group.templates].sort((a, b) => a.sort_order - b.sort_order),
      })),
    [groups]
  );

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      setError("Group name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/templates/industry-analysis/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create group");

      setNewGroupName("");
      setNewGroupDescription("");
      await loadGroups();
      toast({
        title: "Group created",
        description: "Industry Analysis group was created.",
      });
    } catch (err) {
      console.error(err);
      setError("Failed to create group.");
      toast({
        title: "Create group failed",
        description: "Unable to create Industry Analysis group.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const createTemplate = async (groupId: string) => {
    const rawName = newTemplateNames[groupId] ?? "";
    if (!rawName.trim()) {
      setError("Template name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/templates/industry-analysis/groups/${groupId}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rawName.trim(),
          content: [],
        }),
      });
      if (!res.ok) throw new Error("Failed to create template");

      setNewTemplateNames((prev) => ({ ...prev, [groupId]: "" }));
      await loadGroups();
      toast({
        title: "Template created",
        description: "Template was added to the group.",
      });
    } catch (err) {
      console.error(err);
      setError("Failed to create template.");
      toast({
        title: "Create template failed",
        description: "Unable to create template in this group.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveTemplate = async (groupId: string, fromIndex: number, toIndex: number) => {
    const group = sortedGroups.find((item) => item.id === groupId);
    if (!group) return;
    if (toIndex < 0 || toIndex >= group.templates.length) return;

    const next = [...group.templates];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/templates/industry-analysis/groups/${groupId}/templates/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_ids: next.map((item) => item.id) }),
      });
      if (!res.ok) throw new Error("Failed to reorder templates");
      await loadGroups();
    } catch (err) {
      console.error(err);
      setError("Failed to reorder templates.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startGroupNameEdit = (group: TemplateGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const cancelGroupNameEdit = () => {
    setEditingGroupId(null);
    setEditingGroupName("");
  };

  const saveGroupName = async (groupId: string) => {
    if (!editingGroupName.trim()) {
      setError("Group name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/templates/industry-analysis/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingGroupName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update group");

      await loadGroups();
      cancelGroupNameEdit();
      toast({
        title: "Group updated",
        description: "Group name was updated successfully.",
      });
    } catch (err) {
      console.error(err);
      setError("Failed to update group name.");
      toast({
        title: "Update group failed",
        description: "Unable to update group name.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Industry Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Build and maintain grouped template sets for Section 3 Industry Analysis. Use groups to
            organize related templates and control execution order.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/templates")}> 
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Group</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Benchmark Narrative Variants"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="group-description">Description</Label>
            <Input
              id="group-description"
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={createGroup} disabled={isSubmitting}>
              <Plus className="mr-2 h-4 w-4" />
              Add Group
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading groups...</p>
      ) : sortedGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No groups found.</p>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                {editingGroupId === group.id ? (
                  <div className="space-y-2">
                    <Label htmlFor={`group-title-${group.id}`} className="text-xs uppercase text-muted-foreground">
                      Group title
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`group-title-${group.id}`}
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                      />
                      <Button size="sm" onClick={() => saveGroupName(group.id)} disabled={isSubmitting}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelGroupNameEdit} disabled={isSubmitting}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle
                      className="cursor-text hover:underline"
                      onClick={() => startGroupNameEdit(group)}
                      title="Click to edit group name"
                    >
                      {group.name}
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startGroupNameEdit(group)}
                      title="Edit group name"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {group.description ? (
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="grid gap-2">
                    <Label htmlFor={`new-template-${group.id}`}>New Template Name</Label>
                    <Input
                      id={`new-template-${group.id}`}
                      value={newTemplateNames[group.id] ?? ""}
                      onChange={(e) =>
                        setNewTemplateNames((prev) => ({ ...prev, [group.id]: e.target.value }))
                      }
                      placeholder="e.g. Industry Risk Summary Variant A"
                    />
                  </div>
                  <Button onClick={() => createTemplate(group.id)} disabled={isSubmitting}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </div>

                <div className="rounded-md border">
                  <div className="grid grid-cols-[60px_1fr_220px] gap-3 border-b px-3 py-2 text-xs uppercase text-muted-foreground">
                    <div>Order</div>
                    <div>Name</div>
                    <div className="text-right">Actions</div>
                  </div>
                  {group.templates.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground">No templates in this group.</div>
                  ) : (
                    <div className="divide-y">
                      {group.templates.map((template, index) => (
                        <div key={template.id} className="grid grid-cols-[60px_1fr_220px] gap-3 px-3 py-2 text-sm">
                          <div className="font-medium">{index + 1}</div>
                          <div>{template.name}</div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => moveTemplate(group.id, index, index - 1)}
                              disabled={index === 0 || isSubmitting}
                              title="Move up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => moveTemplate(group.id, index, index + 1)}
                              disabled={index === group.templates.length - 1 || isSubmitting}
                              title="Move down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/templates/edit/${template.id}`)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
