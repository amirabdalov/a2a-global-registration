import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, Calendar, DollarSign, Upload, Inbox } from "lucide-react";
import type { TaskApplication, Task } from "@shared/schema";

type AppWithTask = TaskApplication & { task?: Task };

export default function MyTasksPage() {
  const { data: applications = [], isLoading } = useQuery<AppWithTask[]>({ queryKey: ["/api/user/tasks"] });

  const active = applications.filter(a => a.status === "pending" || a.status === "active");
  const completed = applications.filter(a => a.status === "completed");
  const archived = applications.filter(a => a.status === "archived");

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "pending": return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">Pending</Badge>;
      case "active": return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">Active</Badge>;
      case "completed": return <Badge variant="secondary" className="bg-[#22C55E]/10 text-[#22C55E]">Completed</Badge>;
      case "archived": return <Badge variant="outline">Archived</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12 text-muted-foreground">
      <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p className="font-medium">{message}</p>
      <p className="text-sm mt-1">Applied tasks will appear here</p>
    </div>
  );

  const TaskList = ({ items }: { items: AppWithTask[] }) => (
    <div className="grid gap-3">
      {items.length === 0 ? <EmptyState message="No tasks here yet" /> : items.map(app => (
        <Card key={app.id} data-testid={`card-my-task-${app.id}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{app.task?.title || `Task #${app.taskId}`}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {app.task?.deadline ? new Date(app.task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {app.task ? `$${app.task.budgetMin} – $${app.task.budgetMax}` : "—"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(app.status)}
                {(app.status === "active" || app.status === "pending") && (
                  <Button size="sm" variant="outline" data-testid={`button-submit-deliverable-${app.id}`}>
                    <Upload className="w-3 h-3 mr-1" /> Submit
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full" data-testid="page-my-tasks">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="heading-my-tasks">
          <CheckSquare className="w-5 h-5 text-primary" /> My Tasks
        </h1>
        <p className="text-sm text-muted-foreground">Track your applied and active tasks</p>
      </div>

      <Tabs defaultValue="active">
        <TabsList data-testid="tabs-my-tasks">
          <TabsTrigger value="active" data-testid="tab-active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">Completed ({completed.length})</TabsTrigger>
          <TabsTrigger value="archived" data-testid="tab-archived">Archived ({archived.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active"><TaskList items={active} /></TabsContent>
        <TabsContent value="completed"><TaskList items={completed} /></TabsContent>
        <TabsContent value="archived"><TaskList items={archived} /></TabsContent>
      </Tabs>
    </div>
  );
}
