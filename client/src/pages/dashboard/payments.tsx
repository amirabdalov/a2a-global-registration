import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, ArrowUpRight, Link2, DollarSign, Inbox } from "lucide-react";
import type { Payment } from "@shared/schema";

export default function PaymentsPage() {
  const { data: payments = [], isLoading } = useQuery<Payment[]>({ queryKey: ["/api/user/payments"] });

  const balance = payments
    .filter(p => p.status === "completed" && p.type === "credit")
    .reduce((sum, p) => sum + p.amount, 0);

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "completed": return <Badge variant="secondary" className="bg-[#22C55E]/10 text-[#22C55E]">Completed</Badge>;
      case "pending": return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">Pending</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full" data-testid="page-payments">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="heading-payments">
          <Wallet className="w-5 h-5 text-primary" /> Payments
        </h1>
        <p className="text-sm text-muted-foreground">Manage your earnings and payouts</p>
      </div>

      {/* Balance Card */}
      <Card className="overflow-hidden" data-testid="card-balance">
        <div className="p-6" style={{ background: "linear-gradient(135deg, #0F3DD1 0%, #171717 100%)" }}>
          <p className="text-sm text-white/70 mb-1">Available Balance</p>
          <p className="text-3xl font-bold text-white" data-testid="text-balance">${balance.toFixed(2)}</p>
          <div className="flex gap-3 mt-4">
            <Button size="sm" variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0" data-testid="button-create-payment-link">
              <Link2 className="w-3 h-3 mr-1" /> Create Payment Link
            </Button>
            <Button size="sm" variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0" data-testid="button-request-payout">
              <ArrowUpRight className="w-3 h-3 mr-1" /> Request Payout
            </Button>
          </div>
        </div>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm">Complete tasks to start earning</p>
            </div>
          ) : (
            <Table data-testid="table-transactions">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => (
                  <TableRow key={p.id} data-testid={`row-payment-${p.id}`}>
                    <TableCell className="text-sm">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{p.description}</TableCell>
                    <TableCell className="text-sm font-medium">
                      <span className={p.type === "credit" ? "text-[#22C55E]" : "text-destructive"}>
                        {p.type === "credit" ? "+" : "-"}${p.amount.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
