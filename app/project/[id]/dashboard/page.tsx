"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, Circle, Clock, BarChart3, Users, LayoutList } from "lucide-react";

export default function ProjectDashboard() {
  const params = useParams();
  const projectId = params.id as string;
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({ total: 0, pending: 0, done: 0, completionRate: 0 });
  const [deadline, setDeadline] = useState<any>(null);
  const [memberWorkload, setMemberWorkload] = useState<any[]>([]);

  useEffect(() => {
    if (projectId) fetchDashboardData();
  }, [projectId]);

  const fetchDashboardData = async () => {
    setLoading(true);

    // 1. Fetch team members
    const { data: team } = await supabase
      .from("project_members")
      .select("user_id, nickname, profiles(email)")
      .eq("project_id", projectId);

    // 2. Fetch Sprint Tasks
    const { data: sprintTasks } = await supabase
      .from("tasks")
      .select("id, status, assigned_to")
      .eq("project_id", projectId);

    // 3. Fetch Backlog Tasks
    const { data: backlogTasks } = await supabase
      .from("backlog_tasks")
      .select("id, status, assigned_to")
      .eq("project_id", projectId);

    // 4. Fetch nearest active sprint deadline
    const { data: activeSprint } = await supabase
      .from("sprints")
      .select("title, end_date")
      .eq("project_id", projectId)
      .eq("is_current", true)
      .single();

    if (activeSprint) setDeadline(activeSprint);

    // Compute KPIs
    const allTasks = [...(sprintTasks || []), ...(backlogTasks || [])];
    const total = allTasks.length;
    const done = allTasks.filter(t => t.status === "done").length;
    const pending = total - done;
    const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);

    setStats({ total, pending, done, completionRate });

    // Compute Member Workload
    if (team) {
      const workload = team.map(member => {
        const mTasks = allTasks.filter(t => t.assigned_to === member.user_id);
        const mDone = mTasks.filter(t => t.status === "done").length;
        return {
          name: member.nickname || (member.profiles as any)?.email || "Unknown",
          totalAssigned: mTasks.length,
          done: mDone,
          pending: mTasks.length - mDone,
          completion: mTasks.length === 0 ? 0 : Math.round((mDone / mTasks.length) * 100)
        };
      }).sort((a, b) => b.totalAssigned - a.totalAssigned); // Sort by highest workload
      
      setMemberWorkload(workload);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Project Overview</h1>
        <p className="text-sm text-foreground/60">High-level KPIs and team workload.</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-surface border border-border rounded-xl">
          <div className="flex items-center gap-3 text-foreground/60 mb-2">
            <LayoutList size={18} />
            <h3 className="text-sm font-medium">Total Tasks</h3>
          </div>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        
        <div className="p-6 bg-surface border border-border rounded-xl">
          <div className="flex items-center gap-3 text-orange-500 mb-2">
            <Circle size={18} />
            <h3 className="text-sm font-medium">Pending Tasks</h3>
          </div>
          <p className="text-3xl font-bold">{stats.pending}</p>
        </div>

        <div className="p-6 bg-surface border border-border rounded-xl">
          <div className="flex items-center gap-3 text-green-500 mb-2">
            <CheckCircle2 size={18} />
            <h3 className="text-sm font-medium">Done</h3>
          </div>
          <p className="text-3xl font-bold">{stats.done}</p>
        </div>

        <div className="p-6 bg-surface border border-border rounded-xl">
          <div className="flex items-center gap-3 text-accent mb-2">
            <Clock size={18} />
            <h3 className="text-sm font-medium">Nearest Deadline</h3>
          </div>
          <p className="text-lg font-bold truncate">
            {deadline ? new Date(deadline.end_date).toLocaleDateString() : "No Active Sprint"}
          </p>
          {deadline && <p className="text-xs text-foreground/50 truncate">{deadline.title}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* COMPLETION GRAPH */}
        <div className="p-6 border border-border rounded-xl bg-background shadow-sm">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
            <BarChart3 size={20} className="text-accent" /> Project Completion
          </h2>
          <div className="flex items-end justify-center h-40 mb-4 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-extrabold text-foreground/20">{stats.completionRate}%</span>
            </div>
            {/* Visual Progress Bar */}
            <div className="w-full h-8 bg-surface rounded-full overflow-hidden border border-border relative z-10 opacity-90">
              <div 
                className="h-full bg-accent transition-all duration-1000 ease-out" 
                style={{ width: `${stats.completionRate}%` }} 
              />
            </div>
          </div>
          <p className="text-center text-sm text-foreground/60">
            {stats.done} of {stats.total} tasks completed across the entire project.
          </p>
        </div>

        {/* TEAM WORKLOAD */}
        <div className="p-6 border border-border rounded-xl bg-background shadow-sm h-80 flex flex-col">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Users size={20} className="text-accent" /> Member Workload
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {memberWorkload.length === 0 ? (
              <p className="text-foreground/50 text-sm">No members found.</p>
            ) : (
              memberWorkload.map((m, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium truncate pr-4">{m.name}</span>
                    <span className="text-foreground/60 whitespace-nowrap">{m.done} / {m.totalAssigned} tasks</span>
                  </div>
                  <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-border/50">
                    <div 
                      className={`h-full ${m.completion === 100 ? 'bg-green-500' : 'bg-accent'}`} 
                      style={{ width: `${m.completion}%` }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}