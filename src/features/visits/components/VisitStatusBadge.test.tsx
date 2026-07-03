import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { VisitStatus } from "@/lib/api/types"
import { VisitStatusBadge } from "@/features/visits/components/VisitStatusBadge"

describe("VisitStatusBadge", () => {
  it("renders the Chinese label for a chatting status", () => {
    render(<VisitStatusBadge status="chatting" />)
    expect(screen.getByText("问诊中")).toBeInTheDocument()
  })

  it("renders the Chinese label for a completed status", () => {
    render(<VisitStatusBadge status="completed" />)
    expect(screen.getByText("已完成")).toBeInTheDocument()
  })

  it("renders the Chinese label for a blocked status", () => {
    render(<VisitStatusBadge status="blocked" />)
    expect(screen.getByText("待决策")).toBeInTheDocument()
  })

  it("renders the Chinese label for a suspended status", () => {
    render(<VisitStatusBadge status="suspended" />)
    expect(screen.getByText("已暂停")).toBeInTheDocument()
  })

  it("renders the Chinese label for a transferred status", () => {
    render(<VisitStatusBadge status="transferred" />)
    expect(screen.getByText("已转诊")).toBeInTheDocument()
  })

  it("renders the Chinese label for an emergency_terminated status", () => {
    render(<VisitStatusBadge status="emergency_terminated" />)
    expect(screen.getByText("急症终止")).toBeInTheDocument()
  })

  it("renders the Chinese label for an exited status", () => {
    render(<VisitStatusBadge status="exited" />)
    expect(screen.getByText("已退出")).toBeInTheDocument()
  })

  it.each([
    "loading_context",
    "analyzing",
    "diagnosis",
    "treatment",
  ] as VisitStatus[])("renders a label for %s", (status) => {
    render(<VisitStatusBadge status={status} />)
    expect(screen.getByText(/\S+/)).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <VisitStatusBadge status="chatting" className="custom-cls" />,
    )
    expect(container.querySelector(".custom-cls")).toBeInTheDocument()
  })
})
