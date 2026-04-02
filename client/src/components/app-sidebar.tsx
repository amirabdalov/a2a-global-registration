import {
  User, FileCheck, ClipboardList, CheckSquare, Wallet,
  Users, Settings, HelpCircle, LogOut
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { A2ALogo } from "@/components/a2a-logo";
import { useAuth } from "@/lib/auth-context";

const mainItems = [
  { title: "Profile", url: "/dashboard/profile", icon: User },
  { title: "KYC & Documents", url: "/dashboard/kyc", icon: FileCheck },
  { title: "Available Tasks", url: "/dashboard/tasks", icon: ClipboardList },
  { title: "My Tasks", url: "/dashboard/my-tasks", icon: CheckSquare },
  { title: "Payments", url: "/dashboard/payments", icon: Wallet },
  { title: "Referrals", url: "/dashboard/referrals", icon: Users },
];

const bottomItems = [
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
  { title: "Support", url: "/dashboard/support", icon: HelpCircle },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar data-testid="sidebar-nav">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <A2ALogo size="default" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider">Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
            {user ? (user.firstName[0] + user.lastName[0]) : "FL"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user ? `${user.firstName} ${user.lastName}` : "Freelancer"}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
              {user?.email || "freelancer@example.com"}
            </p>
          </div>
          <Link href="/auth/login">
            <button className="text-muted-foreground hover:text-foreground" data-testid="button-logout" aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
