import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Calendar, DollarSign, Tag, Loader2, Sparkles, Phone, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import type { Task } from "@shared/schema";

const categories = ["All", "Data Annotation", "AI Model Review", "Code Review", "Data Validation", "ML Pipeline QA"];

function MobileVerifyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-[#0F3DD1]" /> Verify Your Mobile Number
          </DialogTitle>
          <DialogDescription>
            To apply for tasks and receive payments, you need to verify your mobile number first. This takes less than a minute.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200 mt-2">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            US clients require verified contact details before assigning tasks. Add and confirm your number to start applying.
          </p>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Later</button>
          <Link href="/dashboard/profile">
            <button className="flex-1 px-4 py-2 text-sm bg-[#0F3DD1] text-white rounded-lg hover:bg-[#0D35B8] flex items-center justify-center gap-2" data-testid="button-go-verify-mobile">
              <Phone className="w-4 h-4" /> Verify Now
            </button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TasksPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showMobileDialog, setShowMobileDialog] = useState(false);
  const [category, setCategory] = useState("All");
  const [budgetRange, setBudgetRange] = useState("All");

  const { data: tasks = [], isLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });

  const applyMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("POST", `/api/tasks/${taskId}/apply`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/tasks"] });
      toast({ title: "Application submitted successfully!" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "All" && t.category !== category) return false;
    if (budgetRange === "$50-$150" && t.budgetMax > 150) return false;
    if (budgetRange === "$150-$300" && (t.budgetMin > 300 || t.budgetMax < 150)) return false;
    if (budgetRange === "$300+" && t.budgetMax < 300) return false;
    return true;
  });

  const categoryColor = (cat: string) => {
    switch (cat) {
      case "Data Annotation": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "AI Model Review": return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
      case "Code Review": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "Data Validation": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "ML Pipeline QA": return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full" data-testid="page-tasks">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="heading-tasks">
            <Sparkles className="w-5 h-5 text-primary" /> Available Tasks
          </h1>
          <p className="text-sm text-muted-foreground">Second Opinion for AI — browse and apply</p>
        </div>
        <Badge variant="secondary" className="w-fit">{filtered.length} tasks available</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3" data-testid="task-filters">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="input-search-tasks" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="pl-10" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-44" data-testid="select-category"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={budgetRange} onValueChange={setBudgetRange}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-budget"><SelectValue placeholder="Budget" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Budgets</SelectItem>
            <SelectItem value="$50-$150">$50 – $150</SelectItem>
            <SelectItem value="$150-$300">$150 – $300</SelectItem>
            <SelectItem value="$300+">$300+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardListIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No tasks match your filters</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(task => (
            <Card key={task.id} className="hover:shadow-md transition-shadow" data-testid={`card-task-${task.id}`}>
              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm leading-snug">{task.title}</h3>
                  <Badge variant="secondary" className={`shrink-0 text-xs ${categoryColor(task.category)}`}>
                    <Tag className="w-3 h-3 mr-1" />{task.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />${task.budgetMin} – ${task.budgetMax}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <Button size="sm" onClick={() => { if (!user?.mobileVerified) { setShowMobileDialog(true); } else { applyMutation.mutate(task.id); } }} disabled={applyMutation.isPending} data-testid={`button-apply-${task.id}`}>
                  {applyMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Apply
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <MobileVerifyDialog open={showMobileDialog} onClose={() => setShowMobileDialog(false)} />
    </div>
  );
}

function ClipboardListIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
    </svg>
  );
}
