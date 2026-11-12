"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import {
  Plus,
  Filter,
  Search,
  Edit2,
  Trash2,
  GripVertical,
  AlertCircle,
  Eye,
  X,
  User,
  AlignLeft,
  Loader2,
} from "lucide-react";

export default function BacklogPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [tasks, setTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const initialTaskState = {
    id: "",
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    assigned_to: "",
  };
  const [formData, setFormData] = useState(initialTaskState);

  useEffect(() => {
    if (projectId) fetchBoardData();
  }, [projectId]);

  const fetchBoardData = async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    // Fetch Team
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

    const { data: tasksData, error } = await supabase
      .from("backlog_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (!error && tasksData) setTasks(tasksData);
    setLoading(false);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    setTimeout(() => {
      (e.target as HTMLElement).classList.add("opacity-50");
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove("opacity-50");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    await supabase
      .from("backlog_tasks")
      .update({
        status: newStatus,
        completed_at: newStatus === "done" ? new Date().toISOString() : null,
      })
      .eq("id", taskId);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewOnly) return;
    setSaving(true);

    const payload = {
      project_id: projectId,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      status: formData.status,
      assigned_to: formData.assigned_to || null,
    };

    if (isEditing) {
      const { error } = await supabase
        .from("backlog_tasks")
        .update(payload)
        .eq("id", formData.id);
      if (!error) fetchBoardData();
    } else {
      const { error } = await supabase.from("backlog_tasks").insert([payload]);
      if (!error) fetchBoardData();
    }

    setSaving(false);
    setShowModal(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task permanently?")) return;
    const { error } = await supabase.from("backlog_tasks").delete().eq("id", taskId);
    if (!error) setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const openModal = (task: any = null, viewOnly: boolean = false) => {
    setIsViewOnly(viewOnly);
    if (task) {
      setFormData({ ...task, assigned_to: task.assigned_to || "" });
      setIsEditing(true);
    } else {
      setFormData(initialTaskState);
      setIsEditing(false);
    }
    setShowModal(true);
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "low":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-border text-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return { label: "Done", color: "bg-green-500/10 text-green-500 border-green-500/20" };
      case "in_progress":
        return { label: "In Progress", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
      case "todo":
      default:
        return { label: "To Do", color: "bg-foreground/10 text-foreground/70 border-border" };
    }
  };

  const columns = [
    { id: "todo", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "done", title: "Done" },
  ];

  const modalAssignedMember = teamMembers.find((m) => m.user_id === formData.assigned_to);
  const modalMemberEmail =
    (modalAssignedMember?.profiles as any)?.email ||
    (modalAssignedMember?.profiles as any[])?.[0]?.email;
  const modalMemberDisplayName =
    modalAssignedMember?.nickname || modalMemberEmail || "Unassigned";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col min-h-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Backlog</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Kanban board for managing backlog tasks.
          </p>
        </div>
        {currentUserRole === "Project Manager" && (
          <button
            onClick={() => openModal(null, false)}
            className="flex w-full sm:w-auto justify-center items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md transition-colors text-sm font-medium shadow-sm"
          >
            <Plus size={16} /> New Task
          </button>
        )}
      </div>

      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors mb-4"
        >
          <Filter size={16} /> {showFilters ? "Hide Filters" : "See Filters"}
        </button>

        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-surface border border-border rounded-lg animate-in fade-in slide-in-from-top-2 shadow-sm">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/40"
              />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-background border border-border rounded-md text-sm px-3 py-2 focus:outline-none focus:border-accent w-full sm:w-48"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex lg:grid lg:grid-cols-3 gap-6 h-full min-w-[850px] lg:min-w-0">
          {loading ? (
            <div className="col-span-3 text-center py-10 text-foreground/50">
              Loading board...
            </div>
          ) : (
            columns.map((column) => (
              <div
                key={column.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
                className="bg-surface border border-border rounded-xl p-4 flex flex-col h-full overflow-hidden flex-1 w-full max-w-[350px] lg:max-w-none shadow-sm"
              >
                <div className="flex justify-between items-center mb-4 px-1">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-foreground/70">
                    {column.title}
                  </h3>
                  <span className="bg-background border border-border text-xs px-2 py-1 rounded-full font-medium">
                    {filteredTasks.filter((t) => t.status === column.id).length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {filteredTasks
                    .filter((t) => t.status === column.id)
                    .map((task) => {
                      const assignedMember = teamMembers.find(
                        (m) => m.user_id === task.assigned_to
                      );
                      const memberEmail =
                        (assignedMember?.profiles as any)?.email ||
                        (assignedMember?.profiles as any[])?.[0]?.email ||
                        "Unknown";

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          className="bg-background border border-border p-4 rounded-lg shadow-sm cursor-grab active:cursor-grabbing group hover:border-accent transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </div>
                            <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openModal(task, true)}
                                className="p-1 text-foreground/50 hover:text-accent rounded transition-colors bg-surface lg:bg-transparent"
                                title="View Info"
                              >
                                <Eye size={14} />
                              </button>
                              {currentUserRole === "Project Manager" && (
                                <>
                                  <button
                                    onClick={() => openModal(task, false)}
                                    className="p-1 text-foreground/50 hover:text-accent rounded transition-colors bg-surface lg:bg-transparent"
                                    title="Edit"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1 text-foreground/50 hover:text-red-500 rounded transition-colors bg-surface lg:bg-transparent"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <h4 className="font-semibold text-sm mb-1 break-words">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-foreground/60 line-clamp-2 mb-3 break-words">
                              {task.description}
                            </p>
                          )}

                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
                            <div className="items-center gap-1.5 text-xs text-foreground/50 font-medium hidden lg:flex">
                              <GripVertical size={12} /> Drag
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-foreground/50 font-medium lg:hidden">
                              <GripVertical size={12} /> Tap & Hold
                            </div>

                            {task.assigned_to ? (
                              <div
                                className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold border border-accent/30 flex-shrink-0"
                                title={memberEmail}
                              >
                                {assignedMember?.nickname?.[0]?.toUpperCase() || "U"}
                              </div>
                            ) : (
                              <div
                                className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-foreground/30 flex-shrink-0"
                                title="Unassigned"
                              >
                                <AlertCircle size={12} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-background border border-border rounded-2xl p-6 sm:p-7 w-full max-w-xl md:max-w-2xl shadow-2xl my-8 transition-all animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {isViewOnly ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getPriorityColor(
                          formData.priority
                        )}`}
                      >
                        {formData.priority} Priority
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          getStatusBadge(formData.status).color
                        }`}
                      >
                        {getStatusBadge(formData.status).label}
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-foreground break-words leading-snug">
                      {formData.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 text-foreground/50 hover:text-foreground hover:bg-surface rounded-lg transition-colors flex-shrink-0"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/60 mb-2.5">
                    <AlignLeft size={14} />
                    <span>Description</span>
                  </div>
                  <div className="bg-surface/70 border border-border rounded-xl p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto custom-scrollbar break-words">
                    {formData.description?.trim() ? (
                      formData.description
                    ) : (
                      <span className="text-foreground/40 italic">
                        No description provided for this task.
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="bg-surface/50 border border-border/80 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center font-bold text-sm border border-accent/20 flex-shrink-0">
                      {modalAssignedMember?.nickname?.[0]?.toUpperCase() ||
                        (modalMemberEmail ? modalMemberEmail[0]?.toUpperCase() : <User size={16} />)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-foreground/50">
                        Assignee
                      </p>
                      <p
                        className="text-sm font-medium text-foreground truncate"
                        title={modalMemberEmail || "Unassigned"}
                      >
                        {modalMemberDisplayName}
                      </p>
                    </div>
                  </div>

                  <div className="bg-surface/50 border border-border/80 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-foreground/50">
                        Status
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {getStatusBadge(formData.status).label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-foreground/50">
                        Priority
                      </p>
                      <p className="text-sm font-medium text-foreground capitalize">
                        {formData.priority}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  {currentUserRole === "Project Manager" && (
                    <button
                      type="button"
                      onClick={() => setIsViewOnly(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-surface hover:bg-border text-foreground border border-border rounded-lg transition-colors shadow-sm"
                    >
                      <Edit2 size={15} /> Edit Task
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors shadow-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveTask} className="space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isEditing ? "Edit Task" : "Create New Task"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="p-1.5 text-foreground/50 hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implement OAuth login with GitHub"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-lg bg-surface text-foreground text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-foreground">
                      Description
                    </label>
                    <span className="text-xs text-foreground/50 font-normal">
                      Detailed notes & requirements
                    </span>
                  </div>
                  <textarea
                    placeholder="Provide details, acceptance criteria, or links..."
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full p-3 border border-border rounded-lg bg-surface text-foreground text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-y min-h-[140px] max-h-80 leading-relaxed transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full p-2.5 border border-border rounded-lg bg-surface text-foreground text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className="w-full p-2.5 border border-border rounded-lg bg-surface text-foreground text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Assignee
                    </label>
                    <select
                      value={formData.assigned_to}
                      onChange={(e) =>
                        setFormData({ ...formData, assigned_to: e.target.value })
                      }
                      className="w-full p-2.5 border border-border rounded-lg bg-surface text-foreground text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((m) => {
                        const memberEmail =
                          (m.profiles as any)?.email || (m.profiles as any[])?.[0]?.email;
                        return (
                          <option key={m.user_id} value={m.user_id}>
                            {m.nickname || memberEmail}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface border border-border rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Task"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}