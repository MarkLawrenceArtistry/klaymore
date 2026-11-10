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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSprint, setNewSprint] = useState({ title: "", description: "", start_date: "", end_date: "" });
  const [newTasks, setNewTasks] = useState([{ title: "", assigned_to: "" }]);

  const [editingSprint, setEditingSprint] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

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
        const me = teamData.find(m => m.user_id === userData.user.id);
        if (me) setCurrentUserRole(me.role);
      }
    }

    const { data: sprintsData, error } = await supabase
      .from("sprints")
      .select(`*, tasks (*)`)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching sprints:", error);
    if (sprintsData) setSprints(sprintsData);
    setLoading(false);
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

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
      .select().single();

    if (sprint && !sprintError) {
      const validTasks = newTasks.filter(t => t.title.trim() !== "");
      if (validTasks.length > 0) {
        const tasksToInsert = validTasks.map(t => ({
          project_id: projectId,
          sprint_id: sprint.id,
          title: t.title,
          assigned_to: t.assigned_to || null,
          status: 'todo',
          priority: 'medium'
        }));
        await supabase.from("tasks").insert(tasksToInsert);
      }

      setNewSprint({ title: "", description: "", start_date: "", end_date: "" });
      setNewTasks([{ title: "", assigned_to: "" }]);
      setShowCreateModal(false);
      fetchSprintsAndTeam();
    }
    setCreating(false);
  };

  const handleUpdateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    const { error } = await supabase
      .from("sprints")
      .update({
        title: editingSprint.title,
        description: editingSprint.description,
        start_date: editingSprint.start_date || null,
        end_date: editingSprint.end_date,
        is_current: editingSprint.is_current
      })
      .eq("id", editingSprint.id);

    if (!error) {
      setEditingSprint(null);
      fetchSprintsAndTeam();
    }
    setUpdating(false);
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';

    setSprints(currentSprints =>
      currentSprints.map(s => ({
        ...s,
        tasks: s.tasks.map((t: any) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      }))
    );

    await supabase
      .from("tasks")
      .update({
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null
      })
      .eq("id", taskId);
  };

  const handleAssigneeChange = async (taskId: string, newAssignee: string) => {
    setSprints(currentSprints =>
      currentSprints.map(s => ({
        ...s,
        tasks: s.tasks.map((t: any) =>
          t.id === taskId ? { ...t, assigned_to: newAssignee || null } : t
        )
      }))
    );

    await supabase
      .from("tasks")
      .update({ assigned_to: newAssignee || null })
      .eq("id", taskId);
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!confirm("Are you sure you want to delete this sprint? All tasks inside will be permanently deleted.")) return;

    const { error } = await supabase.from("sprints").delete().eq("id", sprintId);
    if (!error) {
      setSprints(prev => prev.filter(s => s.id !== sprintId));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (!error) {
      setSprints(prev => prev.map(s => ({
        ...s,
        tasks: s.tasks.filter((t: any) => t.id !== taskId)
      })));
    }
  };

  const filteredSprints = sprints.filter(sprint =>
    sprint.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Sprints</h1>
          <p className="text-sm text-foreground/60">Newsfeed of your team's ongoing and past sprints.</p>
        </div>
        {currentUserRole === 'Project Manager' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
          >
            <Plus size={16} /> New Sprint
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
              className={`p-6 border rounded-xl shadow-sm transition-all duration-300 relative group ${
                !sprint.is_current
                  ? 'bg-surface/50 border-border/50 opacity-60 grayscale hover:grayscale-0'
                  : 'bg-background border-border border-l-4 border-l-accent'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">{sprint.title}</h2>
                  <div className="flex items-center gap-2 text-xs text-foreground/60 font-medium">
                    <Clock size={14} />
                    <span>
                      {sprint.start_date ? `${new Date(sprint.start_date).toLocaleDateString()} - ` : ''} 
                      {new Date(sprint.end_date).toLocaleDateString()}
                    </span>
                    {sprint.is_current && (
                       <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent uppercase tracking-wider text-[10px] font-bold">
                         Active Sprint
                       </span>
                    )}
                  </div>
                </div>

                {currentUserRole === 'Project Manager' && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingSprint(sprint)}
                      className="p-2 text-foreground/50 hover:text-accent hover:bg-accent/10 rounded-md transition-colors"
                      title="Edit Sprint"
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
                <h4 className="text-sm font-bold text-foreground/70 uppercase tracking-wider mb-3">Sprint Tasks</h4>
                {sprint.tasks?.map((task: any) => {
                  const isDone = task.status === 'done';
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-3 rounded-md border group/task ${isDone ? 'bg-surface/50 border-border/50 text-foreground/50' : 'bg-background border-border'}`}
                    >
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleTaskStatus(task.id, task.status)}>
                          {isDone ? (
                            <CheckCircle2 size={18} className="text-accent" />
                          ) : (
                            <Circle size={18} className="text-foreground/40 hover:text-accent transition-colors" />
                          )}
                        </button>
                        <span className={`text-sm ${isDone ? 'line-through' : ''}`}>
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {currentUserRole === 'Project Manager' ? (
                          <select
                            value={task.assigned_to || ""}
                            onChange={(e) => handleAssigneeChange(task.id, e.target.value)}
                            className="text-xs px-2 py-1 bg-surface border border-border rounded-md text-foreground/60 focus:outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map(m => (
                              <option key={m.user_id} value={m.user_id}>
                                {m.nickname || m.profiles?.email}
                              </option>
                            ))}
                          </select>
                        ) : task.assigned_to ? (
                          <div className="text-xs px-2 py-1 bg-surface border border-border rounded-md text-foreground/60">
                            {teamMembers.find(m => m.user_id === task.assigned_to)?.nickname ||
                             teamMembers.find(m => m.user_id === task.assigned_to)?.profiles?.email ||
                             "Unknown"}
                          </div>
                        ) : (
                          <div className="text-xs px-2 py-1 bg-surface border border-border rounded-md text-foreground/40 italic">
                            Unassigned
                          </div>
                        )}
                        
                        {currentUserRole === 'Project Manager' && (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-foreground/40 hover:text-red-500 opacity-0 group-hover/task:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {sprint.tasks?.length === 0 && (
                  <p className="text-sm text-foreground/40 italic">No tasks assigned to this sprint.</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-2xl shadow-lg my-8">
            <h2 className="text-xl font-bold mb-6">Plan New Sprint</h2>
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Sprint Title</label>
                  <input type="text" required value={newSprint.title} onChange={(e) => setNewSprint({ ...newSprint, title: e.target.value })} className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent" placeholder="e.g. Beta Release Sprint" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 flex justify-between">
                    <span>Description</span><span className="text-xs text-foreground/50 font-normal">Markdown Supported</span>
                  </label>
                  <textarea required value={newSprint.description} onChange={(e) => setNewSprint({ ...newSprint, description: e.target.value })} className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent resize-none h-32" placeholder="## Goals&#10;- Implement Auth&#10;- Setup DB" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input type="date" required value={newSprint.start_date} onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })} className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input type="date" required value={newSprint.end_date} onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })} className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent" />
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-border">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium">Sprint Tasks</label>
                  <button type="button" onClick={() => setNewTasks([...newTasks, { title: "", assigned_to: "" }])} className="text-xs text-accent hover:underline flex items-center gap-1"><Plus size={12} /> Add Task</button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {newTasks.map((task, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <input type="text" placeholder="Task title..." value={task.title} onChange={(e) => { const updated = [...newTasks]; updated[index].title = e.target.value; setNewTasks(updated); }} className="flex-1 p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent text-sm" />
                      <select value={task.assigned_to} onChange={(e) => { const updated = [...newTasks]; updated[index].assigned_to = e.target.value; setNewTasks(updated); }} className="w-40 p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent text-sm">
                        <option value="">Unassigned</option>
                        {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.nickname || m.profiles?.email}</option>)}
                      </select>
                      <button type="button" onClick={() => setNewTasks(newTasks.filter((_, i) => i !== index))} className="p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface border border-transparent hover:border-border rounded-md transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50">{creating ? "Posting..." : "Create Sprint"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingSprint && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-2xl shadow-lg my-8">
            <h2 className="text-xl font-bold mb-6">Edit Sprint</h2>
            <form onSubmit={handleUpdateSprint} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Sprint Title</label>
                  <input type="text" required value={editingSprint.title} onChange={(e) => setEditingSprint({ ...editingSprint, title: e.target.value })} className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 flex justify-between">
                    <span>Description</span><span className="text-xs text-foreground/50 font-normal">Markdown Supported</span>
                  </label>
                  <textarea required value={editingSprint.description} onChange={(e) => setEditingSprint({ ...editingSprint, description: e.target.value })} className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent resize-none h-32" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input type="date" required value={editingSprint.start_date || ""} onChange={(e) => setEditingSprint({ ...editingSprint, start_date: e.target.value })} className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input type="date" required value={editingSprint.end_date || ""} onChange={(e) => setEditingSprint({ ...editingSprint, end_date: e.target.value })} className="w-full p-2 border border-border rounded-md bg-input-bg focus:outline-none focus:border-accent" />
                </div>

                <div className="col-span-2 md:col-span-1 flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingSprint.is_current}
                      onChange={(e) => setEditingSprint({...editingSprint, is_current: e.target.checked})}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="text-sm font-medium">Mark as Active Sprint</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
                <button type="button" onClick={() => setEditingSprint(null)} className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface border border-transparent hover:border-border rounded-md transition-colors">Cancel</button>
                <button type="submit" disabled={updating} className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50">{updating ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}