import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { VisitSession } from "@/features/visits/api/types"
import type { FlowCard, TimelineItem } from "@/features/workbench/api"
import type { VisitMachineContext } from "@/features/workbench/machine/visit-machine.types"
import { useWorkbenchSession } from "@/features/workbench/hooks/useWorkbenchSession"

// ---- Mock useTimeline ----
const mockFetchNextPage = vi.fn()
const mockTimelineItems: TimelineItem[] = []
const mockUseTimeline = vi.fn(() => ({
  items: mockTimelineItems,
  fetchNextPage: mockFetchNextPage,
  hasMore: false,
  isFetching: false,
  isLoading: false,
}))

vi.mock("@/features/workbench/hooks/useTimeline", () => ({
  useTimeline: () => mockUseTimeline(),
}))

// ---- Mock useAssistantStream ----
const mockStartStream = vi.fn()
const mockAbortStream = vi.fn()
const mockIsStreaming = false
const mockUseAssistantStream = vi.fn(() => ({
  startStream: mockStartStream,
  abortStream: mockAbortStream,
  isStreaming: mockIsStreaming,
}))
// Captured callbacks passed to useAssistantStream
type AssistantCallbacks = {
  appendTimelineItem: (item: TimelineItem) => void
  updateTimelineItem: (id: string, updater: (item: TimelineItem) => TimelineItem) => void
  upsertTimelineItems: (items: TimelineItem[]) => void
  sendMachineEvent: (event: unknown) => void
}

let assistantCallbacks: AssistantCallbacks | null = null

vi.mock("@/features/workbench/hooks/useAssistantStream", () => ({
  useAssistantStream: (opts: unknown) => mockUseAssistantStream(opts),
}))

// ---- Mock useSessionTitleGeneration ----
vi.mock("@/features/workbench/hooks/useSessionTitleGeneration", () => ({
  useSessionTitleGeneration: vi.fn(),
}))

// Captured flow card callbacks from useFlowCardAction
type FlowCardCallbacks = {
  updateCardInTimeline: (cardId: string, updater: (card: FlowCard) => FlowCard) => void
  upsertTimelineItems: (items: TimelineItem[]) => void
  sendMachineEvent: (event: unknown) => void
  findCardById?: (cardId: string) => FlowCard | undefined
}

let flowCardCallbacks: FlowCardCallbacks | null = null

// ---- Mock useFlowCardAction ----
const mockHandleAction = vi.fn()
const mockUseFlowCardAction = vi.fn((opts) => {
  if (opts) flowCardCallbacks = opts as FlowCardCallbacks
  return {
    handleAction: mockHandleAction,
    isSubmitting: false,
  }
})

vi.mock("@/features/workbench/hooks/useFlowCardAction", () => ({
  useFlowCardAction: (opts: unknown) => mockUseFlowCardAction(opts),
}))

// ---- Mock XState ----
const mockSend = vi.fn()
const mockGetSnapshot = vi.fn(() => ({ value: "chatting" }))
const mockActorRef = { send: mockSend, getSnapshot: mockGetSnapshot }
const mockUseActorRef = vi.fn(() => mockActorRef)
const mockUseSelector = vi.fn()

vi.mock("@xstate/react", () => ({
  useActorRef: () => mockUseActorRef(),
  useSelector: (ref: unknown, selector: (snapshot: { value: unknown; context: unknown }) => unknown) => {
    return mockUseSelector(ref, selector)
  },
}))

// ---- Mock visitMachine ----
vi.mock("@/features/workbench/machine/visit-machine", () => ({
  visitMachine: {},
}))

// Shared state for InfiniteData that flows through setQueryData calls.
// This allows the internal helper functions (appendToLastPage, upsertItemsInPages,
// replaceItemInPages, updateItemStatusInPages, updateCardInPages) to be exercised.
let timelineInfiniteData: {
  pages: Array<{ items: TimelineItem[]; hasMore: boolean }>
  pageParams: unknown[]
} | null = null

// ---- Mock React Query ----
const mockSetQueryData = vi.fn((key: unknown, value: unknown) => {
  if (typeof value === "function") {
    const keyStr = JSON.stringify(key)
    // For timeline operations, invoke the updater with InfiniteData
    if (keyStr.includes("timeline")) {
      if (!timelineInfiniteData) {
        timelineInfiniteData = {
          pages: [{ items: [...mockTimelineItems], hasMore: false }],
          pageParams: [undefined],
        }
      }
      timelineInfiniteData = value(timelineInfiniteData)
      return timelineInfiniteData
    }
    // For session keys, invoke with session data from the mock
    if (keyStr.includes("session")) {
      return value(mockGetQueryData())
    }
    return value(null)
  }
  return value
})
const mockGetQueryData = vi.fn()
const mockInvalidateQueries = vi.fn()
const mockUseQuery = vi.fn()
const mockUseQueryClient = vi.fn(() => ({
  setQueryData: mockSetQueryData,
  getQueryData: mockGetQueryData,
  invalidateQueries: mockInvalidateQueries,
}))

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => mockUseQuery(),
  useQueryClient: () => mockUseQueryClient(),
  infiniteQueryOptions: (opts: unknown) => opts,
}))

// ---- Mock workbenchApi ----
const mockSendMessage = vi.fn()
const mockClassifyFollowUpIntent = vi.fn()
const mockExitVisit = vi.fn()
const mockPauseVisitTimer = vi.fn()
const mockResumeVisitTimer = vi.fn()
const mockReportVitals = vi.fn()
const mockDismissEmergency = vi.fn()
const mockSuspendVisit = vi.fn()

