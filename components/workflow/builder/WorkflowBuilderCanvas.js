'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  Map,
  Maximize2,
  Minimize2,
  MousePointer2,
  PanelLeft,
  PanelRight,
  Unlink,
} from 'lucide-react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { cn } from '@/lib/utils'
import { workflowNodeTypes } from '@/components/workflow/builder/nodes'
import { getDragPayload } from '@/components/workflow/builder/WorkflowBuilderSidebar'
import { useWorkflowBuilderStore } from '@/components/workflow/builder/workflowBuilderStore'

function CanvasInner() {
  const reactFlowWrapper = useRef(null)
  const { screenToFlowPosition, fitView, getZoom } = useReactFlow()

  const nodes = useWorkflowBuilderStore((s) => s.nodes)
  const edges = useWorkflowBuilderStore((s) => s.edges)
  const selectedNodeId = useWorkflowBuilderStore((s) => s.selectedNodeId)
  const selectedEdgeId = useWorkflowBuilderStore((s) => s.selectedEdgeId)
  const onNodesChange = useWorkflowBuilderStore((s) => s.onNodesChange)
  const onEdgesChange = useWorkflowBuilderStore((s) => s.onEdgesChange)
  const onConnect = useWorkflowBuilderStore((s) => s.onConnect)
  const setSelectedNodeId = useWorkflowBuilderStore((s) => s.setSelectedNodeId)
  const setSelectedEdgeId = useWorkflowBuilderStore((s) => s.setSelectedEdgeId)
  const addNodeAtPosition = useWorkflowBuilderStore((s) => s.addNodeAtPosition)
  const deleteSelectedEdge = useWorkflowBuilderStore((s) => s.deleteSelectedEdge)
  const onNodeDragStop = useWorkflowBuilderStore((s) => s.onNodeDragStop)
  const setZoom = useWorkflowBuilderStore((s) => s.setZoom)
  const sidebarCollapsed = useWorkflowBuilderStore((s) => s.sidebarCollapsed)
  const propertiesPanelCollapsed = useWorkflowBuilderStore((s) => s.propertiesPanelCollapsed)
  const setSidebarCollapsed = useWorkflowBuilderStore((s) => s.setSidebarCollapsed)
  const setPropertiesPanelCollapsed = useWorkflowBuilderStore((s) => s.setPropertiesPanelCollapsed)
  const toggleCanvasFullscreen = useWorkflowBuilderStore((s) => s.toggleCanvasFullscreen)

  const isCanvasFullscreen = sidebarCollapsed && propertiesPanelCollapsed

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()
      const payload = getDragPayload(event)
      if (!payload?.paletteType) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addNodeAtPosition(payload.paletteType, position)
    },
    [addNodeAtPosition, screenToFlowPosition]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }, [setSelectedEdgeId, setSelectedNodeId])

  const onNodeClick = useCallback(
    (_, node) => {
      setSelectedNodeId(node.id)
    },
    [setSelectedNodeId]
  )

  const onEdgeClick = useCallback(
    (event, edge) => {
      event.stopPropagation()
      setSelectedEdgeId(edge.id)
    },
    [setSelectedEdgeId]
  )

  const onMoveEnd = useCallback(() => {
    setZoom(Math.round(getZoom() * 100))
  }, [getZoom, setZoom])

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.25, duration: 350 })
    setZoom(Math.round(getZoom() * 100))
  }, [fitView, getZoom, setZoom])

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.25, duration: 350 })
      setZoom(Math.round(getZoom() * 100))
    }, 180)
    return () => clearTimeout(timer)
  }, [fitView, getZoom, setZoom, sidebarCollapsed, propertiesPanelCollapsed])

  // Delete / Backspace only disconnects a selected wire — never removes a step.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      const tag = event.target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (!selectedEdgeId) return
      event.preventDefault()
      deleteSelectedEdge()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelectedEdge, selectedEdgeId])

  const nodesWithSelection = nodes.map((node) => ({
    ...node,
    selected: node.id === selectedNodeId,
  }))

  const edgesWithSelection = edges.map((edge) => {
    const selected = edge.id === selectedEdgeId
    return {
      ...edge,
      selectable: true,
      deletable: true,
      selected,
      style: {
        ...(edge.style || {}),
        stroke: selected ? 'var(--studio-primary, #6366f1)' : '#94a3b8',
        strokeWidth: selected ? 3 : 2,
      },
      animated: selected,
    }
  })

  return (
    <div ref={reactFlowWrapper} className="relative h-full w-full">
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[min(100%,22rem)] items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur dark:border-border dark:bg-card/95">
        <MousePointer2 className="h-3.5 w-3.5 shrink-0" />
        Click a wire to disconnect · Steps stay on the board to reconnect anywhere
      </div>

      {selectedEdgeId ? (
        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200/80 bg-white/95 p-1 shadow-sm backdrop-blur dark:border-border dark:bg-card/95">
          <button
            type="button"
            onClick={deleteSelectedEdge}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <Unlink className="h-3.5 w-3.5" />
            Disconnect wire
          </button>
        </div>
      ) : null}

      <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/95 p-1 shadow-sm backdrop-blur dark:border-border dark:bg-card/95">
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Show steps panel' : 'Hide steps panel'}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-muted',
            !sidebarCollapsed && 'bg-primary/10 text-primary'
          )}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setPropertiesPanelCollapsed(!propertiesPanelCollapsed)}
          title={propertiesPanelCollapsed ? 'Show step settings' : 'Hide step settings'}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-muted',
            !propertiesPanelCollapsed && 'bg-primary/10 text-primary'
          )}
        >
          <PanelRight className="h-4 w-4" />
        </button>
        <div className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-border" />
        <button
          type="button"
          onClick={toggleCanvasFullscreen}
          title={isCanvasFullscreen ? 'Exit full canvas' : 'Full canvas view'}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-muted',
            isCanvasFullscreen && 'bg-primary/10 text-primary'
          )}
        >
          {isCanvasFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span className="hidden sm:inline">{isCanvasFullscreen ? 'Exit' : 'Full canvas'}</span>
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-[11.25rem] left-4 z-10 flex items-center gap-1.5 rounded-t-xl border border-b-0 border-slate-200/90 bg-white px-3 py-1.5 shadow-sm dark:border-border dark:bg-card">
        <Map className="h-3.5 w-3.5 text-[var(--studio-primary)]" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Overview</span>
      </div>

      <button
        type="button"
        onClick={handleFitView}
        className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-[12px] font-semibold text-foreground shadow-md transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-muted"
      >
        <Maximize2 className="h-4 w-4 text-[var(--studio-primary)]" />
        Fit to screen
      </button>

      <ReactFlow
        nodes={nodesWithSelection}
        edges={edgesWithSelection}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={onMoveEnd}
        nodeTypes={workflowNodeTypes}
        fitView
        minZoom={0.25}
        maxZoom={1.75}
        edgesFocusable
        elementsSelectable
        deleteKeyCode={null}
        defaultEdgeOptions={{
          type: 'smoothstep',
          selectable: true,
          deletable: true,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          pathOptions: { borderRadius: 20 },
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-[#f4f6f9] dark:bg-muted/15"
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="#cbd5e1" />
        <Controls
          showInteractive={false}
          position="bottom-right"
          className="!bottom-[4.25rem] !right-4 !m-0 !rounded-xl !border !border-slate-200/90 !bg-white !shadow-md [&>button]:!h-8 [&>button]:!w-8 [&>button]:!border-slate-200 [&>button]:!bg-white [&>button]:!text-foreground [&>button]:hover:!bg-slate-50"
        />
        <MiniMap
          nodeStrokeWidth={2}
          nodeBorderRadius={6}
          zoomable
          pannable
          position="bottom-left"
          style={{ width: 228, height: 152, margin: 0 }}
          className="workflow-minimap !bottom-4 !left-4 !m-0 !rounded-b-xl !rounded-t-none overflow-hidden !border !border-slate-200/90 !border-t-0 !bg-white !shadow-lg dark:!border-border dark:!bg-card"
          maskColor="rgba(148, 163, 184, 0.18)"
          maskStrokeColor="var(--studio-primary, #6366f1)"
          maskStrokeWidth={2}
          nodeColor={(node) => {
            const category = node.data?.category
            if (category === 'trigger') return '#10b981'
            if (category === 'condition') return '#6366f1'
            if (category === 'wait') return '#f59e0b'
            if (category === 'ai') return '#8b5cf6'
            if (category === 'exit') return '#f43f5e'
            return '#0ea5e9'
          }}
          nodeStrokeColor={(node) => {
            if (node.id === selectedNodeId) return 'var(--studio-primary, #6366f1)'
            return '#e2e8f0'
          }}
        />
      </ReactFlow>
    </div>
  )
}

export default function WorkflowBuilderCanvas() {
  return (
    <div className={cn('relative min-h-0 flex-1')}>
      <ReactFlowProvider>
        <CanvasInner />
      </ReactFlowProvider>
    </div>
  )
}
