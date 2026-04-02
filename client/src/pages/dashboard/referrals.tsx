import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Users, Copy, UserPlus, UserCheck, DollarSign, Inbox } from "lucide-react";
import type { Referral } from "@shared/schema";

interface ReferralData {
  stats: { referred: number; registered: number; earned: number };
  referrals: Referral[];
}

export default function ReferralsPage() {
  const { toast } = useToast();
  const referralLink = "https://a2a.global/join?ref=A2A-DEMO1234";

  const { data, isLoading } = useQuery<ReferralData>({ queryKey: ["/api/user/referrals"] });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({ title: "Referral link copied!" });
    } catch {
      toast({ title: "Copy failed — please copy manually", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const stats = data?.stats || { referred: 0, registered: 0, earned: 0 };
  const referrals = data?.referrals || [];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full" data-testid="page-referrals">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="heading-referrals">
          <Users className="w-5 h-5 text-primary" /> Referrals
        </h1>
        <p className="text-sm text-muted-foreground">Invite freelancers and earn rewards</p>
      </div>

      {/* Referral Link */}
      <Card data-testid="card-referral-link">
        <CardContent className="pt-6">
          <p className="text-sm font-medium mb-2">Your Referral Link</p>
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="font-mono text-xs bg-muted" data-testid="input-referral-link" />
            <Button variant="outline" onClick={handleCopy} data-testid="button-copy-referral">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card data-testid="stat-referred">
          <CardContent className="pt-5 pb-4 text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{stats.referred}</p>
            <p className="text-xs text-muted-foreground">Referred</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-registered">
          <CardContent className="pt-5 pb-4 text-center">
            <div className="w-10 h-10 rounded-full bg-[#22C55E]/10 flex items-center justify-center mx-auto mb-2">
              <UserCheck className="w-5 h-5 text-[#22C55E]" />
            </div>
            <p className="text-2xl font-bold">{stats.registered}</p>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-earned">
          <CardContent className="pt-5 pb-4 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold">${stats.earned.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Referred Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referred Users</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No referrals yet</p>
              <p className="text-sm">Share your link to start earning</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0" data-testid={`referral-${r.id}`}>
                  <div>
                    <p className="text-sm font-medium">{r.referredEmail || `User #${r.referredUserId}`}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary" className={r.status === "registered" ? "bg-[#22C55E]/10 text-[#22C55E]" : ""}>{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
