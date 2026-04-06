import {
  User, FileCheck, ClipboardList, CheckSquare, Wallet,
  Users, Settings, HelpCircle, LogOut, Smile
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { A2ALogo } from "@/components/a2a-logo";
import { useAuth } from "@/lib/auth-context";

// My Tasks is first — the primary section for freelancers
const mainItems = [
  { title: "My Tasks", url: "/dashboard/my-tasks", icon: CheckSquare },
  { title: "Available Tasks", url: "/dashboard/tasks", icon: ClipboardList },
  { title: "Profile", url: "/dashboard/profile", icon: User },
  { title: "KYC & Documents", url: "/dashboard/kyc", icon: FileCheck },
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

  // Cartoon-like avatar with initials
  const initials = user ? (user.firstName[0] + user.lastName[0]).toUpperCase() : "EX";
  const displayEmail = user?.email || "expert@a2a.global";

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
          {/* Cartoon-like avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0F3DD1] to-[#6366F1] flex items-center justify-center text-white text-xs font-bold shadow-sm relative" data-testid="avatar-cartoon">
            <Smile className="w-5 h-5 absolute opacity-20" />
            <span className="relative z-10">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user ? `${user.firstName} ${user.lastName}` : "Expert"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate" data-testid="text-user-email">
              {displayEmail}
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