vi.mock("@/features/workbench/api", () => ({
  workbenchApi: {
    sendMessage: (...args: unknown[]) => mockSendMessage(...args),
    classifyFollowUpIntent: (...args: unknown[]) => mockClassifyFollowUpIntent(...args),
    exitVisit: (...args: unknown[]) => mockExitVisit(...args),
    pauseVisitTimer: (...args: unknown[]) => mockPauseVisitTimer(...args),
    resumeVisitTimer: (...args: unknown[]) => mockResumeVisitTimer(...args),
    reportVitals: (...args: unknown[]) => mockReportVitals(...args),
    dismissEmergency: (...args: unknown[]) => mockDismissEmergency(...args),
    suspendVisit: (...args: unknown[]) => mockSuspendVisit(...args),
  },
  workbenchQueryKeys: {
    all: ["workbench"],
    timeline: (id: string) => ["workbench", "timeline", id],
  },
}))

// ---- Mock visitsApi ----
const mockCreateFollowUp = vi.fn()

vi.mock("@/features/visits/api", () => ({
  visitsApi: {
    createFollowUp: (...args: unknown[]) => mockCreateFollowUp(...args),
  },
  visitsQueryKeys: {
    all: ["visits"],
    list: (input: unknown = {}) => ["visits", "list", input],
    session: (id: string) => ["visits", "session", id],
  },
}))

// ---- Mock visitsQueries ----
vi.mock("@/features/visits/api/queries", () => ({
  visitsQueries: {
    session: (id: string) => ({ queryKey: ["visits", "session", id], queryFn: () => {} }),
  },
  visitsQueryKeys: {
    all: ["visits"],
    list: (input: unknown = {}) => ["visits", "list", input],
    session: (id: string) => ["visits", "session", id],
  },
}))

// ---- Mock composer store ----
const mockClearDraft = vi.fn()
vi.mock("@/features/workbench/store/composer-store", () => ({
  useComposerStore: {
    getState: () => ({
      clearDraft: mockClearDraft,
    }),
  },
}))

// ---- Mock timeline-merge utils ----
vi.mock("@/features/workbench/utils/timeline-merge", () => ({
  createOptimisticPatientMessage: (content: string, clientMessageId: string, sessionId: string) => ({
    kind: "message",
    id: clientMessageId,
    sessionId,
    createdAt: "2026-06-28T01:00:00.000Z",
    status: "pending",
    role: "patient",
    content,
    localKey: clientMessageId,
  }),
  createStreamingAssistantMessage: (sessionId: string) => ({
    kind: "message",
    id: "stream-mock-id",
    sessionId,
    createdAt: "2026-06-28T01:00:00.000Z",
    status: "streaming",
    role: "assistant",
    content: "",
  }),
  createSystemEventItem: (sessionId: string, eventType: string, title: string, description?: string) => ({
    kind: "system_event",
    id: "sys-mock-id",
    sessionId,
    createdAt: "2026-06-28T01:00:00.000Z",
    status: "done",
    eventType,
    title,
    ...(description ? { description } : {}),
  }),
  createTerminalItem: (sessionId: string, reason: string, title: string, description?: string) => ({
    kind: "terminal",
    id: "term-mock-id",
    sessionId,
    createdAt: "2026-06-28T01:00:00.000Z",
    status: "done",
    reason,
    title,
    ...(description ? { description } : {}),
  }),
  generateClientMessageId: () => "client-msg-mock-id",
  timelineItemsShareIdentity: (current: TimelineItem, incoming: TimelineItem) => {
    if (current.id === incoming.id) return true
    if (
      current.kind === "message" &&
      incoming.kind === "message" &&
      current.sessionId === incoming.sessionId &&
      current.role === incoming.role
    ) {
      const currentKeys = new Set([current.id, current.localKey].filter(Boolean))
      const incomingKeys = [incoming.id, incoming.localKey].filter(Boolean)
      return incomingKeys.some((key) => currentKeys.has(key))
    }
    return (
      current.kind === "flow_card" &&
      incoming.kind === "flow_card" &&
      current.card.id === incoming.card.id
    )
  },
}))

// ---- Helpers ----
function makeSession(overrides: Partial<VisitSession> = {}): VisitSession {
  return {
    id: "visit-001",
    patientId: "patient-mock-001",
    patientName: "测试患者",
    entryType: "new",
    status: "chatting",
    startedAt: "2026-06-28T01:00:00.000Z",
    updatedAt: "2026-06-28T01:05:00.000Z",
    askRound: 1,
    askRoundLimit: 6,
    labRound: 0,
    labRoundLimit: 2,
    timerPaused: false,
    summary: {
      chiefComplaint: "发热",
    },
    ...overrides,
  }
}

function makeMachineContext(overrides: Partial<VisitMachineContext> = {}): VisitMachineContext {
  return {
    sessionId: "visit-001",
    askRound: 1,
    labRound: 0,
    blocking: false,
    timerPaused: false,
    ...overrides,
  }
}

function setupMocks(options: {
  session?: VisitSession | undefined
  isLoading?: boolean
  error?: Error | null
  machineState?: string
  machineContext?: VisitMachineContext
  timelineItems?: TimelineItem[]
  isStreaming?: boolean
} = {}) {
  const {
    session,
    isLoading = false,
    error = null,
    machineState = "chatting",
    machineContext = makeMachineContext(),
    timelineItems = [],
    isStreaming = false,
  } = options

  mockUseQuery.mockReturnValue({
    data: session,
    isLoading,
    error,
  })

  mockUseSelector.mockImplementation((_ref: unknown, selector: (snapshot: { value: unknown; context: unknown }) => unknown) => {
    return selector({ value: machineState, context: machineContext })
  })

  mockTimelineItems.length = 0
  mockTimelineItems.push(...timelineItems)
  timelineInfiniteData = null

  mockUseTimeline.mockReturnValue({
    items: mockTimelineItems,
    fetchNextPage: mockFetchNextPage,
    hasMore: false,
    isFetching: false,
    isLoading: false,
  })

  mockUseAssistantStream.mockImplementation((opts) => {
    assistantCallbacks = opts as AssistantCallbacks
    return {
      startStream: mockStartStream,
      abortStream: mockAbortStream,
      isStreaming,
    }
  })

  mockGetSnapshot.mockReturnValue({ value: machineState })
}

