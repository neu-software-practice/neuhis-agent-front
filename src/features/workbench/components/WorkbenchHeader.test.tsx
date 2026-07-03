import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { WorkbenchHeader } from "@/features/workbench/components/WorkbenchHeader"

describe("WorkbenchHeader", () => {
  it("renders default AI name", () => {
    render(<WorkbenchHeader />)
    expect(screen.getByText("AI 医生助手")).toBeInTheDocument()
  })

  it("renders custom AI name", () => {
    render(<WorkbenchHeader aiName="云脑医生" />)
    expect(screen.getByText("云脑医生")).toBeInTheDocument()
  })

  it("renders AI avatar text when provided", () => {
    render(<WorkbenchHeader aiAvatar="AI" />)
    expect(screen.getByText("AI")).toBeInTheDocument()
  })

  it("renders default logo when no avatar provided", () => {
    const { container } = render(<WorkbenchHeader />)
    expect(container.querySelector("img[alt='AI 医生头像']")).toBeInTheDocument()
  })

  it("renders pause button when timer is not paused and not terminated", () => {
    render(
      <WorkbenchHeader
        timerPaused={false}
        isTerminated={false}
        onPause={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "暂停计时" }),
    ).toBeInTheDocument()
  })

  it("renders resume button when timer is paused and not terminated", () => {
    render(
      <WorkbenchHeader
        timerPaused={true}
        isTerminated={false}
        onResume={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "恢复计时" }),
    ).toBeInTheDocument()
  })

  it("invokes onPause when pause button is clicked", async () => {
    const user = userEvent.setup()
    const onPause = vi.fn()

    render(
      <WorkbenchHeader
        timerPaused={false}
        isTerminated={false}
        onPause={onPause}
      />,
    )

    await user.click(screen.getByRole("button", { name: "暂停计时" }))
    expect(onPause).toHaveBeenCalledTimes(1)
  })

  it("invokes onResume when resume button is clicked", async () => {
    const user = userEvent.setup()
    const onResume = vi.fn()

    render(
      <WorkbenchHeader
        timerPaused={true}
        isTerminated={false}
        onResume={onResume}
      />,
    )

    await user.click(screen.getByRole("button", { name: "恢复计时" }))
    expect(onResume).toHaveBeenCalledTimes(1)
  })

  it("renders emergency button when not terminated", () => {
    render(
      <WorkbenchHeader
        isTerminated={false}
        onReportEmergency={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "急症求助" }),
    ).toBeInTheDocument()
  })

  it("invokes onReportEmergency when emergency button is clicked", async () => {
    const user = userEvent.setup()
    const onReportEmergency = vi.fn()

    render(
      <WorkbenchHeader
        isTerminated={false}
        onReportEmergency={onReportEmergency}
      />,
    )

    await user.click(screen.getByRole("button", { name: "急症求助" }))
    expect(onReportEmergency).toHaveBeenCalledTimes(1)
  })

  it("renders exit button when not terminated", () => {
    render(
      <WorkbenchHeader isTerminated={false} onExit={vi.fn()} />,
    )

    expect(
      screen.getByRole("button", { name: "退出问诊" }),
    ).toBeInTheDocument()
  })

  it("invokes onExit when exit button is clicked", async () => {
    const user = userEvent.setup()
    const onExit = vi.fn()

    render(
      <WorkbenchHeader isTerminated={false} onExit={onExit} />,
    )

    await user.click(screen.getByRole("button", { name: "退出问诊" }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it("renders timeout warning when provided", () => {
    render(
      <WorkbenchHeader
        isTerminated={false}
        timeoutWarning="剩余 5 分钟"
      />,
    )

    expect(screen.getByText("剩余 5 分钟")).toBeInTheDocument()
  })

  it("does not render timeout warning when not provided", () => {
    render(<WorkbenchHeader isTerminated={false} />)

    // No danger-colored timeout text
    expect(screen.queryByText(/剩余/)).not.toBeInTheDocument()
  })

  it("hides action buttons when isTerminated is true", () => {
    render(
      <WorkbenchHeader
        isTerminated={true}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onReportEmergency={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole("button", { name: "暂停计时" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "恢复计时" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "急症求助" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "退出问诊" }),
    ).not.toBeInTheDocument()
  })

  it("renders close button when isTerminated is true", () => {
    render(
      <WorkbenchHeader isTerminated={true} onExit={vi.fn()} />,
    )

    expect(
      screen.getByRole("button", { name: "关闭" }),
    ).toBeInTheDocument()
  })

  it("invokes onExit when close button is clicked in terminated state", async () => {
    const user = userEvent.setup()
    const onExit = vi.fn()

    render(
      <WorkbenchHeader isTerminated={true} onExit={onExit} />,
    )

    await user.click(screen.getByRole("button", { name: "关闭" }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it("renders close button as the only button in terminated state", () => {
    render(
      <WorkbenchHeader
        isTerminated={true}
        onExit={vi.fn()}
      />,
    )

    // Only close button should be present
    expect(screen.getByRole("button", { name: "关闭" })).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "暂停计时" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "恢复计时" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "急症求助" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "退出问诊" }),
    ).not.toBeInTheDocument()
  })

  it("renders buttons even when all callbacks are undefined", () => {
    render(<WorkbenchHeader />)

    // Default AI name
    expect(screen.getByText("AI 医生助手")).toBeInTheDocument()
    // All buttons should still render (with undefined handlers)
    expect(
      screen.getByRole("button", { name: "暂停计时" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "急症求助" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "退出问诊" }),
    ).toBeInTheDocument()
  })

  it("renders close button when terminated but onExit not provided", () => {
    render(<WorkbenchHeader isTerminated={true} />)

    // Close button renders even without handler
    expect(screen.getByRole("button", { name: "关闭" })).toBeInTheDocument()
  })

  it("renders timeout warning together with pause button", () => {
    render(
      <WorkbenchHeader
        timerPaused={false}
        timeoutWarning="剩余 5 分钟"
        onPause={vi.fn()}
      />,
    )

    expect(screen.getByText("剩余 5 分钟")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "暂停计时" }),
    ).toBeInTheDocument()
  })

  it("renders timeout warning together with resume button", () => {
    render(
      <WorkbenchHeader
        timerPaused={true}
        timeoutWarning="剩余 5 分钟"
        onResume={vi.fn()}
      />,
    )

    expect(screen.getByText("剩余 5 分钟")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "恢复计时" }),
    ).toBeInTheDocument()
  })

  it("all buttons have type='button' attribute", () => {
    render(
      <WorkbenchHeader
        onPause={vi.fn()}
        onResume={vi.fn()}
        onReportEmergency={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    const buttons = screen.getAllByRole("button")
    buttons.forEach((button) => {
      expect(button).toHaveAttribute("type", "button")
    })
  })

  it("renders with empty aiAvatar (falls back to img)", () => {
    const { container } = render(<WorkbenchHeader aiAvatar="" />)

    // Empty string is falsy, so img should render
    expect(container.querySelector("img")).toBeInTheDocument()
  })

  it("does not render timeout warning text when not provided", () => {
    render(<WorkbenchHeader timerPaused={false} />)

    expect(screen.queryByText(/剩余/)).not.toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <WorkbenchHeader className="custom-header" />,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain("custom-header")
  })
})
