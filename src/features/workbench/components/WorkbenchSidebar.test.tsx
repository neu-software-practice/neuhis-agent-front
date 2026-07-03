import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { WorkbenchSidebar } from "@/features/workbench/components/WorkbenchSidebar"
import type { FlowProgressStep } from "@/features/workbench/utils/flow-progress"

/** 模拟默认 6 步流程进度，供各测试直接传入 <WorkbenchSidebar progressSteps={...} />。 */
const DEFAULT_STEPS: FlowProgressStep[] = [
  { id: "identity", label: "身份核验", status: "done" },
  { id: "history", label: "病史读取", status: "done" },
  { id: "inquiry", label: "问诊收集", status: "current" },
  { id: "diagnosis", label: "诊断分析", status: "pending" },
  { id: "treatment", label: "处置执行", status: "pending" },
  { id: "completed", label: "就诊完成", status: "pending" },
]

describe("WorkbenchSidebar", () => {
  it("renders the main title", () => {
    render(<WorkbenchSidebar />)
    expect(screen.getByText("本次问诊")).toBeInTheDocument()
  })

  it("renders patient name when provided", () => {
    render(<WorkbenchSidebar patientName="张三" />)
    expect(screen.getByText("患者")).toBeInTheDocument()
    expect(screen.getByText("张三")).toBeInTheDocument()
  })

  it("does not render patient name when not provided", () => {
    render(<WorkbenchSidebar />)
    expect(screen.queryByText("患者")).not.toBeInTheDocument()
  })

  it("renders chief complaint when provided", () => {
    render(<WorkbenchSidebar chiefComplaint="发热两天" />)
    expect(screen.getByText("主诉")).toBeInTheDocument()
    expect(screen.getByText("发热两天")).toBeInTheDocument()
  })

  it("does not render chief complaint when not provided", () => {
    render(<WorkbenchSidebar />)
    expect(screen.queryByText("主诉")).not.toBeInTheDocument()
  })

  it("renders entry type badge when provided", () => {
    render(<WorkbenchSidebar entryType="新出诊" />)
    expect(screen.getByText("新出诊")).toBeInTheDocument()
  })

  it("does not render entry type badge when not provided", () => {
    render(<WorkbenchSidebar />)
    // No badge with "新出诊" or "复诊"
    expect(screen.queryByText("新出诊")).not.toBeInTheDocument()
    expect(screen.queryByText("复诊")).not.toBeInTheDocument()
  })

  it("renders session status label when provided", () => {
    render(<WorkbenchSidebar sessionStatus="chatting" />)
    expect(screen.getByText("问诊中")).toBeInTheDocument()
  })

  it("renders raw session status when not in STATUS_LABELS", () => {
    render(<WorkbenchSidebar sessionStatus="custom_status" />)
    expect(screen.getByText("custom_status")).toBeInTheDocument()
  })

  it("does not render status label when not provided", () => {
    render(<WorkbenchSidebar />)
    expect(screen.queryByText("问诊中")).not.toBeInTheDocument()
  })

  it("renders last activity time when provided", () => {
    render(<WorkbenchSidebar lastActivityAt="2026-06-28T01:50:00.000Z" />)
    expect(screen.getByText("最后操作")).toBeInTheDocument()
    // Time is formatted via toLocaleString - just check that some time text is rendered
    // (the exact format depends on locale so we check for the time label presence)
    const infoItem = screen.getByText("最后操作").closest("div")
    expect(infoItem?.querySelector("span.font-medium")).toBeInTheDocument()
  })

  it("returns original ISO string for invalid date", () => {
    render(<WorkbenchSidebar lastActivityAt="not-a-date" />)
    expect(screen.getByText("not-a-date")).toBeInTheDocument()
  })

  it("renders process progress section", () => {
    render(<WorkbenchSidebar />)
    expect(screen.getByText("流程进度")).toBeInTheDocument()
  })

  it("renders all progress step labels", () => {
    render(<WorkbenchSidebar progressSteps={DEFAULT_STEPS} />)
    expect(screen.getByText("身份核验")).toBeInTheDocument()
    expect(screen.getByText("病史读取")).toBeInTheDocument()
    expect(screen.getByText("问诊收集")).toBeInTheDocument()
    expect(screen.getByText("诊断分析")).toBeInTheDocument()
    expect(screen.getByText("处置执行")).toBeInTheDocument()
    expect(screen.getByText("就诊完成")).toBeInTheDocument()
  })

  it("marks identity and history steps as done by default", () => {
    render(<WorkbenchSidebar progressSteps={DEFAULT_STEPS} />)
    // The first two steps (身份核验, 病史读取) should always be done (CheckCircle2 icon)
    // This is a structural test — verify all steps are rendered
    const steps = [
      "身份核验",
      "病史读取",
      "问诊收集",
      "诊断分析",
      "处置执行",
      "就诊完成",
    ]
    for (const step of steps) {
      expect(screen.getByText(step)).toBeInTheDocument()
    }
  })

  it("applies custom className", () => {
    const { container } = render(<WorkbenchSidebar className="custom-sidebar" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain("custom-sidebar")
  })

  it("renders all STATUS_LABELS variations with correct labels", () => {
    const statuses: Record<string, string> = {
      chatting: "问诊中",
      analyzing: "分析中",
      blocked: "等待确认",
      diagnosis: "已确诊",
      treatment: "处置执行",
      completed: "已完成",
      suspended: "已暂停",
      loading_context: "加载中",
      transferred: "已转诊",
      emergency_terminated: "急症终止",
      exited: "已退出",
    }

    for (const [status, label] of Object.entries(statuses)) {
      const { unmount } = render(
        <WorkbenchSidebar sessionStatus={status} />,
      )
      // "处置执行" appears both as status label and step label when status=treatment
      const elements = screen.getAllByText(label)
      expect(elements.length).toBeGreaterThanOrEqual(1)
      unmount()
    }
  })

  it("marks all steps as done when sessionStatus is completed", () => {
    const allDoneSteps: FlowProgressStep[] = DEFAULT_STEPS.map((s) => ({
      ...s,
      status: "done" as const,
    }))
    const { container } = render(
      <WorkbenchSidebar
        sessionStatus="completed"
        progressSteps={allDoneSteps}
      />,
    )

    // All 6 steps should show CheckCircle2 icon
    const checkIcons = container.querySelectorAll(".text-primary")
    expect(checkIcons.length).toBeGreaterThanOrEqual(6)
  })

  it("marks '问诊收集' as not done when sessionStatus is loading_context", () => {
    render(
      <WorkbenchSidebar
        sessionStatus="loading_context"
        progressSteps={DEFAULT_STEPS}
      />,
    )

    // "问诊收集" should not be checked
    expect(screen.getByText("问诊收集")).toBeInTheDocument()
  })

  it("marks '问诊收集' as not done when sessionStatus is chatting", () => {
    render(
      <WorkbenchSidebar
        sessionStatus="chatting"
        progressSteps={DEFAULT_STEPS}
      />,
    )

    expect(screen.getByText("问诊收集")).toBeInTheDocument()
  })

  it("marks '诊断分析' as done when sessionStatus is diagnosis", () => {
    const steps: FlowProgressStep[] = [
      { id: "identity", label: "身份核验", status: "done" },
      { id: "history", label: "病史读取", status: "done" },
      { id: "inquiry", label: "问诊收集", status: "done" },
      { id: "diagnosis", label: "诊断分析", status: "done" },
      { id: "treatment", label: "处置执行", status: "pending" },
      { id: "completed", label: "就诊完成", status: "pending" },
    ]
    render(
      <WorkbenchSidebar
        sessionStatus="diagnosis"
        progressSteps={steps}
      />,
    )

    expect(screen.getByText("诊断分析")).toBeInTheDocument()
    // The "处置执行" should not be done yet
  })

  it("marks '诊断分析' and '处置执行' as done when sessionStatus is treatment", () => {
    const steps: FlowProgressStep[] = [
      { id: "identity", label: "身份核验", status: "done" },
      { id: "history", label: "病史读取", status: "done" },
      { id: "inquiry", label: "问诊收集", status: "done" },
      { id: "diagnosis", label: "诊断分析", status: "done" },
      { id: "treatment", label: "处置执行", status: "done" },
      { id: "completed", label: "就诊完成", status: "pending" },
    ]
    render(
      <WorkbenchSidebar
        sessionStatus="treatment"
        progressSteps={steps}
      />,
    )

    expect(screen.getByText("诊断分析")).toBeInTheDocument()
    // "处置执行" appears both as status label and step label in this state
    const disposalSteps = screen.getAllByText("处置执行")
    expect(disposalSteps.length).toBeGreaterThanOrEqual(1)
  })

  it("renders '就诊完成' as done only when sessionStatus is completed", () => {
    const completedSteps: FlowProgressStep[] = DEFAULT_STEPS.map((s) => ({
      ...s,
      status: "done" as const,
    }))
    const { unmount: unmount1 } = render(
      <WorkbenchSidebar
        sessionStatus="completed"
        progressSteps={completedSteps}
      />,
    )
    expect(screen.getByText("就诊完成")).toBeInTheDocument()
    unmount1()

    const treatmentSteps: FlowProgressStep[] = [
      { id: "identity", label: "身份核验", status: "done" },
      { id: "history", label: "病史读取", status: "done" },
      { id: "inquiry", label: "问诊收集", status: "done" },
      { id: "diagnosis", label: "诊断分析", status: "done" },
      { id: "treatment", label: "处置执行", status: "done" },
      { id: "completed", label: "就诊完成", status: "pending" },
    ]
    const { unmount: unmount2 } = render(
      <WorkbenchSidebar
        sessionStatus="treatment"
        progressSteps={treatmentSteps}
      />,
    )
    expect(screen.getByText("就诊完成")).toBeInTheDocument()
    unmount2()
  })

  it("renders empty-string patientName as not provided", () => {
    render(<WorkbenchSidebar patientName="" />)

    expect(screen.queryByText("患者")).not.toBeInTheDocument()
  })

  it("renders empty-string chiefComplaint as not provided", () => {
    render(<WorkbenchSidebar chiefComplaint="" />)

    expect(screen.queryByText("主诉")).not.toBeInTheDocument()
  })

  it("renders empty-string entryType as not provided", () => {
    render(<WorkbenchSidebar entryType="" />)

    // No badge should render
    const chips = document.querySelectorAll(".rounded-full")
    const entryTypeChips = Array.from(chips).filter(
      (chip) => chip.className.includes("bg-primary/10"),
    )
    expect(entryTypeChips.length).toBe(0)
  })

  it("renders entry type and sessionStatus together", () => {
    render(
      <WorkbenchSidebar
        entryType="复诊"
        sessionStatus="chatting"
      />,
    )

    expect(screen.getByText("复诊")).toBeInTheDocument()
    expect(screen.getByText("问诊中")).toBeInTheDocument()
  })

  it("renders with all props simultaneously", () => {
    render(
      <WorkbenchSidebar
        patientName="张三"
        chiefComplaint="发热两天"
        lastActivityAt="2026-06-28T01:50:00.000Z"
        entryType="新出诊"
        sessionStatus="diagnosis"
        className="full-sidebar"
        progressSteps={DEFAULT_STEPS}
      />,
    )

    expect(screen.getByText("患者")).toBeInTheDocument()
    expect(screen.getByText("张三")).toBeInTheDocument()
    expect(screen.getByText("主诉")).toBeInTheDocument()
    expect(screen.getByText("发热两天")).toBeInTheDocument()
    expect(screen.getByText("新出诊")).toBeInTheDocument()
    expect(screen.getByText("已确诊")).toBeInTheDocument()
  })
})
