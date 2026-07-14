'use client'

import { create } from 'zustand'
import { addEdge, applyEdgeChanges, applyNodeChanges } from '@xyflow/react'
import { createBlankWorkflow } from '@/components/workflow/builder/mockWorkflowData'
import {
  getDefaultConfig,
  getPaletteItem,
} from '@/components/workflow/builder/constants'
import { NODE_GAP_Y } from '@/components/workflow/builder/nodeHelpers'
import {
  getCategoryIdForPaletteType,
  getPaletteUnlockMessage,
  getWorkflowStepProgress,
  isPaletteCategoryUnlocked,
  nextWorkflowUnlockLatches,
} from '@/lib/workflow-contact'

const MAX_HISTORY = 40
const DEFAULT_EDGE = {
  type: 'smoothstep',
  selectable: true,
  focusable: true,
  deletable: true,
  style: { stroke: '#94a3b8', strokeWidth: 2 },
  pathOptions: { borderRadius: 20 },
}

function cloneFlow(nodes, edges) {
  return {
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
  }
}

function makeSnapshot(state) {
  return {
    workflowName: state.workflowName,
    nodes: state.nodes,
    edges: state.edges,
    isPublished: state.isPublished,
    isActive: state.isActive,
  }
}

function createNodeFromPalette(paletteType, position) {
  const item = getPaletteItem(paletteType)
  if (!item) return null

  const id = `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

  return {
    id,
    type: item.category === 'condition' ? 'workflowCondition' : 'workflowNode',
    position,
    data: {
      paletteType,
      category: item.category,
      label: item.label,
      config: getDefaultConfig(paletteType),
    },
  }
}

function assertCanAddPaletteType(paletteType, nodes, latches) {
  const progress = getWorkflowStepProgress(nodes, latches)
  const categoryId = getCategoryIdForPaletteType(paletteType)
  if (isPaletteCategoryUnlocked(categoryId, progress)) {
    return { ok: true }
  }
  return {
    ok: false,
    error: getPaletteUnlockMessage(categoryId, progress) || 'Finish the previous step first.',
  }
}

const blank = createBlankWorkflow()

export const useWorkflowBuilderStore = create((set, get) => ({
  workflowId: null,
  workflowName: blank.workflowName,
  nodes: blank.nodes,
  edges: blank.edges,
  selectedNodeId: null,
  selectedEdgeId: null,
  sidebarCollapsed: false,
  propertiesPanelCollapsed: false,
  zoom: 100,
  isPublished: false,
  isActive: true,
  saveStatus: 'saved',
  guidedCategory: 'all',
  actionsUnlocked: false,
  exitUnlocked: false,
  options: { forms: [], reasons: [], dynamicLists: [] },
  past: [],
  future: [],

  setGuidedCategory: (guidedCategory) => set({ guidedCategory }),

  syncWorkflowUnlocks: () => {
    const state = get()
    const next = nextWorkflowUnlockLatches(state.nodes, {
      actionsUnlocked: state.actionsUnlocked,
      exitUnlocked: state.exitUnlocked,
    })
    if (
      next.actionsUnlocked === state.actionsUnlocked &&
      next.exitUnlocked === state.exitUnlocked
    ) {
      return
    }
    set(next)
  },

  pushHistory: () => {
    const state = get()
    const snapshot = makeSnapshot(state)
    set({
      past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
      future: [],
    })
  },

  undo: () => {
    const { past, future, ...current } = get()
    if (past.length === 0) return
    const previous = past[past.length - 1]
    set({
      ...previous,
      past: past.slice(0, -1),
      future: [makeSnapshot(current), ...future],
      selectedNodeId: null,
      selectedEdgeId: null,
      saveStatus: 'unsaved',
    })
  },

  redo: () => {
    const { future, past, ...current } = get()
    if (future.length === 0) return
    const next = future[0]
    set({
      ...next,
      past: [...past, makeSnapshot(current)],
      future: future.slice(1),
      selectedNodeId: null,
      selectedEdgeId: null,
      saveStatus: 'unsaved',
    })
  },

  setWorkflowName: (workflowName) => {
    set({ workflowName, saveStatus: 'unsaved' })
  },

  setIsActive: (isActive) => {
    set({ isActive, saveStatus: 'unsaved' })
  },

  setWorkflowId: (workflowId) => set({ workflowId }),

  setOptions: (options) => set({ options: { forms: [], reasons: [], dynamicLists: [], ...(options || {}) } }),

  setSaveStatus: (saveStatus) => set({ saveStatus }),

  /** Replace the whole canvas with a graph loaded from the API (or a blank/new flow). */
  loadWorkflowGraph: ({ workflowId = null, workflowName, nodes = [], edges = [], isActive = true }) => {
    const latches = nextWorkflowUnlockLatches(nodes, { actionsUnlocked: false, exitUnlocked: false })
    set({
      workflowId,
      workflowName: workflowName ?? get().workflowName,
      nodes,
      edges,
      isActive,
      selectedNodeId: null,
      selectedEdgeId: null,
      isPublished: false,
      saveStatus: 'saved',
      past: [],
      future: [],
      actionsUnlocked: latches.actionsUnlocked,
      exitUnlocked: latches.exitUnlocked,
      guidedCategory: 'all',
    })
  },

  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

  setPropertiesPanelCollapsed: (propertiesPanelCollapsed) => set({ propertiesPanelCollapsed }),

  togglePropertiesPanelCollapsed: () => {
    set((state) => ({ propertiesPanelCollapsed: !state.propertiesPanelCollapsed }))
  },

  setCanvasFullscreen: (fullscreen) => {
    set({
      sidebarCollapsed: fullscreen,
      propertiesPanelCollapsed: fullscreen,
    })
  },

  toggleCanvasFullscreen: () => {
    const { sidebarCollapsed, propertiesPanelCollapsed } = get()
    const isFullscreen = sidebarCollapsed && propertiesPanelCollapsed
    set({
      sidebarCollapsed: !isFullscreen,
      propertiesPanelCollapsed: !isFullscreen,
    })
  },

  setSelectedNodeId: (selectedNodeId) =>
    set({
      selectedNodeId,
      selectedEdgeId: null,
      ...(selectedNodeId ? { propertiesPanelCollapsed: false } : {}),
    }),

  setSelectedEdgeId: (selectedEdgeId) =>
    set({
      selectedEdgeId,
      selectedNodeId: null,
    }),

  setZoom: (zoom) => set({ zoom }),

  onNodesChange: (changes) => {
    const hasStructural = changes.some((c) => c.type === 'remove' || c.type === 'add')
    if (hasStructural) get().pushHistory()

    set({
      nodes: applyNodeChanges(changes, get().nodes),
      saveStatus: 'unsaved',
    })
  },

  onEdgesChange: (changes) => {
    const hasStructural = changes.some((c) => c.type === 'remove' || c.type === 'add')
    if (hasStructural) get().pushHistory()

    const removedIds = new Set(
      changes.filter((c) => c.type === 'remove').map((c) => c.id)
    )
    const selectedEdgeId = get().selectedEdgeId
    set({
      edges: applyEdgeChanges(changes, get().edges),
      saveStatus: 'unsaved',
      ...(selectedEdgeId && removedIds.has(selectedEdgeId) ? { selectedEdgeId: null } : {}),
    })
  },

  onConnect: (connection) => {
    get().pushHistory()
    set({
      edges: addEdge({ ...connection, ...DEFAULT_EDGE }, get().edges),
      selectedEdgeId: null,
      saveStatus: 'unsaved',
    })
  },

  addNodeAtPosition: (paletteType, position) => {
    const state = get()
    const latches = {
      actionsUnlocked: state.actionsUnlocked,
      exitUnlocked: state.exitUnlocked,
    }
    const gate = assertCanAddPaletteType(paletteType, state.nodes, latches)
    if (!gate.ok) return { ok: false, error: gate.error }

    const node = createNodeFromPalette(paletteType, position)
    if (!node) return { ok: false, error: 'Unknown step type.' }

    const nextNodes = [...state.nodes, node]
    const nextLatches = nextWorkflowUnlockLatches(nextNodes, latches)

    get().pushHistory()
    set({
      nodes: nextNodes,
      selectedNodeId: node.id,
      selectedEdgeId: null,
      propertiesPanelCollapsed: false,
      saveStatus: 'unsaved',
      ...nextLatches,
    })
    return { ok: true, node }
  },

  addNodeToFlow: (paletteType) => {
    const { nodes, edges, actionsUnlocked, exitUnlocked } = get()
    const latches = { actionsUnlocked, exitUnlocked }
    const item = getPaletteItem(paletteType)
    if (!item) return { ok: false, error: 'Unknown step type.' }

    const gate = assertCanAddPaletteType(paletteType, nodes, latches)
    if (!gate.ok) return { ok: false, error: gate.error }

    if (item.category === 'trigger') {
      const existingTrigger = nodes.find((n) => n.data?.category === 'trigger')
      if (existingTrigger) {
        get().setSelectedNodeId(existingTrigger.id)
        return { ok: true, node: existingTrigger }
      }
    }

    if (paletteType === 'exit_logic' || item.category === 'exit') {
      const existingExit = nodes.find(
        (n) => n.data?.paletteType === 'exit_logic' || n.data?.category === 'exit'
      )
      if (existingExit) {
        get().setSelectedNodeId(existingExit.id)
        return { ok: true, node: existingExit }
      }
    }

    // Prefer the end of the chain (no outgoing edges); else the lowest node on the board.
    const sources = new Set(edges.map((e) => e.source))
    const chainEnds = nodes.filter(
      (n) =>
        !sources.has(n.id) &&
        n.data?.category !== 'exit' &&
        n.data?.paletteType !== 'exit_logic'
    )
    const lastNode =
      chainEnds.sort((a, b) => b.position.y - a.position.y)[0] ||
      nodes.reduce((lowest, node) => {
        if (!lowest || node.position.y > lowest.position.y) return node
        return lowest
      }, null)

    const position = lastNode
      ? { x: lastNode.position.x, y: lastNode.position.y + NODE_GAP_Y + 60 }
      : { x: 360, y: 40 }

    const node = createNodeFromPalette(paletteType, position)
    if (!node) return { ok: false, error: 'Unknown step type.' }

    const newEdges = [...edges]
    const canConnectFromLast =
      lastNode &&
      lastNode.data?.category !== 'exit' &&
      lastNode.data?.paletteType !== 'exit_logic'
    if (canConnectFromLast) {
      newEdges.push({
        id: `e-${lastNode.id}-${node.id}`,
        source: lastNode.id,
        target: node.id,
        ...DEFAULT_EDGE,
      })
    }

    const nextNodes = [...nodes, node]
    const nextLatches = nextWorkflowUnlockLatches(nextNodes, latches)

    get().pushHistory()
    set({
      nodes: nextNodes,
      edges: newEdges,
      selectedNodeId: node.id,
      selectedEdgeId: null,
      propertiesPanelCollapsed: false,
      saveStatus: 'unsaved',
      ...nextLatches,
    })
    return { ok: true, node }
  },

  updateNodeConfig: (nodeId, partialConfig) => {
    const state = get()
    const nextNodes = state.nodes.map((node) => {
      if (node.id !== nodeId) return node
      return {
        ...node,
        data: {
          ...node.data,
          config: { ...node.data.config, ...partialConfig },
        },
      }
    })
    const nextLatches = nextWorkflowUnlockLatches(nextNodes, {
      actionsUnlocked: state.actionsUnlocked,
      exitUnlocked: state.exitUnlocked,
    })
    set({
      nodes: nextNodes,
      saveStatus: 'unsaved',
      ...nextLatches,
    })
  },

  updateNodeLabel: (nodeId, label) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, label } } : node
      ),
      saveStatus: 'unsaved',
    })
  },

  onNodeDragStop: () => {
    get().pushHistory()
    set({ saveStatus: 'unsaved' })
  },

  deleteSelectedEdge: () => {
    const { selectedEdgeId, edges } = get()
    if (!selectedEdgeId) return

    get().pushHistory()
    set({
      edges: edges.filter((e) => e.id !== selectedEdgeId),
      selectedEdgeId: null,
      saveStatus: 'unsaved',
    })
  },

  deleteSelectedNode: () => {
    const { selectedNodeId, nodes, edges } = get()
    if (!selectedNodeId) return

    get().pushHistory()
    set({
      nodes: nodes.filter((n) => n.id !== selectedNodeId),
      edges: edges.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId),
      selectedNodeId: null,
      selectedEdgeId: null,
      saveStatus: 'unsaved',
    })
  },

  /** Only disconnects a selected wire. Steps are never removed here. */
  deleteSelection: () => {
    get().deleteSelectedEdge()
  },

  saveWorkflow: () => {
    set({ saveStatus: 'saving' })
    setTimeout(() => {
      set({ saveStatus: 'saved' })
    }, 600)
  },

  publishWorkflow: () => {
    set({ saveStatus: 'saving', isPublished: false })
    setTimeout(() => {
      set({ saveStatus: 'saved', isPublished: true })
    }, 800)
  },

  resetToBlank: () => {
    const fresh = createBlankWorkflow()
    get().pushHistory()
    set({
      workflowId: null,
      workflowName: fresh.workflowName,
      nodes: fresh.nodes,
      edges: fresh.edges,
      selectedNodeId: null,
      selectedEdgeId: null,
      isPublished: false,
      isActive: true,
      saveStatus: 'unsaved',
      guidedCategory: 'all',
      actionsUnlocked: false,
      exitUnlocked: false,
    })
  },
}))
