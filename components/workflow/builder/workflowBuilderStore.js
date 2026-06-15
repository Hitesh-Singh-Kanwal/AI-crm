'use client'

import { create } from 'zustand'
import { addEdge, applyEdgeChanges, applyNodeChanges } from '@xyflow/react'
import { createDemoWorkflow } from '@/components/workflow/builder/mockWorkflowData'
import {
  getDefaultConfig,
  getPaletteItem,
} from '@/components/workflow/builder/constants'
import { NODE_GAP_Y } from '@/components/workflow/builder/nodeHelpers'

const MAX_HISTORY = 40
const DEFAULT_EDGE = {
  type: 'smoothstep',
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

const demo = createDemoWorkflow()

export const useWorkflowBuilderStore = create((set, get) => ({
  workflowName: demo.workflowName,
  nodes: demo.nodes,
  edges: demo.edges,
  selectedNodeId: null,
  sidebarCollapsed: false,
  propertiesPanelCollapsed: false,
  zoom: 100,
  isPublished: false,
  isActive: true,
  saveStatus: 'saved',
  past: [],
  future: [],

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
      saveStatus: 'unsaved',
    })
  },

  setWorkflowName: (workflowName) => {
    set({ workflowName, saveStatus: 'unsaved' })
  },

  setIsActive: (isActive) => {
    set({ isActive, saveStatus: 'unsaved' })
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
      ...(selectedNodeId ? { propertiesPanelCollapsed: false } : {}),
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

    set({
      edges: applyEdgeChanges(changes, get().edges),
      saveStatus: 'unsaved',
    })
  },

  onConnect: (connection) => {
    get().pushHistory()
    set({
      edges: addEdge({ ...connection, ...DEFAULT_EDGE }, get().edges),
      saveStatus: 'unsaved',
    })
  },

  addNodeAtPosition: (paletteType, position) => {
    const node = createNodeFromPalette(paletteType, position)
    if (!node) return null

    get().pushHistory()
    set({
      nodes: [...get().nodes, node],
      selectedNodeId: node.id,
      propertiesPanelCollapsed: false,
      saveStatus: 'unsaved',
    })
    return node
  },

  addNodeToFlow: (paletteType) => {
    const { nodes, edges, selectedNodeId } = get()
    const item = getPaletteItem(paletteType)
    if (!item) return null

    if (item.category === 'trigger') {
      const existingTrigger = nodes.find((n) => n.data?.category === 'trigger')
      if (existingTrigger) {
        get().setSelectedNodeId(existingTrigger.id)
        return existingTrigger
      }
    }

    let anchor = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null
    if (!anchor) {
      anchor = nodes.reduce((lowest, node) => {
        if (!lowest || node.position.y > lowest.position.y) return node
        return lowest
      }, null)
    }

    const position = anchor
      ? { x: anchor.position.x, y: anchor.position.y + NODE_GAP_Y + 60 }
      : { x: 360, y: 40 }

    const node = createNodeFromPalette(paletteType, position)
    if (!node) return null

    const newEdges = [...edges]
    if (anchor) {
      newEdges.push({
        id: `e-${anchor.id}-${node.id}`,
        source: anchor.id,
        target: node.id,
        ...DEFAULT_EDGE,
      })
    }

    get().pushHistory()
    set({
      nodes: [...nodes, node],
      edges: newEdges,
      selectedNodeId: node.id,
      propertiesPanelCollapsed: false,
      saveStatus: 'unsaved',
    })
    return node
  },

  updateNodeConfig: (nodeId, partialConfig) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== nodeId) return node
        return {
          ...node,
          data: {
            ...node.data,
            config: { ...node.data.config, ...partialConfig },
          },
        }
      }),
      saveStatus: 'unsaved',
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

  deleteSelectedNode: () => {
    const { selectedNodeId, nodes, edges } = get()
    if (!selectedNodeId) return

    get().pushHistory()
    set({
      nodes: nodes.filter((n) => n.id !== selectedNodeId),
      edges: edges.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId),
      selectedNodeId: null,
      saveStatus: 'unsaved',
    })
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

  resetToDemo: () => {
    const fresh = createDemoWorkflow()
    get().pushHistory()
    set({
      workflowName: fresh.workflowName,
      nodes: fresh.nodes,
      edges: fresh.edges,
      selectedNodeId: null,
      isPublished: false,
      isActive: true,
      saveStatus: 'unsaved',
    })
  },
}))