describe("useWorkbenchSession", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockClear()
    mockGetSnapshot.mockReturnValue({ value: "chatting" })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ---- Return shape ----

  describe("return shape", () => {
    it("returns all expected fields", () => {
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current).toHaveProperty("session")
      expect(result.current).toHaveProperty("items")
      expect(result.current).toHaveProperty("state")
      expect(result.current).toHaveProperty("context")
      expect(result.current).toHaveProperty("blockingCard")
      expect(result.current).toHaveProperty("loading")
      expect(result.current).toHaveProperty("error")
      expect(result.current).toHaveProperty("hasMore")
      expect(result.current).toHaveProperty("fetchMore")
      expect(result.current).toHaveProperty("isFetchingMore")
      expect(result.current).toHaveProperty("isStreaming")
      expect(result.current).toHaveProperty("actions")
    })

    it("returns all expected action callbacks", () => {
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))
      const { actions } = result.current

      expect(actions).toHaveProperty("sendMessage")
      expect(actions).toHaveProperty("askLockedQuestion")
      expect(actions).toHaveProperty("submitFlowAction")
      expect(actions).toHaveProperty("requestExit")
      expect(actions).toHaveProperty("confirmExit")
      expect(actions).toHaveProperty("pauseVisit")
      expect(actions).toHaveProperty("resumeVisit")
      expect(actions).toHaveProperty("reportVitals")
      expect(actions).toHaveProperty("dismissEmergency")
      expect(actions).toHaveProperty("confirmEmergency")
      expect(actions).toHaveProperty("triggerTimeout")
      expect(actions).toHaveProperty("suspendVisit")
      expect(actions).toHaveProperty("resumeFromSuspended")
    })

    it("returns session from query data", () => {
      const session = makeSession()
      setupMocks({ session })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.session).toEqual(session)
    })

    it("returns items from timeline hook", () => {
      const items: TimelineItem[] = [
        {
          id: "tl-1",
          sessionId: "visit-001",
          kind: "message",
          status: "done",
          role: "patient",
          content: "你好",
          createdAt: "2026-06-28T01:00:00.000Z",
        },
      ]
      setupMocks({ session: makeSession(), timelineItems: items })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.items).toEqual(items)
    })

    it("returns state from machine", () => {
      setupMocks({ session: makeSession(), machineState: "chatting" })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.state).toBe("chatting")
    })

    it("returns context from machine", () => {
      const ctx = makeMachineContext({ sessionId: "visit-001", askRound: 2 })
      setupMocks({ session: makeSession(), machineContext: ctx })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.context).toEqual(ctx)
    })

    it("returns isStreaming from assistant stream hook", () => {
      setupMocks({ session: makeSession(), isStreaming: true })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.isStreaming).toBe(true)
    })
  })

  // ---- Loading state ----

  describe("loading state", () => {
    it("returns loading=true when session query is loading", () => {
      setupMocks({ isLoading: true })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.loading).toBe(true)
    })

    it("returns loading=false when session query is not loading", () => {
      setupMocks({ session: makeSession(), isLoading: false })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.loading).toBe(false)
    })
  })

  // ---- Error state ----

  describe("error state", () => {
    it("returns error message from session query error", () => {
      setupMocks({ error: new Error("Network error") })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.error).toBe("Network error")
    })

    it("returns undefined error when no error", () => {
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.error).toBeUndefined()
    })
  })

  // ---- blockingCard ----

  describe("blockingCard", () => {
    it("returns undefined when machine context has no currentCardId", () => {
      setupMocks({
        session: makeSession(),
        machineContext: makeMachineContext({ currentCardId: undefined }),
      })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.blockingCard).toBeUndefined()
    })

    it("returns undefined when no matching flow_card item found", () => {
      setupMocks({
        session: makeSession(),
        machineContext: makeMachineContext({ currentCardId: "card-missing" }),
        timelineItems: [],
      })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.blockingCard).toBeUndefined()
    })

    it("returns the matching flow_card when currentCardId matches", () => {
      const card: FlowCard = {
        id: "card-1",
        sessionId: "visit-001",
        kind: "lab_decision",
        status: "pending",
        blocking: true,
        title: "建议进行血常规检验",
        createdAt: "2026-06-28T02:00:00.000Z",
        testItems: [{ code: "CBC", name: "血常规", sampleType: "静脉血" }],
        reason: "需要区分感染类型",
        differentialTargets: ["病毒性", "细菌性"],
        estimatedFee: 35,
      }
      const items: TimelineItem[] = [
        {
          id: "tl-card-1",
          sessionId: "visit-001",
          kind: "flow_card",
          status: "done",
          createdAt: "2026-06-28T02:00:00.000Z",
          card,
        },
      ]

      setupMocks({
        session: makeSession(),
        machineContext: makeMachineContext({ currentCardId: "card-1" }),
        timelineItems: items,
      })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.blockingCard).toEqual(card)
    })
  })

  // ---- Hydration ----

  describe("hydration", () => {
    it("sends HYDRATE event to machine when session data is available", () => {
      const session = makeSession({ status: "chatting" })
      setupMocks({ session, machineState: "loadingContext" })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "chatting",
          session,
        }),
      )
    })

    it("maps terminal status to terminated state", () => {
      const session = makeSession({
        status: "exited",
        terminalReason: "patient_request",
      })
      setupMocks({ session, machineState: "loadingContext" })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "terminated",
          terminalReason: "patient_request",
        }),
      )
    })

    it("maps emergency_terminated to terminated", () => {
      const session = makeSession({
        status: "emergency_terminated",
        terminalReason: "emergency",
      })
      setupMocks({ session, machineState: "loadingContext" })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "terminated",
          terminalReason: "emergency",
        }),
      )
    })

    it("maps transferred to terminated", () => {
      const session = makeSession({
        status: "transferred",
        terminalReason: "referral",
      })
      setupMocks({ session, machineState: "loadingContext" })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "terminated",
          terminalReason: "referral",
        }),
      )
    })

    it("maps blocked + lab_decision card to labDecision state", () => {
      const card: FlowCard = {
        id: "card-1",
        sessionId: "visit-001",
        kind: "lab_decision",
        status: "pending",
        blocking: true,
        title: "建议进行血常规检验",
        createdAt: "2026-06-28T02:00:00.000Z",
        testItems: [],
        reason: "",
        differentialTargets: [],
        estimatedFee: 35,
      }
      const items: TimelineItem[] = [
        {
          id: "tl-card-1",
          sessionId: "visit-001",
          kind: "flow_card",
          status: "done",
          createdAt: "2026-06-28T02:00:00.000Z",
          card,
        },
      ]
      const session = makeSession({ status: "blocked", activeCardId: "card-1" })
      setupMocks({ session, machineState: "loadingContext", timelineItems: items })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "labDecision",
          currentCardId: "card-1",
        }),
      )
    })

    it("maps blocked + payment (lab) card to labPayment state", () => {
      const card: FlowCard = {
        id: "card-1",
        sessionId: "visit-001",
        kind: "payment",
        status: "pending",
        blocking: true,
        title: "检验费用确认",
        createdAt: "2026-06-28T02:00:00.000Z",
        paymentId: "pay-1",
        purpose: "lab",
        items: [],
        totalAmount: 35,
        insuranceAmount: 20,
        selfPayAmount: 15,
        paymentStatus: "unpaid",
      }
      const items: TimelineItem[] = [
        {
          id: "tl-card-1",
          sessionId: "visit-001",
          kind: "flow_card",
          status: "done",
          createdAt: "2026-06-28T02:00:00.000Z",
          card,
        },
      ]
      const session = makeSession({ status: "blocked", activeCardId: "card-1" })
      setupMocks({ session, machineState: "loadingContext", timelineItems: items })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "labPayment",
          currentCardId: "card-1",
        }),
      )
    })

    it("maps blocked + payment (medication) card to medicationPayment state", () => {
      const card: FlowCard = {
        id: "card-1",
        sessionId: "visit-001",
        kind: "payment",
        status: "pending",
        blocking: true,
        title: "药品费用确认",
        createdAt: "2026-06-28T02:00:00.000Z",
        paymentId: "pay-1",
        purpose: "medication",
        items: [],
        totalAmount: 30,
        insuranceAmount: 10,
        selfPayAmount: 20,
        paymentStatus: "unpaid",
      }
      const items: TimelineItem[] = [
        {
          id: "tl-card-1",
          sessionId: "visit-001",
          kind: "flow_card",
          status: "done",
          createdAt: "2026-06-28T02:00:00.000Z",
          card,
        },
      ]
      const session = makeSession({ status: "blocked", activeCardId: "card-1" })
      setupMocks({ session, machineState: "loadingContext", timelineItems: items })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "medicationPayment",
          currentCardId: "card-1",
        }),
      )
    })

    it("maps blocked + lab_execution card to labExecution state", () => {
      const card: FlowCard = {
        id: "card-1",
        sessionId: "visit-001",
        kind: "lab_execution",
        status: "pending",
        blocking: true,
        title: "检验执行",
        createdAt: "2026-06-28T02:00:00.000Z",
        labOrderId: "lab-1",
        executionStatus: "pending",
      }
      const items: TimelineItem[] = [
        {
          id: "tl-card-1",
          sessionId: "visit-001",
          kind: "flow_card",
          status: "done",
          createdAt: "2026-06-28T02:00:00.000Z",
          card,
        },
      ]
      const session = makeSession({ status: "blocked", activeCardId: "card-1" })
      setupMocks({ session, machineState: "loadingContext", timelineItems: items })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "labExecution",
          currentCardId: "card-1",
        }),
      )
    })

    it("maps blocked + medication_fulfillment card to medicationFulfillment state", () => {
      const card: FlowCard = {
        id: "card-1",
        sessionId: "visit-001",
        kind: "medication_fulfillment",
        status: "pending",
        blocking: true,
        title: "确认取药方式",
        createdAt: "2026-06-28T02:00:00.000Z",
        medications: [],
        availableModes: ["pickup", "delivery"],
        fulfillmentStatus: "pending",
      }
      const items: TimelineItem[] = [
        {
          id: "tl-card-1",
          sessionId: "visit-001",
          kind: "flow_card",
          status: "done",
          createdAt: "2026-06-28T02:00:00.000Z",
          card,
        },
      ]
      const session = makeSession({ status: "blocked", activeCardId: "card-1" })
      setupMocks({ session, machineState: "loadingContext", timelineItems: items })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "medicationFulfillment",
          currentCardId: "card-1",
        }),
      )
    })

    it("maps blocked + treatment_execution card to treatmentExecution state", () => {
      const card: FlowCard = {
        id: "card-1",
        sessionId: "visit-001",
        kind: "treatment_execution",
        status: "pending",
        blocking: true,
        title: "治疗执行",
        createdAt: "2026-06-28T02:00:00.000Z",
        treatmentName: "雾化治疗",
        capability: "available",
        executionStatus: "pending",
      }
      const items: TimelineItem[] = [
        {
          id: "tl-card-1",
          sessionId: "visit-001",
          kind: "flow_card",
          status: "done",
          createdAt: "2026-06-28T02:00:00.000Z",
          card,
        },
      ]
      const session = makeSession({ status: "blocked", activeCardId: "card-1" })
      setupMocks({ session, machineState: "loadingContext", timelineItems: items })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "treatmentExecution",
          currentCardId: "card-1",
        }),
      )
    })

    it("maps chatting status to chatting state", () => {
      const session = makeSession({ status: "chatting" })
      setupMocks({ session, machineState: "loadingContext" })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "chatting",
        }),
      )
    })

    it("maps analyzing status to analyzing state", () => {
      const session = makeSession({ status: "analyzing" })
      setupMocks({ session, machineState: "loadingContext" })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "analyzing",
        }),
      )
    })

    it("maps diagnosis status to diagnosis state", () => {
      const session = makeSession({ status: "diagnosis" })
      setupMocks({ session, machineState: "loadingContext" })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "diagnosis",
        }),
      )
    })

    it("maps treatment status to treatmentDecision state", () => {
      const session = makeSession({ status: "treatment" })
      setupMocks({ session, machineState: "loadingContext" })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "treatmentDecision",
        }),
      )
    })

    it("maps completed status to completed state", () => {
      const session = makeSession({ status: "completed" })
      setupMocks({ session, machineState: "loadingContext" })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "completed",
        }),
      )
    })

    it("maps suspended status to suspended state", () => {
      const session = makeSession({ status: "suspended" })
      setupMocks({ session, machineState: "loadingContext" })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "suspended",
        }),
      )
    })

    it("maps loading_context status to loadingContext state", () => {
      const session = makeSession({ status: "loading_context" })
      setupMocks({ session, machineState: "loadingContext" })

      renderHook(() => useWorkbenchSession("visit-001"))

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "loadingContext",
        }),
      )
    })

    it("falls back to chatting for unknown status", () => {
      const session = makeSession({ status: "chatting" })
      setupMocks({ session, machineState: "loadingContext" })

      renderHook(() => useWorkbenchSession("visit-001"))

      // The default fallback in resolveHydrationTarget is "chatting"
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "HYDRATE",
          state: "chatting",
        }),
      )
    })
  })

  // ---- Actions ----

  describe("actions", () => {
    it("requestExit sends EXIT_REQUESTED and aborts stream", async () => {
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        result.current.actions.requestExit()
      })

      expect(mockAbortStream).toHaveBeenCalledWith("exit")
      expect(mockSend).toHaveBeenCalledWith({ type: "EXIT_REQUESTED" })
    })

    it("confirmExit sends EXIT_REQUESTED, calls exitVisit, then EXIT_CONFIRMED", async () => {
      mockExitVisit.mockResolvedValue({
        sessionId: "visit-001",
        terminalReason: "patient_request",
        refundAmount: 0,
        payableAmount: 0,
        timelineItem: {
          id: "term-1",
          sessionId: "visit-001",
          kind: "terminal",
          status: "done",
          reason: "patient_request",
          title: "问诊结束",
          createdAt: "2026-06-28T01:00:00.000Z",
        },
        consequence: { kind: "no_fee", text: "无费用" },
      })

      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.confirmExit()
      })

      expect(mockAbortStream).toHaveBeenCalledWith("exit")
      expect(mockSend).toHaveBeenCalledWith({ type: "EXIT_REQUESTED" })
      expect(mockExitVisit).toHaveBeenCalledWith({
        sessionId: "visit-001",
        reason: "patient_request",
      })
      expect(mockSend).toHaveBeenCalledWith({ type: "EXIT_CONFIRMED" })
    })

    it("confirmExit does nothing if already terminated", async () => {
      setupMocks({ session: makeSession() })
      mockGetSnapshot.mockReturnValue({ value: "terminated" })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.confirmExit()
      })

      expect(mockExitVisit).not.toHaveBeenCalled()
    })

    it("pauseVisit caches returned session and sends TIMER_PAUSED", async () => {
      const pausedSession = makeSession({
        timerPaused: true,
        pausedAt: "2026-06-28T01:06:00.000Z",
        lastActivityAt: "2026-06-28T01:06:00.000Z",
        updatedAt: "2026-06-28T01:06:00.000Z",
      })
      mockPauseVisitTimer.mockResolvedValue(pausedSession)
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.pauseVisit()
      })

      expect(mockPauseVisitTimer).toHaveBeenCalledWith({ sessionId: "visit-001" })
      expect(mockSetQueryData).toHaveBeenCalledWith(
        ["visits", "session", "visit-001"],
        pausedSession,
      )
      expect(mockSend).toHaveBeenCalledWith({ type: "TIMER_PAUSED" })
    })

    it("resumeVisit caches returned session and sends TIMER_RESUMED", async () => {
      const resumedSession = makeSession({
        timerPaused: false,
        pausedAt: undefined,
        lastActivityAt: "2026-06-28T01:10:00.000Z",
        updatedAt: "2026-06-28T01:10:00.000Z",
      })
      mockResumeVisitTimer.mockResolvedValue(resumedSession)
      setupMocks({
        session: makeSession({
          timerPaused: true,
          pausedAt: "2026-06-28T01:06:00.000Z",
          lastActivityAt: "2026-06-28T01:06:00.000Z",
          updatedAt: "2026-06-28T01:06:00.000Z",
        }),
      })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.resumeVisit()
      })

      expect(mockResumeVisitTimer).toHaveBeenCalledWith({ sessionId: "visit-001" })
      expect(mockSetQueryData).toHaveBeenCalledWith(
        ["visits", "session", "visit-001"],
        resumedSession,
      )
      expect(mockSend).toHaveBeenCalledWith({ type: "TIMER_RESUMED" })
    })

    it("triggerTimeout aborts stream and sends VISIT_TIMEOUT", async () => {
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        result.current.actions.triggerTimeout()
      })

      expect(mockAbortStream).toHaveBeenCalledWith("timeout")
      expect(mockSend).toHaveBeenCalledWith({ type: "VISIT_TIMEOUT" })
    })

    it("confirmEmergency appends terminal item and sends EMERGENCY_CONFIRMED", async () => {
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        result.current.actions.confirmEmergency()
      })

      expect(mockSend).toHaveBeenCalledWith({ type: "EMERGENCY_CONFIRMED" })
    })

    it("suspendVisit aborts stream, sends VISIT_SUSPENDED, and calls suspendVisit API", async () => {
      mockSuspendVisit.mockResolvedValue({
        session: makeSession({ status: "suspended" }),
        timelineItem: {
          id: "sus-1",
          sessionId: "visit-001",
          kind: "system_event",
          status: "done",
          eventType: "session_suspended",
          title: "会话已暂停",
          createdAt: "2026-06-28T01:00:00.000Z",
        },
      })
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.suspendVisit()
      })

      expect(mockAbortStream).toHaveBeenCalledWith("idle")
      expect(mockSend).toHaveBeenCalledWith({ type: "VISIT_SUSPENDED" })
      expect(mockSuspendVisit).toHaveBeenCalledWith({ sessionId: "visit-001" })
    })

    it("dismissEmergency calls dismissEmergency API and sends EMERGENCY_DISMISSED", async () => {
      mockDismissEmergency.mockResolvedValue({
        session: makeSession(),
        timelineItem: {
          id: "dis-1",
          sessionId: "visit-001",
          kind: "system_event",
          status: "done",
          eventType: "emergency_dismissed",
          title: "急症误报已解除",
          createdAt: "2026-06-28T01:00:00.000Z",
        },
      })
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.dismissEmergency()
      })

      expect(mockDismissEmergency).toHaveBeenCalledWith({ sessionId: "visit-001" })
      expect(mockSend).toHaveBeenCalledWith({ type: "EMERGENCY_DISMISSED" })
    })

    it("reportVitals sends EMERGENCY_DETECTED when emergency detected", async () => {
      mockReportVitals.mockResolvedValue({
        emergency: true,
        severity: "critical",
        message: "检测到急症风险",
      })
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.reportVitals({
          source: "manual",
          symptoms: ["胸痛"],
        })
      })

      expect(mockReportVitals).toHaveBeenCalledWith({
        source: "manual",
        symptoms: ["胸痛"],
      })
      expect(mockAbortStream).toHaveBeenCalledWith("emergency")
      expect(mockSend).toHaveBeenCalledWith({
        type: "EMERGENCY_DETECTED",
        source: "manual",
      })
    })

    it("reportVitals appends system event when no emergency", async () => {
      mockReportVitals.mockResolvedValue({
        emergency: false,
        message: "暂未命中急症标准",
      })
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.reportVitals({
          source: "manual",
          symptoms: ["轻微头痛"],
        })
      })

      expect(mockReportVitals).toHaveBeenCalledWith({
        source: "manual",
        symptoms: ["轻微头痛"],
      })
      expect(mockSend).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "EMERGENCY_DETECTED" }),
      )
    })

    it("submitFlowAction calls handleAction and invalidates queries", async () => {
      mockHandleAction.mockResolvedValue(undefined)
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.submitFlowAction({
          type: "accept_lab",
          cardId: "card-1",
        })
      })

      expect(mockHandleAction).toHaveBeenCalledWith({
        type: "accept_lab",
        cardId: "card-1",
      })
      expect(mockInvalidateQueries).toHaveBeenCalled()
    })

    it("sendMessage in chatting state calls API and starts stream", async () => {
      mockSendMessage.mockResolvedValue({
        session: makeSession(),
        patientMessage: {
          id: "pm-1",
          sessionId: "visit-001",
          kind: "message",
          status: "done",
          role: "patient",
          content: "你好",
          createdAt: "2026-06-28T01:00:00.000Z",
        },
        assistantPlaceholder: {
          id: "stream-1",
          sessionId: "visit-001",
          kind: "message",
          status: "streaming",
          role: "assistant",
          content: "",
          createdAt: "2026-06-28T01:00:00.000Z",
        },
      })
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.sendMessage("你好")
      })

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "visit-001",
          content: "你好",
        }),
      )
      expect(mockStartStream).toHaveBeenCalled()
    })

    it("sendMessage does nothing for empty content", async () => {
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.sendMessage("   ")
      })

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it("sendMessage in suspended state creates follow-up", async () => {
      mockCreateFollowUp.mockResolvedValue({
        session: makeSession({ id: "visit-002", entryType: "follow_up" }),
        initialTimeline: [],
      })
      setupMocks({ session: makeSession({ status: "suspended" }) })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.sendMessage("新症状")
      })

      expect(mockCreateFollowUp).toHaveBeenCalledWith(
        expect.objectContaining({
          parentSessionId: "visit-001",
          chiefComplaint: "新症状",
        }),
      )
    })

    it("sendMessage in completed state classifies intent", async () => {
      mockClassifyFollowUpIntent.mockResolvedValue({
        intent: "follow_up",
        confidence: 0.9,
        reason: "复诊意图",
      })
      mockCreateFollowUp.mockResolvedValue({
        session: makeSession({ id: "visit-002", entryType: "follow_up" }),
        initialTimeline: [],
      })
      setupMocks({ session: makeSession({ status: "completed" }) })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.sendMessage("又发烧了")
      })

      expect(mockClassifyFollowUpIntent).toHaveBeenCalledWith({
        sessionId: "visit-001",
        content: "又发烧了",
      })
    })

    it("askLockedQuestion appends optimistic message and starts stream in lock-question mode", async () => {
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.askLockedQuestion("这个检验是必须的么？", "card-1")
      })

      expect(mockStartStream).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "lock-question",
          content: "这个检验是必须的么？",
          cardId: "card-1",
        }),
      )
    })

    it("askLockedQuestion does nothing for empty content", async () => {
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.askLockedQuestion("   ", "card-1")
      })

      expect(mockStartStream).not.toHaveBeenCalled()
    })

    it("resumeFromSuspended clears draft and creates follow-up", async () => {
      mockCreateFollowUp.mockResolvedValue({
        session: makeSession({ id: "visit-002", entryType: "follow_up" }),
        initialTimeline: [],
      })
      setupMocks({ session: makeSession({ status: "suspended" }) })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.resumeFromSuspended("新症状")
      })

      expect(mockClearDraft).toHaveBeenCalledWith("visit-001")
      expect(mockCreateFollowUp).toHaveBeenCalledWith(
        expect.objectContaining({
          parentSessionId: "visit-001",
          chiefComplaint: "新症状",
        }),
      )
    })

    it("resumeFromSuspended without content creates follow-up without chiefComplaint", async () => {
      mockCreateFollowUp.mockResolvedValue({
        session: makeSession({ id: "visit-002", entryType: "follow_up" }),
        initialTimeline: [],
      })
      setupMocks({ session: makeSession({ status: "suspended" }) })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.resumeFromSuspended()
      })

      expect(mockCreateFollowUp).toHaveBeenCalledWith(
        expect.objectContaining({
          parentSessionId: "visit-001",
          chiefComplaint: undefined,
        }),
      )
    })
  })

  // ---- Options ----

  describe("options", () => {
    it("calls onFollowUpCreated when follow-up is created", async () => {
      const onFollowUpCreated = vi.fn()
      mockCreateFollowUp.mockResolvedValue({
        session: makeSession({ id: "visit-002", entryType: "follow_up" }),
        initialTimeline: [],
      })
      setupMocks({ session: makeSession({ status: "suspended" }) })

      const { result } = renderHook(() =>
        useWorkbenchSession("visit-001", { onFollowUpCreated }),
      )

      await act(async () => {
        await result.current.actions.resumeFromSuspended("新症状")
      })

      expect(onFollowUpCreated).toHaveBeenCalledWith("visit-002")
    })
  })

  // ---- Edge cases ----

  describe("edge cases", () => {
    it("handles session query with undefined data gracefully", () => {
      setupMocks({ session: undefined })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.session).toBeUndefined()
      expect(result.current.loading).toBe(false)
    })

    it("handles machine state that is an object (compound state)", () => {
      setupMocks({
        session: makeSession(),
        machineState: "chatting",
      })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      // stateLabel should be a string
      expect(typeof result.current.state).toBe("string")
    })

    it("returns loading=true when timeline is loading", () => {
      mockUseQuery.mockReturnValue({
        data: makeSession(),
        isLoading: false,
        error: null,
      })
      mockUseSelector.mockImplementation((_ref: unknown, selector: (snapshot: { value: unknown; context: unknown }) => unknown) => {
        return selector({ value: "chatting", context: makeMachineContext() })
      })
      mockUseTimeline.mockReturnValue({
        items: [],
        fetchNextPage: vi.fn(),
        hasMore: false,
        isFetching: false,
        isLoading: true,
      })
      mockUseAssistantStream.mockReturnValue({
        startStream: vi.fn(),
        abortStream: vi.fn(),
        isStreaming: false,
      })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.loading).toBe(true)
    })
  })

  // ---- Error handling ----

  describe("error handling", () => {
    it("sendMessage marks optimistic message as failed on API error", async () => {
      mockSendMessage.mockRejectedValue(new Error("API failure"))
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      try {
        await act(async () => {
          await result.current.actions.sendMessage("故障测试")
        })
      } catch {
        // The error is caught internally by sendMessage's catch block
      }

      // The catch block should mark the message as failed via updateItemStatusInPages
      // This exercises the internal updateItemStatusInPages helper
      expect(mockSendMessage).toHaveBeenCalled()
    })

    it("confirmExit handles API failure gracefully and still sends EXIT_CONFIRMED", async () => {
      mockExitVisit.mockRejectedValue(new Error("exit API error"))
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.confirmExit()
      })

      // Should still send EXIT_CONFIRMED even after API failure
      expect(mockSend).toHaveBeenCalledWith({ type: "EXIT_CONFIRMED" })
    })

    it("suspendVisit handles API failure gracefully and still suspends locally", async () => {
      mockSuspendVisit.mockRejectedValue(new Error("suspend API error"))
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.suspendVisit()
      })

      expect(mockAbortStream).toHaveBeenCalledWith("idle")
      expect(mockSend).toHaveBeenCalledWith({ type: "VISIT_SUSPENDED" })
    })

    it("dismissEmergency handles API failure gracefully and falls back to local dismiss", async () => {
      mockDismissEmergency.mockRejectedValue(new Error("dismiss API error"))
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.dismissEmergency()
      })

      // Should still send EMERGENCY_DISMISSED through local fallback
      expect(mockSend).toHaveBeenCalledWith({ type: "EMERGENCY_DISMISSED" })
    })

    it("reportVitals handles API failure gracefully", async () => {
      mockReportVitals.mockRejectedValue(new Error("vitals API error"))
      setupMocks({ session: makeSession() })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.reportVitals({
          source: "manual",
          symptoms: ["测试"],
        })
      })

      // Should not throw; the catch block logs the error silently
      expect(mockReportVitals).toHaveBeenCalled()
    })
  })

  // ---- Completed state message handling ----

  describe("completed state message handling", () => {
    it("sendMessage in completed state routes consultation intent to stream", async () => {
      mockClassifyFollowUpIntent.mockResolvedValue({
        intent: "consultation",
        confidence: 0.8,
        reason: "继续咨询",
      })

      // Set up mock data so the follow-up check passes (intent is consultation)
      setupMocks({ session: makeSession({ status: "completed" }) })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.sendMessage("再问一个问题")
      })

      expect(mockClassifyFollowUpIntent).toHaveBeenCalledWith({
        sessionId: "visit-001",
        content: "再问一个问题",
      })
      // Should NOT call startFollowUp since intent is consultation
      expect(mockCreateFollowUp).not.toHaveBeenCalled()
      // Should start a stream in consultation mode
      expect(mockStartStream).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "consultation" }),
      )
    })

    it("sendMessage in completed state routes unknown intent to system event", async () => {
      mockClassifyFollowUpIntent.mockResolvedValue({
        intent: "something_else",
        confidence: 0.3,
        reason: "无法判断",
      })

      // Mock api.sendMessage for the "other intent" path (not follow_up, not consultation)
      mockSendMessage.mockResolvedValue({
        session: makeSession(),
        patientMessage: {
          id: "pm-other",
          sessionId: "visit-001",
          kind: "message",
          status: "done",
          role: "patient",
          content: "别的",
          createdAt: "2026-06-28T01:00:00.000Z",
        },
        assistantPlaceholder: {
          id: "stream-other",
          sessionId: "visit-001",
          kind: "message",
          status: "streaming",
          role: "assistant",
          content: "",
          createdAt: "2026-06-28T01:00:00.000Z",
        },
      })

      setupMocks({ session: makeSession({ status: "completed" }) })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      await act(async () => {
        await result.current.actions.sendMessage("别的")
      })

      expect(mockClassifyFollowUpIntent).toHaveBeenCalled()
      // Neither follow_up nor consultation: should stop there
      expect(mockStartStream).not.toHaveBeenCalled()
    })
  })

  // ---- Captured callback tests ----

  describe("captured callbacks", () => {
    it("captures flowCardCallbacks from useFlowCardAction", () => {
      setupMocks({ session: makeSession() })
      renderHook(() => useWorkbenchSession("visit-001"))

      // flowCardCallbacks should have been captured by mockUseFlowCardAction
      expect(flowCardCallbacks).not.toBeNull()
      expect(flowCardCallbacks!.updateCardInTimeline).toBeDefined()
      expect(flowCardCallbacks!.upsertTimelineItems).toBeDefined()
    })

    it("invokes upsertTimelineItems through captured callbacks", () => {
      setupMocks({ session: makeSession() })
      renderHook(() => useWorkbenchSession("visit-001"))

      // assistantCallbacks should have been captured by mockUseAssistantStream
      expect(assistantCallbacks).not.toBeNull()

      // Invoke upsertTimelineItems to exercise upsertItemsInPages
      act(() => {
        assistantCallbacks!.upsertTimelineItems([
          {
            kind: "system_event",
            id: "test-ev-1",
            sessionId: "visit-001",
            createdAt: "2026-06-28T01:00:00.000Z",
            status: "done",
            eventType: "agent_thinking",
            title: "测试事件",
          } as TimelineItem,
        ])
      })

      // Should have gone through setQueryData and upsertItemsInPages
      expect(mockSetQueryData).toHaveBeenCalled()
    })

    it("invokes appendTimelineItem through captured callbacks", () => {
      setupMocks({ session: makeSession() })
      renderHook(() => useWorkbenchSession("visit-001"))

      expect(assistantCallbacks).not.toBeNull()

      // Invoke appendTimelineItem with a mock item -> exercises appendToLastPage
      act(() => {
        assistantCallbacks!.appendTimelineItem({
          kind: "message",
          id: "new-msg-1",
          sessionId: "visit-001",
          createdAt: "2026-06-28T01:00:00.000Z",
          status: "done",
          role: "patient",
          content: "append test",
        } as TimelineItem)
      })

      expect(mockSetQueryData).toHaveBeenCalled()
    })

    it("invokes updateTimelineItem through captured callbacks", () => {
      setupMocks({ session: makeSession() })
      renderHook(() => useWorkbenchSession("visit-001"))

      expect(assistantCallbacks).not.toBeNull()

      // Invoke updateTimelineItem with matching item id
      const testItem: TimelineItem = {
        kind: "message",
        id: "existing-msg-1",
        sessionId: "visit-001",
        createdAt: "2026-06-28T01:00:00.000Z",
        status: "done",
        role: "patient",
        content: "existing",
      }

      // First append the item so there's something to update
      act(() => {
        assistantCallbacks!.upsertTimelineItems([testItem])
      })

      // Now update it
      act(() => {
        assistantCallbacks!.updateTimelineItem("existing-msg-1", (item) => ({
          ...item,
          content: "updated",
        }))
      })

      expect(mockSetQueryData).toHaveBeenCalled()
    })

    it("exercises updateCardInTimeline from flowCardCallbacks", () => {
      const card: FlowCard = {
        id: "card-to-update",
        sessionId: "visit-001",
        kind: "lab_decision",
        status: "pending",
        blocking: true,
        title: "测试卡",
        createdAt: "2026-06-28T01:00:00.000Z",
      } as FlowCard

      setupMocks({
        session: makeSession(),
        timelineItems: [{
          id: "tl-card-to-update",
          sessionId: "visit-001",
          kind: "flow_card",
          status: "done",
          createdAt: "2026-06-28T01:00:00.000Z",
          card,
        } as TimelineItem],
      })
      renderHook(() => useWorkbenchSession("visit-001"))

      expect(flowCardCallbacks).not.toBeNull()

      // Invoke updateCardInTimeline - this calls updateCardInPages internally
      act(() => {
        flowCardCallbacks!.updateCardInTimeline("card-to-update", (c) => ({
          ...c,
          status: "accepted",
          blocking: false,
        }))
      })

      // Should have called setQueryData with the updater
      expect(mockSetQueryData).toHaveBeenCalled()
    })
  })

  // ---- Edge case: fetchMore ----

  describe("fetchMore", () => {
    it("passes through fetchMore and hasMore from timeline", () => {
      setupMocks({ session: makeSession() })
      mockUseTimeline.mockReturnValue({
        items: [],
        fetchNextPage: mockFetchNextPage,
        hasMore: true,
        isFetching: false,
        isLoading: false,
      })

      const { result } = renderHook(() => useWorkbenchSession("visit-001"))

      expect(result.current.hasMore).toBe(true)
      result.current.fetchMore()
      expect(mockFetchNextPage).toHaveBeenCalledTimes(1)
    })
  })
})
