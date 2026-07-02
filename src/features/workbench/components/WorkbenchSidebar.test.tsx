import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { WorkbenchSidebar } from "@/features/workbench/components/WorkbenchSidebar"
import type { FlowProgressStep } from "@/features/workbench/utils/flow-progress"

describe("WorkbenchSidebar", () => {
  it("renders dynamic progress steps with status details", () => {
    const progressSteps: FlowProgressStep[] = [
      { id: "identity", label: "身份核验", status: "done" },
      { id: "inquiry", label: "问诊收集", status: "done" },
      {
        id: "payment",
        label: "检验缴费",
        status: "failed",
        description: "支付失败，请重新尝试。",
      },
    ]

    render(
      <WorkbenchSidebar
        patientName="张三"
        chiefComplaint="发热咽痛"
        sessionStatus="blocked"
        progressSteps={progressSteps}
      />,
    )

    expect(screen.getByText("张三")).toBeInTheDocument()
    expect(screen.getByText("发热咽痛")).toBeInTheDocument()
    expect(screen.getByText("等待确认")).toBeInTheDocument()
    expect(screen.getByText("身份核验")).toBeInTheDocument()
    expect(screen.getByText("问诊收集")).toBeInTheDocument()
    expect(screen.getByText("检验缴费")).toBeInTheDocument()
    expect(screen.getByText("支付失败，请重新尝试。")).toBeInTheDocument()
  })
})
