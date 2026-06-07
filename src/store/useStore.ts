import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, WorkNode, WorkEdge, ViewType } from '../types';
import { DEMO_PROJECT, DEMO_NODES, DEMO_EDGES } from '../data/demoData';

interface AppState {
  projects: Project[];
  nodes: WorkNode[];
  edges: WorkEdge[];

  activeProjectId: string | null;
  activeView: ViewType;
  selectedNodeId: string | null;
  history: AppSnapshot[];

  resetDemoData: () => void;
  importData: (data: any) => void;
  undo: () => void;

  addProject: (p: Project) => void;
  updateProject: (id: string, p: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addNode: (node: WorkNode) => void;
  updateNode: (id: string, node: Partial<WorkNode>) => void;
  deleteNode: (id: string) => void;

  addEdge: (edge: WorkEdge) => void;
  deleteEdge: (id: string) => void;

  setActiveProject: (id: string | null) => void;
  setActiveView: (view: ViewType) => void;
  setSelectedNode: (id: string | null) => void;
}

type AppSnapshot = Pick<AppState, "projects" | "nodes" | "edges" | "activeProjectId" | "activeView" | "selectedNodeId">;

const MAX_HISTORY = 60;

function cloneNode(node: WorkNode): WorkNode {
  return {
    ...node,
    tags: [...node.tags],
    links: node.links ? [...node.links] : undefined,
    mindmapPosition: { ...node.mindmapPosition },
  };
}

function createSnapshot(state: AppState): AppSnapshot {
  return {
    projects: state.projects.map(project => ({ ...project })),
    nodes: state.nodes.map(cloneNode),
    edges: state.edges.map(edge => ({ ...edge })),
    activeProjectId: state.activeProjectId,
    activeView: state.activeView,
    selectedNodeId: state.selectedNodeId,
  };
}

function withHistory(state: AppState) {
  return {
    history: [...state.history, createSnapshot(state)].slice(-MAX_HISTORY),
  };
}

function isNodeComplete(node: WorkNode) {
  return node.status === "done" || Boolean(node.completedTime);
}

function syncAutoCompletedParents(nodes: WorkNode[]) {
  const now = new Date().toISOString();
  let nextNodes = nodes;
  let changed = true;

  while (changed) {
    changed = false;
    nextNodes = nextNodes.map(node => {
      const children = nextNodes.filter(child => child.parentId === node.id);

      if (children.length === 0) {
        if (node.autoCompleted) {
          changed = true;
          return { ...node, autoCompleted: false, updatedAt: now };
        }
        return node;
      }

      const allChildrenDone = children.every(isNodeComplete);

      if (allChildrenDone && !isNodeComplete(node)) {
        changed = true;
        return {
          ...node,
          status: "done",
          completedTime: node.completedTime ?? now,
          autoCompleted: true,
          updatedAt: now,
        };
      }

      if (!allChildrenDone && node.autoCompleted) {
        changed = true;
        return {
          ...node,
          status: "todo",
          completedTime: null,
          autoCompleted: false,
          updatedAt: now,
        };
      }

      return node;
    });
  }

  return nextNodes;
}

function syncProjectStatuses(projects: Project[], nodes: WorkNode[]) {
  const now = new Date().toISOString();

  return projects.map(project => {
    const root = nodes.find(node => node.projectId === project.id && node.type === "project" && node.parentId == null);
    if (!root) return project;

    const rootDone = isNodeComplete(root);
    if (rootDone && project.status !== "done") {
      return { ...project, status: "done" as Project["status"], updatedAt: now };
    }

    if (!rootDone && project.status === "done") {
      return { ...project, status: "doing" as Project["status"], updatedAt: now };
    }

    return project;
  });
}

function normalizeImportData(data: any): Pick<AppState, "projects" | "nodes" | "edges"> {
  if (data?.project && Array.isArray(data.nodes)) {
    return {
      projects: [data.project],
      nodes: data.nodes,
      edges: Array.isArray(data.edges) ? data.edges : [],
    };
  }

  if (Array.isArray(data?.projects) && Array.isArray(data.nodes)) {
    return {
      projects: data.projects,
      nodes: data.nodes,
      edges: Array.isArray(data.edges) ? data.edges : [],
    };
  }

  throw new Error("Invalid import data");
}

function mergeImportedData(data: any, state: AppState) {
  const imported = normalizeImportData(data);
  const suffix = `imported_${Date.now()}`;

  const usedProjectIds = new Set(state.projects.map(project => project.id));
  const projectIdMap = new Map<string, string>();
  const projects = imported.projects.map((project, index) => {
    let nextId = project.id;
    const hasCollision = usedProjectIds.has(nextId);

    if (hasCollision) {
      nextId = `${project.id}_${suffix}_${index}`;
    }

    usedProjectIds.add(nextId);
    projectIdMap.set(project.id, nextId);

    return {
      ...project,
      id: nextId,
      name: hasCollision ? `${project.name} (Imported)` : project.name,
      updatedAt: new Date().toISOString(),
    };
  });

  const usedNodeIds = new Set(state.nodes.map(node => node.id));
  const nodeIdMap = new Map<string, string>();
  imported.nodes.forEach((node, index) => {
    let nextId = node.id;
    if (usedNodeIds.has(nextId)) {
      nextId = `${node.id}_${suffix}_${index}`;
    }

    usedNodeIds.add(nextId);
    nodeIdMap.set(node.id, nextId);
  });

  const nodes = imported.nodes.map((node) => {
    return {
      ...node,
      id: nodeIdMap.get(node.id) ?? node.id,
      projectId: projectIdMap.get(node.projectId) ?? node.projectId,
      parentId: node.parentId ? nodeIdMap.get(node.parentId) ?? node.parentId : null,
      updatedAt: new Date().toISOString(),
    };
  });

  const usedEdgeIds = new Set(state.edges.map(edge => edge.id));
  const edges = imported.edges.map((edge, index) => {
    let nextId = edge.id;
    if (usedEdgeIds.has(nextId)) {
      nextId = `${edge.id}_${suffix}_${index}`;
    }

    usedEdgeIds.add(nextId);

    return {
      ...edge,
      id: nextId,
      projectId: projectIdMap.get(edge.projectId) ?? edge.projectId,
      source: nodeIdMap.get(edge.source) ?? edge.source,
      target: nodeIdMap.get(edge.target) ?? edge.target,
    };
  });

  return {
    projects: [...state.projects, ...projects],
    nodes: [...state.nodes, ...nodes],
    edges: [...state.edges, ...edges],
    selectedNodeId: null,
  };
}

function collectNodeTreeIds(rootId: string, nodes: WorkNode[]) {
  const ids = new Set<string>([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    nodes.forEach(node => {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    });
  }

  return ids;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      projects: [DEMO_PROJECT],
      nodes: DEMO_NODES,
      edges: DEMO_EDGES,
      
      activeProjectId: null,
      activeView: "mindmap",
      selectedNodeId: null,
      history: [],

      resetDemoData: () => set((state) => {
        const nodes = syncAutoCompletedParents(DEMO_NODES);
        const projects = syncProjectStatuses([DEMO_PROJECT], nodes);

        return {
          ...withHistory(state),
          projects,
          nodes,
          edges: DEMO_EDGES,
          activeProjectId: null,
          activeView: "mindmap",
          selectedNodeId: null,
        };
      }),

      importData: (data) => set((state) => {
        const merged = mergeImportedData(data, state);
        const nodes = syncAutoCompletedParents(merged.nodes);
        const projects = syncProjectStatuses(merged.projects, nodes);

        return {
          ...withHistory(state),
          ...merged,
          projects,
          nodes,
        };
      }),

      undo: () => set((state) => {
        const previous = state.history[state.history.length - 1];
        if (!previous) return state;

        return {
          ...previous,
          history: state.history.slice(0, -1),
        };
      }),

      addProject: (p) => set((state) => ({
        ...withHistory(state),
        projects: [...state.projects, p],
      })),
      updateProject: (id, p) => set((state) => ({
        ...withHistory(state),
        projects: state.projects.map(proj => proj.id === id ? { ...proj, ...p, updatedAt: new Date().toISOString() } : proj)
      })),
      deleteProject: (id) => set((state) => ({
        ...withHistory(state),
        projects: state.projects.filter(proj => proj.id !== id),
        nodes: state.nodes.filter(n => n.projectId !== id),
        edges: state.edges.filter(e => e.projectId !== id),
        activeProjectId: state.activeProjectId === id ? null : state.activeProjectId
      })),

      addNode: (node) => set((state) => {
        const nodes = syncAutoCompletedParents([...state.nodes, node]);
        const projects = syncProjectStatuses(state.projects, nodes);

        return {
          ...withHistory(state),
          projects,
          nodes,
        };
      }),
      updateNode: (id, updates) => set((state) => {
        const node = state.nodes.find(n => n.id === id);
        const now = new Date().toISOString();
        const hasManualCompletionUpdate = "status" in updates || "completedTime" in updates;
        
        let newProjects = state.projects;
        if (node?.type === 'project' && updates.title !== undefined) {
           newProjects = state.projects.map(p => p.id === node.projectId ? { ...p, name: updates.title!, updatedAt: now } : p);
        }

        const updatedNodes = state.nodes.map(n => n.id === id
          ? {
              ...n,
              ...updates,
              autoCompleted: hasManualCompletionUpdate ? false : updates.autoCompleted ?? n.autoCompleted,
              updatedAt: now,
            }
          : n
        );
        const nodes = syncAutoCompletedParents(updatedNodes);
        const projects = syncProjectStatuses(newProjects, nodes);

        return {
          ...withHistory(state),
          nodes,
          projects
        };
      }),
      deleteNode: (id) => set((state) => {
        const node = state.nodes.find(n => n.id === id);
        if (node?.type === "project") {
          return state;
        }

        const idsToDelete = collectNodeTreeIds(id, state.nodes);
        const filteredNodes = state.nodes.filter(n => !idsToDelete.has(n.id));
        const nodes = syncAutoCompletedParents(filteredNodes);
        const projects = syncProjectStatuses(state.projects, nodes);

        return {
          ...withHistory(state),
          projects,
          nodes,
          edges: state.edges.filter(e => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)),
          selectedNodeId: state.selectedNodeId && idsToDelete.has(state.selectedNodeId) ? null : state.selectedNodeId
        }
      }),

      addEdge: (edge) => set((state) => ({
        ...withHistory(state),
        edges: [...state.edges, edge],
      })),
      deleteEdge: (id) => set((state) => ({
        ...withHistory(state),
        edges: state.edges.filter(e => e.id !== id),
      })),

      setActiveProject: (id) => set({ activeProjectId: id, selectedNodeId: null }),
      setActiveView: (view) => set({ activeView: view }),
      setSelectedNode: (id) => set({ selectedNodeId: id })
    }),
    {
      name: 'mindmap-timeline-storage',
      partialize: (state) => ({
        projects: state.projects,
        nodes: state.nodes,
        edges: state.edges,
        activeProjectId: null,
        activeView: state.activeView,
        selectedNodeId: null,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState>;
        const activeView: ViewType = persisted?.activeView === "list" ? "list" : "mindmap";
        const restoredState: AppState = {
          ...currentState,
          ...persisted,
          history: [],
          activeView,
          activeProjectId: null,
          selectedNodeId: null,
        };
        const nodes = syncAutoCompletedParents(restoredState.nodes);
        const projects = syncProjectStatuses(restoredState.projects, nodes);

        return {
          ...restoredState,
          projects,
          nodes,
        };
      },
    }
  )
);
