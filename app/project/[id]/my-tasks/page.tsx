"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { CheckCircle2, Circle, AlertCircle, Copy } from "lucide-react";

export default function MyTasksPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [sprintTasks, setSprintTasks] = useState<any[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (projectId) fetchMyTasks();
  }, [projectId]);

  const fetchMyTasks = async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data: sTasks } = await supabase
      .from("tasks")
      .select("*, sprints(title)")
      .eq("project_id", projectId)
      .eq("assigned_to", userData.user.id)
      .order("created_at", { ascending: false });

    const { data: bTasks } = await supabase
      .from("backlog_tasks")
      .select("*")
      .eq("project_id", projectId)
      .eq("assigned_to", userData.user.id)
      .order("created_at", { ascending: false });

    if (sTasks) setSprintTasks(sTasks);
    if (bTasks) setBacklogTasks(bTasks);

    setLoading(false);
  };

  const updateStatus = async (taskId: string, newStatus: string, table: "tasks" | "backlog_tasks") => {
    // Optimistic UI Update
    if (table === "tasks") {
      setSprintTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } else {
      setBacklogTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    }

    const { error } = await supabase
      .from(table)
      .update({
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null
      })
      .eq("id", taskId);
      
    if (error) {
      alert("Failed to update status: " + error.message);
      fetchMyTasks(); // Revert on failure
    }
  };

  const handleCopyBacklog = () => {
    if (backlogTasks.length === 0) return;
    const text = backlogTasks.map(t => `- [${t.priority.toUpperCase()}] ${t.title} (${t.status})`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-foreground bg-surface border-border';
    }
  };

  const TaskCard = ({ task, table, sprintName }: { task: any, table: "tasks" | "backlog_tasks", sprintName?: string }) => {
    const isDone = task.status === 'done';

    return (
      <div className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${isDone ? 'bg-surface/50 border-border/50 text-foreground/50' : 'bg-background border-border shadow-sm'}`}>
        {/* Content Section */}
        <div className="flex flex-col flex-1 min-w-0 w-full">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-[10px] whitespace-nowrap uppercase font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            <span 
              className="text-[10px] bg-surface border border-border px-2 py-0.5 rounded-full text-foreground/60 uppercase font-medium truncate max-w-full"
              title={table === "tasks" ? `Sprint: ${sprintName || 'Unknown'}` : 'Backlog'}
            >
              {table === "tasks" ? `Sprint: ${sprintName || 'Unknown'}` : 'Backlog'}
            </span>
          </div>
          <h3 className={`font-semibold text-sm break-words ${isDone ? 'line-through text-foreground/50' : 'text-foreground'}`}>
            {task.title}
          </h3>
        </div>

        {/* Actions Section */}
        <div className="flex items-center justify-between border-t border-border pt-3 mt-1 sm:border-none sm:pt-0 sm:mt-0 sm:justify-end w-full sm:w-auto gap-4">
          <select
            value={task.status}
            onChange={(e) => updateStatus(task.id, e.target.value, table)}
            className="text-xs p-1.5 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent w-full sm:w-auto"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <button 
            onClick={() => updateStatus(task.id, isDone ? 'todo' : 'done', table)} 
            className="flex-shrink-0"
            title="Toggle Status"
          >
            {isDone ? (
              <CheckCircle2 size={24} className="text-accent" />
            ) : (
              <Circle size={24} className="text-foreground/20 hover:text-accent transition-colors" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
        <p className="text-sm text-foreground/60 mt-1">Manage your assigned workload across active sprints and the backlog.</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-foreground/50">Loading your tasks...</div>
      ) : sprintTasks.length === 0 && backlogTasks.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
          <AlertCircle className="mx-auto w-12 h-12 text-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">You have no assigned tasks</h3>
          <p className="text-foreground/60 text-sm px-4">Kick back and relax, or ask the Project Manager for some work!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="font-bold text-lg flex items-center justify-between border-b border-border pb-2">
              Active Sprints
              <span className="bg-accent/10 text-accent text-xs px-2 py-1 rounded-full">{sprintTasks.length}</span>
            </h2>
            <div className="space-y-3">
              {sprintTasks.length === 0 ? (
                <p className="text-sm text-foreground/40 italic">No sprint tasks assigned to you.</p>
              ) : (
                sprintTasks.map(task => (
                  <TaskCard key={task.id} task={task} table="tasks" sprintName={task.sprints?.title} />
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-bold text-lg flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                Backlog
                <span className="bg-surface text-foreground/60 border border-border text-xs px-2 py-1 rounded-full">{backlogTasks.length}</span>
              </div>
              <button 
                onClick={handleCopyBacklog} 
                className="flex items-center gap-1.5 text-xs bg-surface hover:bg-border transition-colors px-2.5 py-1.5 rounded-md text-foreground/70 border border-border shadow-sm"
              >
                {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Tasks"}
              </button>
            </h2>
            <div className="space-y-3">
              {backlogTasks.length === 0 ? (
                <p className="text-sm text-foreground/40 italic">No backlog tasks assigned to you.</p>
              ) : (
                backlogTasks.map(task => (
                  <TaskCard key={task.id} task={task} table="backlog_tasks" />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}