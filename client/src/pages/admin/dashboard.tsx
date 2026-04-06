import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { A2ALogo } from "@/components/a2a-logo";
import { apiRequest } from "@/lib/queryClient";
import { Users, UserCheck, Phone, FileCheck, TrendingUp, CalendarDays, Download, LogOut, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { clearSession } from "@/lib/queryClient";

interface DashboardData {
  overview: { totalUsers: number; todayRegistrations: number; weekRegistrations: number; monthRegistrations: number };
  verification: { emailVerified: number; mobileVerified: number; kycStarted: number; emailRate: number; mobileRate: number; kycRate: number };
  dailyBreakdown: { date: string; count: number }[];
  recentUsers: { id: number; name: string; email: string; mobile: string; emailVerified: boolean; mobileVerified: boolean; kycStatus: string; createdAt: string }[];
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useQuery<DashboardData>({ queryKey: ["/api/admin/dashboard"] });

  const handleDownloadReport = async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `A2A_Global_Users_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleLogout = () => {
    clearSession();
    setLocation("/admin/login");
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Access denied or session expired</p>
          <Button onClick={() => setLocation("/admin/login")} className="bg-[#0F3DD1]">Go to Admin Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <A2ALogo size="small" />
          <Badge className="bg-[#0F3DD1]/20 text-[#0F3DD1] border-[#0F3DD1]/30">Admin Console</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadReport} className="border-gray-700 text-gray-300 hover:text-white" data-testid="button-download-report">
            <Download className="w-4 h-4 mr-1.5" /> Excel Report
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white" data-testid="button-admin-logout">
            <LogOut className="w-4 h-4 mr-1.5" /> Logout
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 bg-gray-800" />)}
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={Users} label="Total Users" value={data.overview.totalUsers} color="bg-[#0F3DD1]" />
              <KpiCard icon={CalendarDays} label="Today" value={data.overview.todayRegistrations} sub={`This week: ${data.overview.weekRegistrations}`} color="bg-emerald-600" />
              <KpiCard icon={TrendingUp} label="This Month" value={data.overview.monthRegistrations} color="bg-amber-600" />
              <KpiCard icon={BarChart3} label="Email Verified" value={`${data.verification.emailRate}%`} sub={`${data.verification.emailVerified} of ${data.overview.totalUsers}`} color="bg-violet-600" />
            </div>

            {/* Verification Funnel */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-base text-gray-200">Verification Funnel</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-800 rounded-lg">
                    <UserCheck className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
                    <p className="text-2xl font-bold text-white">{data.verification.emailVerified}</p>
                    <p className="text-xs text-gray-400">Email Verified ({data.verification.emailRate}%)</p>
                  </div>
                  <div className="text-center p-4 bg-gray-800 rounded-lg">
                    <Phone className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                    <p className="text-2xl font-bold text-white">{data.verification.mobileVerified}</p>
                    <p className="text-xs text-gray-400">Mobile Verified ({data.verification.mobileRate}%)</p>
                  </div>
                  <div className="text-center p-4 bg-gray-800 rounded-lg">
                    <FileCheck className="w-6 h-6 mx-auto mb-2 text-amber-400" />
                    <p className="text-2xl font-bold text-white">{data.verification.kycStarted}</p>
                    <p className="text-xs text-gray-400">KYC Started ({data.verification.kycRate}%)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Chart (simple bar) */}
            {data.dailyBreakdown.length > 0 && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader><CardTitle className="text-base text-gray-200">Daily Registrations</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-32">
                    {data.dailyBreakdown.slice(-30).map((day, i) => {
                      const max = Math.max(...data.dailyBreakdown.map(d => d.count), 1);
                      const height = Math.max(4, (day.count / max) * 100);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${day.count}`}>
                          <span className="text-[10px] text-gray-500">{day.count}</span>
                          <div className="w-full rounded-t bg-[#0F3DD1]" style={{ height: `${height}%` }} />
                          {i % 5 === 0 && <span className="text-[8px] text-gray-600 -rotate-45">{day.date.slice(5)}</span>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Users Table */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-base text-gray-200">Recent Registrations</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-xs">
                        <th className="text-left py-2 px-3">#</th>
                        <th className="text-left py-2 px-3">Name</th>
                        <th className="text-left py-2 px-3">Email</th>
                        <th className="text-left py-2 px-3">Mobile</th>
                        <th className="text-center py-2 px-3">Email</th>
                        <th className="text-center py-2 px-3">Mobile</th>
                        <th className="text-center py-2 px-3">KYC</th>
                        <th className="text-left py-2 px-3">Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentUsers.map((u, i) => (
                        <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="py-2 px-3 text-gray-500">{u.id}</td>
                          <td className="py-2 px-3 text-white font-medium">{u.name}</td>
                          <td className="py-2 px-3 text-gray-300">{u.email}</td>
                          <td className="py-2 px-3 text-gray-300">{u.mobile}</td>
                          <td className="py-2 px-3 text-center">{u.emailVerified ? <Badge className="bg-emerald-900/50 text-emerald-400 text-[10px]">Yes</Badge> : <Badge variant="outline" className="text-gray-500 text-[10px]">No</Badge>}</td>
                          <td className="py-2 px-3 text-center">{u.mobileVerified ? <Badge className="bg-emerald-900/50 text-emerald-400 text-[10px]">Yes</Badge> : <Badge variant="outline" className="text-gray-500 text-[10px]">No</Badge>}</td>
                          <td className="py-2 px-3 text-center"><Badge variant="outline" className="text-[10px] text-gray-400">{u.kycStatus}</Badge></td>
                          <td className="py-2 px-3 text-gray-400 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}
