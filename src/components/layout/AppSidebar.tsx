import { Building2, FileCode2, FileText, LogOut, Mail, Network, Users } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigation = [
    { name: "TP Docs", href: "/tp-docs", icon: FileText, adminOnly: false },
    { name: "Templates", href: "/templates", icon: FileCode2, adminOnly: true },
    { name: "Email Templates", href: "/email-templates", icon: Mail, adminOnly: true },
    { name: "Global Structure", href: "/assembly", icon: Network, adminOnly: true },
    { name: "User List", href: "/users", icon: Users, adminOnly: true },
    { name: "Screen Companies", href: "/companies", icon: Building2, adminOnly: false },
  ];

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <FileText className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">
            TP Manager
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          if (item.adminOnly && !isAdmin) {
            return null;
          }
          const isActive = location.pathname.startsWith(item.href);
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground text-sm font-medium">
            {(user?.name || "U")
              .split(" ")
              .map((part) => part[0]?.toUpperCase() || "")
              .join("")
              .slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name ?? "User"}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user?.email ?? ""}
            </p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
