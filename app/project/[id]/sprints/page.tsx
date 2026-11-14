"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { Plus, CheckCircle2, Circle, Clock, Filter, Search, Trash2, Edit } from "lucide-react";

export default function SprintsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [sprints, setSprints] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSprint, setNewSprint] = useState({ title: "", description: "", start_date: "", end_date: "" });
  const [newTasks, setNewTasks] = useState([{ title: "", assigned_to: "" }]);

  // Edit Modal State
  const [editingSprint, setEditingSprint] = useState<any>(null);
  const [editingSprintTasks, setEditingSprintTasks] = useState<any[]>([]);
  const [tasksToDelete, setTasksToDelete] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  const isPM = currentUserRole === "Project Manager";

  useEffect(() => {
    if (projectId) {
      fetchSprintsAndTeam();
    }
  }, [projectId]);

  const fetchSprintsAndTeam = async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    const { data: teamData } = await supabase
      .from("project_members")
      .select("id, nickname, role, user_id, profiles(email)")
      .eq("project_id", projectId);

    if (teamData) {
      setTeamMembers(teamData);
      if (userData?.user) {
        const me = teamData.find((m) => m.user_id === userData.user.id);
        if (me) setCurrentUserRole(me.role);
      }
    }

    const { data: sprintsData, error } = await supabase
      .from("sprints")
      .select(`*, tasks (*)`)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching sprints:", error);
    if (sprintsData) {
      const normalized = sprintsData.map((s) => ({
        ...s,
        tasks: (s.tasks || []).slice().sort(
          (a: any, b: any) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      }));
      setSprints(normalized);
    }
    setLoading(false);
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPM) return;
    setCreating(true);

    try {
      const { data: sprint, error: sprintError } = await supabase
        .from("sprints")
        .insert([{
          project_id: projectId,
          title: newSprint.title,
          description: newSprint.description,
          start_date: newSprint.start_date || null,
          end_date: newSprint.end_date,
          is_current: true
        }])
        .select()
        .single();

      if (sprintError) throw sprintError;

      const validTasks = newTasks.filter((t) => t.title.trim() !== "");
      if (validTasks.length > 0 && sprint) {
        const tasksToInsert = validTasks.map((t) => ({
          project_id: projectId,
          sprint_id: sprint.id,
          title: t.title,
          assigned_to: t.assigned_to || null,
          status: "todo",
          priority: "medium"
        }));

        const { error: tasksError } = await supabase.from("tasks").insert(tasksToInsert);
        if (tasksError) throw tasksError;
      }

      setNewSprint({ title: "", description: "", start_date: "", end_date: "" });
      setNewTasks([{ title: "", assigned_to: "" }]);
      setShowCreateModal(false);
      fetchSprintsAndTeam();
    } catch (err: any) {
      if (err.message?.includes("start_date")) {
        alert("Database Error: You are missing the 'start_date' column. Please run this in Supabase SQL Editor: ALTER TABLE public.sprints ADD COLUMN start_date date;");
      } else {
        alert(`Creation failed: ${err.message}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const openEditSprintModal = (sprint: any) => {
    if (!isPM) return;
    setEditingSprint({
      ...sprint,
      start_date: sprint.start_date ? sprint.start_date.split("T")[0] : "",
      end_date: sprint.end_date ? sprint.end_date.split("T")[0] : ""
    });

    const tasksCopy = sprint.tasks ? sprint.tasks.map((t: any) => ({ ...t })) : [];
    setEditingSprintTasks(tasksCopy);
    setTasksToDelete([]);
  };

  const handleUpdateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPM) return;
    setUpdating(true);

    try {
      const { error: sprintError } = await supabase
        .from("sprints")
        .update({
          title: editingSprint.title,
          description: editingSprint.description,
          start_date: editingSprint.start_date || null,
          end_date: editingSprint.end_date,
          is_current: editingSprint.is_current
        })
        .eq("id", editingSprint.id);

      if (sprintError) throw sprintError;

      if (tasksToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("tasks")
          .delete()
          .in("id", tasksToDelete);
        if (deleteError) throw deleteError;
      }

      const validTasks = editingSprintTasks.filter((t) => t.title.trim() !== "");
      const existingTasks = validTasks.filter((t) => t.id);
      const addedTasks = validTasks.filter((t) => !t.id);

      for (const task of existingTasks) {
        const { error: updateError } = await supabase
          .from("tasks")
          .update({
            title: task.title,
            assigned_to: task.assigned_to || null
          })
          .eq("id", task.id);
        if (updateError) throw updateError;
      }

      if (addedTasks.length > 0) {
        const tasksToInsert = addedTasks.map((t) => ({
          project_id: projectId,
          sprint_id: editingSprint.id,
          title: t.title,
          assigned_to: t.assigned_to || null,
          status: "todo",
          priority: "medium"
        }));

        const { error: insertError } = await supabase.from("tasks").insert(tasksToInsert);
        if (insertError) throw insertError;
      }

      setEditingSprint(null);
      setEditingSprintTasks([]);
      fetchSprintsAndTeam();
    } catch (err: any) {
      if (err.message?.includes("start_date")) {
        alert("Database Error: You are missing the 'start_date' column. Please run this in Supabase SQL Editor: ALTER TABLE public.sprints ADD COLUMN start_date date;");
      } else {
        alert(`Update failed: ${err.message}`);
      }
    } finally {
      setUpdating(false);
    }
  };

  const removeEditingTask = (index: number) => {
    const taskToRemove = editingSprintTasks[index];
    if (taskToRemove.id) {
      setTasksToDelete((prev) => [...prev, taskToRemove.id]);
    }
    setEditingSprintTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!isPM) return;

    setSprints((currentSprints) =>
      currentSprints.map((s) => ({
        ...s,
        tasks: s.tasks.map((t: any) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      }))
    );

    const { error } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
        completed_at: newStatus === "done" ? new Date().toISOString() : null
      })
      .eq("id", taskId);

    if (error) {
      console.error("Failed to update status:", error);
      fetchSprintsAndTeam();
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    if (!isPM) return;
    const newStatus = currentStatus === "done" ? "todo" : "done";
    await handleStatusChange(taskId, newStatus);
  };

  const handleAssigneeChange = async (taskId: string, newAssignee: string) => {
    if (!isPM) return;
    try {
      setSprints((currentSprints) =>
        currentSprints.map((s) => ({
          ...s,
          tasks: s.tasks.map((t: any) =>
            t.id === taskId ? { ...t, assigned_to: newAssignee || null } : t
          )
        }))
      );
      await supabase.from("tasks").update({ assigned_to: newAssignee || null }).eq("id", taskId);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!isPM) return;
    if (!confirm("Are you sure you want to delete this sprint? All tasks inside will be permanently deleted.")) return;

    const { error } = await supabase.from("sprints").delete().eq("id", sprintId);
    if (!error) {
      setSprints((prev) => prev.filter((s) => s.id !== sprintId));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return {
          label: "Done",
          classes: "bg-green-500/10 text-green-500 border-green-500/20"
        };
      case "in_progress":
        return {
          label: "In Progress",
          classes: "bg-blue-500/10 text-blue-500 border-blue-500/20"
        };
      case "todo":
      default:
        return {
          label: "To Do",
          classes: "bg-foreground/10 text-foreground/70 border-border"
        };
    }
  };

  const renderStatusIcon = (status: string, interactive: boolean) => {
    if (status === "done") {
      return <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />;
    }
    if (status === "in_progress") {
      return <Clock size={18} className="text-blue-500 flex-shrink-0" />;
    }
    return (
      <Circle
        size={18}
        className={`text-foreground/40 flex-shrink-0 ${
          interactive ? "hover:text-accent transition-colors" : ""
        }`}
      />
    );
  };

  const filteredSprints = sprints.filter((sprint) =>
    sprint.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Sprints</h1>
          <p className="text-sm text-foreground/60 mt-1">
            {isPM
              ? "Newsfeed of your team's ongoing and past sprints."
              : "Read-only overview of your team's ongoing and past sprints."}
          </p>
        </div>
        {isPM && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md transition-colors text-sm font-medium shadow-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline">New Sprint</span>
          </button>
        )}
      </div>

      <div className="mb-8">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors mb-4"
        >
          <Filter size={16} />
          {showFilters ? "Hide Filters" : "See Filters"}
        </button>

        {showFilters && (
          <div className="flex gap-4 p-4 bg-surface border border-border rounded-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/40" />
              <input
                type="text"
                placeholder="Search sprints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-8 pb-12">
        {loading ? (
          <div className="text-center py-10 text-foreground/50">Loading sprints...</div>
        ) : filteredSprints.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
            <h3 className="text-lg font-medium mb-2">No sprints yet</h3>
            <p className="text-foreground/60 text-sm">Plan your first sprint to start executing tasks.</p>
          </div>
        ) : (
          filteredSprints.map((sprint) => (
            <div
              key={sprint.id}
              className={`p-4 sm:p-6 border rounded-xl shadow-sm transition-all duration-300 relative group ${
                !sprint.is_current
                  ? "bg-surface/50 border-border/50 opacity-60 grayscale hover:grayscale-0"
                  : "bg-background border-border border-l-4 border-l-accent"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold mb-1 pr-2">{sprint.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60 font-medium">
                    <Clock size={14} />
                    <span>
                      {sprint.start_date ? `${new Date(sprint.start_date).toLocaleDateString()} - ` : ""}
                      {new Date(sprint.end_date).toLocaleDateString()}
                    </span>
                    {sprint.is_current && (
                      <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent uppercase tracking-wider text-[10px] font-bold">
                        Active Sprint
                      </span>
                    )}
                  </div>
                </div>

                {isPM && (
                  <div className="flex items-center gap-1 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditSprintModal(sprint)}
                      className="p-2 text-foreground/50 hover:text-accent hover:bg-accent/10 rounded-md transition-colors"
                      title="Edit Sprint & Tasks"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteSprint(sprint.id)}
                      className="p-2 text-foreground/50 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                      title="Delete Sprint"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="text-sm text-foreground/80 mb-6 whitespace-pre-wrap bg-surface p-4 rounded-md border border-border/50">
                {sprint.description || "No description provided."}
              </div>

              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-bold text-foreground/70 uppercase tracking-wider mb-3">
                  Sprint Tasks
                </h4>
                {sprint.tasks?.map((task: any) => {
                  const isDone = task.status === "done";
                  const statusBadge = getStatusBadge(task.status);
                  const assignedMember = teamMembers.find((m) => m.user_id === task.assigned_to);
                  const memberEmail =
                    (assignedMember?.profiles as any)?.email ||
                    (assignedMember?.profiles as any[])?.[0]?.email;

                  return (
                    <div
                      key={task.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md border group/task gap-3 sm:gap-4 ${
                        isDone
                          ? "bg-surface/50 border-border/50 text-foreground/50"
                          : "bg-background border-border shadow-sm"
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto min-w-0">
                        {isPM ? (
                          <button
                            type="button"
                            onClick={() => toggleTaskStatus(task.id, task.status)}
                            className="mt-0.5 sm:mt-0 cursor-pointer"
                            title="Toggle Done"
                          >
                            {renderStatusIcon(task.status, true)}
                          </button>
                        ) : (
                          <span className="mt-0.5 sm:mt-0" title={statusBadge.label}>
                            {renderStatusIcon(task.status, false)}
                          </span>
                        )}
                        <span className={`text-sm break-words ${isDone ? "line-through" : ""}`}>
                          {task.title}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 self-end sm:self-auto w-full sm:w-auto pl-7 sm:pl-0 border-t sm:border-none border-border pt-3 sm:pt-0 flex-shrink-0">
                        {isPM ? (
                          <select
                            value={task.status || "todo"}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className={`text-[11px] font-semibold px-2 py-1 rounded-md border focus:outline-none focus:border-accent cursor-pointer ${statusBadge.classes}`}
                          >
                            <option value="todo" className="bg-background text-foreground">To Do</option>
                            <option value="in_progress" className="bg-background text-foreground">In Progress</option>
                            <option value="done" className="bg-background text-foreground">Done</option>
                          </select>
                        ) : (
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${statusBadge.classes}`}
                          >
                            {statusBadge.label}
                          </span>
                        )}

                        {isPM ? (
                          <select
                            value={task.assigned_to || ""}
                            onChange={(e) => handleAssigneeChange(task.id, e.target.value)}
                            className="text-xs px-2 py-1 bg-surface border border-border rounded-md text-foreground/70 focus:outline-none focus:border-accent cursor-pointer max-w-[150px]"
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map((m) => {
                              const email =
                                (m.profiles as any)?.email || (m.profiles as any[])?.[0]?.email;
                              return (
                                <option key={m.user_id} value={m.user_id}>
                                  {m.nickname || email}
                                </option>
                              );
                            })}
                          </select>
                        ) : task.assigned_to ? (
                          <div
                            className="text-[11px] px-2 py-1 bg-surface border border-border rounded-md text-foreground/60 truncate max-w-[140px]"
                            title={memberEmail || "Assigned Member"}
                          >
                            {assignedMember?.nickname || memberEmail || "Unknown"}
                          </div>
                        ) : (
                          <div className="text-[11px] px-2 py-1 bg-surface border border-border rounded-md text-foreground/40 italic">
                            Unassigned
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {sprint.tasks?.length === 0 && (
                  <p className="text-sm text-foreground/40 italic px-2">No tasks assigned to this sprint.</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isPM && showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-2xl shadow-lg my-8 max-h-[90vh] flex flex-col">
            <h2 className="text-xl font-bold mb-6 flex-shrink-0">Plan New Sprint</h2>
            <form onSubmit={handleCreateSprint} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto custom-scrollbar pr-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Sprint Title</label>
                    <input type="text" required value={newSprint.title} onChange={(e) => setNewSprint({ ...newSprint, title: e.target.value })} className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:border-accent" placeholder="e.g. Beta Release Sprint" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1 flex justify-between">
                      <span>Description</span><span className="text-xs text-foreground/50 font-normal">Markdown Supported</span>
                    </label>
                    <textarea required value={newSprint.description} onChange={(e) => setNewSprint({ ...newSprint, description: e.target.value })} className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:border-accent resize-none h-24" placeholder="## Goals&#10;- Implement Auth" />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input type="date" required value={newSprint.start_date} onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })} className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:border-accent" />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input type="date" required value={newSprint.end_date} onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })} className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:border-accent" />
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium">Sprint Tasks</label>
                    <button type="button" onClick={() => setNewTasks([...newTasks, { title: "", assigned_to: "" }])} className="text-xs text-accent hover:underline flex items-center gap-1"><Plus size={12} /> Add Task</button>
                  </div>
                  <div className="space-y-3">
                    {newTasks.map((task, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <input type="text" placeholder="Task title..." value={task.title} onChange={(e) => { const updated = [...newTasks]; updated[index].title = e.target.value; setNewTasks(updated); }} className="flex-1 p-2 border border-border rounded-md bg-surface focus:outline-none focus:border-accent text-sm" />
                        <div className="flex gap-2 w-full sm:w-auto">
                          <select value={task.assigned_to} onChange={(e) => { const updated = [...newTasks]; updated[index].assigned_to = e.target.value; setNewTasks(updated); }} className="flex-1 sm:w-40 p-2 border border-border rounded-md bg-surface focus:outline-none focus:border-accent text-sm">
                            <option value="">Unassigned</option>
                            {teamMembers.map((m) => <option key={m.user_id} value={m.user_id}>{m.nickname || m.profiles?.email}</option>)}
                          </select>
                          <button type="button" onClick={() => setNewTasks(newTasks.filter((_, i) => i !== index))} className="p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border flex-shrink-0">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface border border-transparent hover:border-border rounded-md transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50 shadow-sm">{creating ? "Posting..." : "Create Sprint"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPM && editingSprint && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-2xl shadow-lg my-8 max-h-[90vh] flex flex-col">
            <h2 className="text-xl font-bold mb-6 flex-shrink-0">Edit Sprint Details</h2>
            <form onSubmit={handleUpdateSprint} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto custom-scrollbar pr-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Sprint Title</label>
                    <input type="text" required value={editingSprint.title} onChange={(e) => setEditingSprint({ ...editingSprint, title: e.target.value })} className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:border-accent" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1 flex justify-between">
                      <span>Description</span><span className="text-xs text-foreground/50 font-normal">Markdown Supported</span>
                    </label>
                    <textarea required value={editingSprint.description} onChange={(e) => setEditingSprint({ ...editingSprint, description: e.target.value })} className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:border-accent resize-none h-24" />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input type="date" required value={editingSprint.start_date || ""} onChange={(e) => setEditingSprint({ ...editingSprint, start_date: e.target.value })} className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:border-accent" />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input type="date" required value={editingSprint.end_date || ""} onChange={(e) => setEditingSprint({ ...editingSprint, end_date: e.target.value })} className="w-full p-2 border border-border rounded-md bg-surface focus:outline-none focus:border-accent" />
                  </div>

                  <div className="col-span-2 flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingSprint.is_current}
                        onChange={(e) => setEditingSprint({ ...editingSprint, is_current: e.target.checked })}
                        className="w-4 h-4 accent-accent"
                      />
                      <span className="text-sm font-medium">Mark as Active Sprint</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium">Sprint Tasks</label>
                    <button type="button" onClick={() => setEditingSprintTasks([...editingSprintTasks, { title: "", assigned_to: "" }])} className="text-xs text-accent hover:underline flex items-center gap-1"><Plus size={12} /> Add Task</button>
                  </div>
                  <div className="space-y-3">
                    {editingSprintTasks.map((task, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <input
                          type="text"
                          placeholder="Task title..."
                          value={task.title}
                          onChange={(e) => {
                            const updated = [...editingSprintTasks];
                            updated[index].title = e.target.value;
                            setEditingSprintTasks(updated);
                          }}
                          className="flex-1 p-2 border border-border rounded-md bg-surface focus:outline-none focus:border-accent text-sm"
                        />
                        <div className="flex gap-2 w-full sm:w-auto">
                          <select
                            value={task.assigned_to || ""}
                            onChange={(e) => {
                              const updated = [...editingSprintTasks];
                              updated[index].assigned_to = e.target.value;
                              setEditingSprintTasks(updated);
                            }}
                            className="flex-1 sm:w-40 p-2 border border-border rounded-md bg-surface focus:outline-none focus:border-accent text-sm"
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map((m) => <option key={m.user_id} value={m.user_id}>{m.nickname || m.profiles?.email}</option>)}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeEditingTask(index)}
                            className="p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {editingSprintTasks.length === 0 && (
                      <p className="text-sm text-foreground/40 italic">No tasks. Click &quot;Add Task&quot; to create one.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border flex-shrink-0">
                <button type="button" onClick={() => setEditingSprint(null)} className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface border border-transparent hover:border-border rounded-md transition-colors">Cancel</button>
                <button type="submit" disabled={updating} className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50 shadow-sm">{updating ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}