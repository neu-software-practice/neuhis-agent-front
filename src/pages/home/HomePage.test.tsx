import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const navigate = vi.fn()
const listQueryFn = vi.fn()
const createSessionMutationFn = vi.fn().mockRejectedValue(new Error("not ready"))

vi.mock("react-router", () => ({
  useNavigate: () => navigate,
}))

vi.mock("@/features/auth/store/auth-store", () => ({
  useAuthStore: (selector: (state: { user: { patientId: string } | null }) => unknown) =>
    selector({ user: { patientId: "patient-mock-001" } }),
}))

vi.mock("@/features/visits/api/queries", () => ({
  visitsQueries: {
    list: () => ({
      queryKey: ["visits", "list", {}],
      queryFn: listQueryFn,
    }),
  },
  visitsMutations: {
    createSession: () => ({
      mutationFn: createSessionMutationFn,
    }),
  },
}))

import HomePage from "@/pages/home/HomePage"

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWith(ui: ReactNode) {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  )
}

describe("HomePage", () => {
  beforeEach(() => {
    navigate.mockReset()
    listQueryFn.mockReset()
    createSessionMutationFn.mockReset()
    createSessionMutationFn.mockRejectedValue(new Error("not ready"))
  })

  it("renders the title", () => {
    listQueryFn.mockResolvedValue({ items: [] })
    renderWith(<HomePage />)
    expect(screen.getByText("东软云脑智能医疗")).toBeInTheDocument()
  })

  it("renders the symptom textarea and label", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<HomePage />)
    expect(screen.getByLabelText("今天哪里不舒服？")).toBeInTheDocument()
  })

  it("renders common symptom quick-fill buttons", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<HomePage />)
    expect(screen.getByText("发烧")).toBeInTheDocument()
    expect(screen.getByText("咳嗽")).toBeInTheDocument()
    expect(screen.getByText("咽痛")).toBeInTheDocument()
    expect(screen.getByText("头痛")).toBeInTheDocument()
    expect(screen.getByText("腹痛")).toBeInTheDocument()
    expect(screen.getByText("乏力")).toBeInTheDocument()
  })

  it("renders the start consultation button", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<HomePage />)
    expect(screen.getByText("开始问诊")).toBeInTheDocument()
  })

  it("clicking a symptom button fills the textarea", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<HomePage />)
    const textarea = screen.getByLabelText("今天哪里不舒服？") as HTMLTextAreaElement
    fireEvent.click(screen.getByText("发烧"))
    expect(textarea.value).toContain("发烧")
  })

  it("does not duplicate a symptom when clicking it twice", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<HomePage />)
    const textarea = screen.getByLabelText("今天哪里不舒服？") as HTMLTextAreaElement
    const feverBtn = screen.getAllByText("发烧")[0] as HTMLElement
    fireEvent.click(feverBtn)
    fireEvent.click(feverBtn)
    expect(textarea.value).toBe("发烧")
  })

  it("adds multiple symptoms separated by 、", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<HomePage />)
    const textarea = screen.getByLabelText("今天哪里不舒服？") as HTMLTextAreaElement
    fireEvent.click(screen.getAllByText("发烧")[0])
    fireEvent.click(screen.getAllByText("咳嗽")[0])
    expect(textarea.value).toBe("发烧、咳嗽")
  })

  it("shows loading state when sessions loading", () => {
    listQueryFn.mockReturnValue(new Promise(() => {}))
    renderWith(<HomePage />)
    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("shows empty state when no sessions exist and data loaded", async () => {
    listQueryFn.mockResolvedValue({ items: [] })
    renderWith(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText("欢迎使用东软云脑智能医疗")).toBeInTheDocument()
    })
  })

  it("shows no active session message when sessions exist but none active", async () => {
    listQueryFn.mockResolvedValue({
      items: [
        {
          id: "visit-completed",
          patientId: "patient-mock-001",
          status: "completed",
          startedAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T01:00:00.000Z",
          summary: { chiefComplaint: "发热" },
        },
      ],
    })
    renderWith(<HomePage />)
    await waitFor(() => {
      expect(screen.getByText("暂无进行中的问诊")).toBeInTheDocument()
    })
  })

  it("renders continue consultation section for active session", async () => {
    listQueryFn.mockResolvedValue({
      items: [
        {
          id: "visit-active",
          patientId: "patient-mock-001",
          patientName: "李明",
          entryType: "new",
          status: "chatting",
          startedAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T01:00:00.000Z",
          summary: { chiefComplaint: "发热", lastMessage: "请描述" },
        },
      ],
    })
    renderWith(<HomePage />)
    await waitFor(() => {
      expect(screen.getAllByText("继续就诊").length).toBeGreaterThan(0)
    })
  })

  it("navigates to /workbench/new when createSession fails (fallback)", async () => {
    listQueryFn.mockResolvedValue({ items: [] })
    createSessionMutationFn.mockRejectedValueOnce(new Error("unavailable"))
    renderWith(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText("欢迎使用东软云脑智能医疗")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("开始问诊"))
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/workbench/new")
    })
  })

  it("passes draft text as search param in fallback navigation", async () => {
    listQueryFn.mockResolvedValue({ items: [] })
    createSessionMutationFn.mockRejectedValueOnce(new Error("unavailable"))
    renderWith(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText("欢迎使用东软云脑智能医疗")).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText("今天哪里不舒服？") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "发烧两天" } })
    fireEvent.click(screen.getByText("开始问诊"))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        "/workbench/new?draft=%E5%8F%91%E7%83%A7%E4%B8%A4%E5%A4%A9",
      )
    })
  })

  it("shows 创建中… while the mutation is pending", async () => {
    listQueryFn.mockResolvedValue({ items: [] })
    // Keep the promise pending to observe the loading state.
    createSessionMutationFn.mockReturnValue(new Promise(() => {}))
    renderWith(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText("欢迎使用东软云脑智能医疗")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("开始问诊"))
    await waitFor(() => {
      expect(screen.getByText("创建中…")).toBeInTheDocument()
    })
  })

  it("navigates to workbench on successful session creation", async () => {
    listQueryFn.mockResolvedValue({ items: [] })
    createSessionMutationFn.mockResolvedValue({
      session: { id: "new-session-001" },
    })
    renderWith(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText("欢迎使用东软云脑智能医疗")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("开始问诊"))
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/workbench/new-session-001")
    })
  })

  it("navigates to workbench on continue session click", async () => {
    listQueryFn.mockResolvedValue({
      items: [
        {
          id: "visit-active",
          patientId: "patient-mock-001",
          patientName: "李明",
          status: "chatting",
          startedAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T01:00:00.000Z",
          summary: { chiefComplaint: "发热", lastMessage: "请描述" },
        },
      ],
    })
    renderWith(<HomePage />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /继续就诊/ })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /继续就诊/ }))
    expect(navigate).toHaveBeenCalledWith("/workbench/visit-active")
  })
})
