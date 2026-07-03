import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { BillingRecord } from "@/features/billing/api/types"
import { BillingRecordCard } from "@/features/billing/components/BillingRecordCard"

function makeRecord(overrides: Partial<BillingRecord> = {}): BillingRecord {
  return {
    paymentId: "pay-1",
    sessionId: "visit-1",
    sessionTitle: "头痛问诊",
    purpose: "lab",
    items: [
      { name: "血常规", amount: 50, quantity: 1 },
      { name: "尿常规", amount: 30 },
    ],
    totalAmount: 80,
    insuranceAmount: 60,
    selfPayAmount: 20,
    paymentStatus: "paid",
    createdAt: "2025-03-15T10:30:00.000Z",
    ...overrides,
  }
}

describe("BillingRecordCard", () => {
  it("renders the session title", () => {
    render(<BillingRecordCard record={makeRecord({ sessionTitle: "感冒问诊" })} />)
    expect(screen.getByText("感冒问诊")).toBeInTheDocument()
  })

  it("renders item names", () => {
    render(<BillingRecordCard record={makeRecord()} />)
    expect(screen.getByText(/血常规/)).toBeInTheDocument()
    expect(screen.getByText(/尿常规/)).toBeInTheDocument()
  })

  it("renders item amounts formatted to 2 decimals", () => {
    render(<BillingRecordCard record={makeRecord()} />)
    expect(screen.getByText("¥50.00")).toBeInTheDocument()
    expect(screen.getByText("¥30.00")).toBeInTheDocument()
  })

  it("renders quantity suffix when quantity is present", () => {
    render(
      <BillingRecordCard
        record={makeRecord({
          items: [{ name: "血常规", amount: 50, quantity: 3 }],
        })}
      />,
    )
    expect(screen.getByText(/×3/)).toBeInTheDocument()
  })

  it("does not render quantity suffix when quantity is absent", () => {
    render(
      <BillingRecordCard
        record={makeRecord({
          items: [{ name: "血常规", amount: 50 }],
        })}
      />,
    )
    expect(screen.queryByText("×")).not.toBeInTheDocument()
  })

  it("renders the total amount", () => {
    render(<BillingRecordCard record={makeRecord({ totalAmount: 125.5 })} />)
    expect(screen.getByText("¥125.50")).toBeInTheDocument()
  })

  it("renders insurance and self-pay amounts", () => {
    render(
      <BillingRecordCard
        record={makeRecord({ insuranceAmount: 40, selfPayAmount: 60 })}
      />,
    )
    expect(screen.getByText("医保 ¥40.00")).toBeInTheDocument()
    expect(screen.getByText("自费 ¥60.00")).toBeInTheDocument()
  })

  it("renders the paid status badge", () => {
    render(<BillingRecordCard record={makeRecord({ paymentStatus: "paid" })} />)
    expect(screen.getByText("已支付")).toBeInTheDocument()
  })

  it("renders the unpaid status badge", () => {
    render(<BillingRecordCard record={makeRecord({ paymentStatus: "unpaid" })} />)
    expect(screen.getByText("未支付")).toBeInTheDocument()
  })

  it("renders the pending status badge", () => {
    render(<BillingRecordCard record={makeRecord({ paymentStatus: "pending" })} />)
    expect(screen.getByText("支付中")).toBeInTheDocument()
  })

  it("renders the failed status badge", () => {
    render(<BillingRecordCard record={makeRecord({ paymentStatus: "failed" })} />)
    expect(screen.getByText("支付失败")).toBeInTheDocument()
  })

  it("renders the refunded status badge", () => {
    render(<BillingRecordCard record={makeRecord({ paymentStatus: "refunded" })} />)
    expect(screen.getByText("已退款")).toBeInTheDocument()
  })

  it("renders the created-at date in zh-CN locale format", () => {
    render(<BillingRecordCard record={makeRecord({ createdAt: "2025-03-15T10:30:00.000Z" })} />)
    expect(screen.getByText(/03\/15/)).toBeInTheDocument()
  })
})
