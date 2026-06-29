import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import NewWorkbenchPage from "@/pages/workbench/NewWorkbenchPage"
import type { NewWorkbenchLoaderData } from "@/pages/workbench/workbench-loaders"
import { visitsApi } from "@/features/visits/api"
import { visitsQueryKeys } from "@/features/visits/api/queries"
import { workbenchQueryKeys } from "@/features/workbench/api/queries"
import { mockDb } from "@/mocks/api/mock-db"

const navigate = vi.fn()
let loaderData: NewWorkbenchLoaderData

vi.mock("react-router", () => ({
  useLoaderData: () => loaderData,
  useNavigate: () => navigate,
}))

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  )
  return queryClient
}

describe("NewWorkbenchPage", () => {
  beforeEach(() => {
    mockDb.reset()
    navigate.mockReset()
    vi.unstubAllEnvs()
    loaderData = {
      draft: "咽痛、低热",
      followUpFrom: "visit-mock-completed",
    }
  })

  it("seeds query cache with follow-up session and timeline before navigating", async () => {
    const queryClient = renderWithQueryClient(<NewWorkbenchPage />)

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled()
    })

    const [target] = navigate.mock.calls[0]
    const sessionId = String(target).split("/").at(-1)
    expect(sessionId).toBeTruthy()

    expect(queryClient.getQueryData(visitsQueryKeys.session(sessionId!))).toEqual(
      expect.objectContaining({
        id: sessionId,
        entryType: "follow_up",
        parentSessionId: "visit-mock-completed",
      }),
    )
    expect(queryClient.getQueryData(workbenchQueryKeys.timeline(sessionId!))).toEqual(
      expect.objectContaining({
        pages: [
          expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({ kind: "system_event" }),
              expect.objectContaining({ kind: "message", content: "咽痛、低热" }),
            ]),
          }),
        ],
      }),
    )
  })

  it("calls createFollowUp for completed-session follow-up requests", async () => {
    const createFollowUpSpy = vi.spyOn(visitsApi, "createFollowUp")

    renderWithQueryClient(<NewWorkbenchPage />)

    await waitFor(() => {
      expect(createFollowUpSpy).toHaveBeenCalledWith({
        patientId: "patient-mock-001",
        parentSessionId: "visit-mock-completed",
        chiefComplaint: "咽痛、低热",
      })
    })
  })

  it("shows retry instead of staying pending when follow-up creation hangs", async () => {
    vi.stubEnv("VITE_CREATE_VISIT_TIMEOUT_MS", "1")
    vi.spyOn(visitsApi, "createFollowUp").mockReturnValue(new Promise(() => {}))

    renderWithQueryClient(<NewWorkbenchPage />)

    await waitFor(() => {
      expect(screen.getByText("正在准备复诊...")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText("创建问诊失败")).toBeInTheDocument()
    })
    expect(screen.getByText("复诊创建超时，请重试。")).toBeInTheDocument()
  })
})
