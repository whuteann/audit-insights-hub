import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

type UserRole = "admin" | "user";

type UserItem = {
  id: string;
  name: string;
  email: string;
  phone_number: string | null;
  role: UserRole;
  created_at: string | null;
  updated_at: string | null;
};

type UserListResponse = {
  items: UserItem[];
  total: number;
  limit: number;
  offset: number;
};

type UserFormState = {
  name: string;
  email: string;
  phone_number: string;
  role: UserRole;
  password: string;
};

const PAGE_SIZE = 20;

const EMPTY_FORM: UserFormState = {
  name: "",
  email: "",
  phone_number: "",
  role: "user",
  password: "",
};

export default function UserList() {
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [offset, setOffset] = useState(0);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState<UserFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const headerTitle = useMemo(
    () => (editingUserId ? "Edit user" : "Create user"),
    [editingUserId],
  );

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      if (query.trim()) params.set("q", query.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);

      const response = await fetch(`${apiBase}/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load users");
      }
      const payload = (await response.json()) as UserListResponse;
      setUsers(Array.isArray(payload.items) ? payload.items : []);
      setTotal(typeof payload.total === "number" ? payload.total : 0);
    } catch (err) {
      console.error(err);
      toast({
        title: "Load failed",
        description: "Unable to load users.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, offset]);

  const applyFilters = () => {
    setOffset(0);
    void loadUsers();
  };

  const openCreateDialog = () => {
    setEditingUserId(null);
    setFormState(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: UserItem) => {
    setEditingUserId(user.id);
    setFormState({
      name: user.name,
      email: user.email,
      phone_number: user.phone_number ?? "",
      role: user.role,
      password: "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingUserId(null);
    setFormState(EMPTY_FORM);
  };

  const saveUser = async () => {
    const payload: Record<string, string | null> = {
      name: formState.name.trim(),
      email: formState.email.trim(),
      phone_number: formState.phone_number.trim() || null,
      role: formState.role,
    };

    if (!payload.name || !payload.email) {
      toast({
        title: "Invalid input",
        description: "Name and email are required.",
        variant: "destructive",
      });
      return;
    }

    const isCreate = !editingUserId;
    if (isCreate) {
      if (formState.password.trim().length < 8) {
        toast({
          title: "Invalid password",
          description: "Password must be at least 8 characters.",
          variant: "destructive",
        });
        return;
      }
      payload.password = formState.password;
    } else if (formState.password.trim()) {
      if (formState.password.trim().length < 8) {
        toast({
          title: "Invalid password",
          description: "Password must be at least 8 characters.",
          variant: "destructive",
        });
        return;
      }
      payload.password = formState.password;
    }

    setIsSaving(true);
    try {
      const url = isCreate ? `${apiBase}/users` : `${apiBase}/users/${editingUserId}`;
      const method = isCreate ? "POST" : "PUT";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => null);
        const detail =
          errPayload && typeof errPayload.detail === "string"
            ? errPayload.detail
            : "Unable to save user";
        throw new Error(detail);
      }

      toast({
        title: isCreate ? "User created" : "User updated",
        description: isCreate ? "New user has been added." : "User details saved.",
      });
      closeDialog();
      await loadUsers();
    } catch (err) {
      console.error(err);
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unable to save user",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUser = async (user: UserItem) => {
    const confirmed = window.confirm(`Deactivate user "${user.email}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`${apiBase}/users/${user.id}`, { method: "DELETE" });
      if (!response.ok) {
        const errPayload = await response.json().catch(() => null);
        const detail =
          errPayload && typeof errPayload.detail === "string"
            ? errPayload.detail
            : "Unable to deactivate user";
        throw new Error(detail);
      }
      toast({
        title: "User deactivated",
        description: `${user.email} is now inactive.`,
      });
      await loadUsers();
    } catch (err) {
      console.error(err);
      toast({
        title: "Deactivate failed",
        description: err instanceof Error ? err.message : "Unable to deactivate user",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">User List</h1>
          <p className="text-sm text-muted-foreground">
            Manage application users and roles.
          </p>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
              placeholder="Search by name, email, phone"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applyFilters();
                }
              }}
            />
          </div>
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as "all" | UserRole)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={applyFilters}>
              Apply
            </Button>
            <Button variant="outline" onClick={() => void loadUsers()} disabled={isLoading}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-[1fr_220px_130px_160px_120px] gap-3 border-b px-4 py-3 text-xs uppercase text-muted-foreground">
          <div>User</div>
          <div>Phone</div>
          <div>Role</div>
          <div>Created</div>
          <div className="text-right">Actions</div>
        </div>
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No users found.</div>
        ) : (
          <div className="divide-y">
            {users.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[1fr_220px_130px_160px_120px] gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="text-xs text-muted-foreground">{user.phone_number || "—"}</div>
                <div>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="icon" variant="outline" onClick={() => openEditDialog(user)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => void deleteUser(user)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} total user{total === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
            disabled={offset === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{headerTitle}</DialogTitle>
            <DialogDescription>
              {editingUserId
                ? "Update user details. Leave password blank to keep current password."
                : "Create a new user account."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Name</Label>
              <Input
                id="user-name"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-phone">Phone Number</Label>
              <Input
                id="user-phone"
                value={formState.phone_number}
                onChange={(event) => setFormState((prev) => ({ ...prev, phone_number: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formState.role}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, role: value as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">
                {editingUserId ? "New Password (optional)" : "Password"}
              </Label>
              <Input
                id="user-password"
                type="password"
                value={formState.password}
                onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={editingUserId ? "Leave blank to keep existing password" : ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => void saveUser()} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
