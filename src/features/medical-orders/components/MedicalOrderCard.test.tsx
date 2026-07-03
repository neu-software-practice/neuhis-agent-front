import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { MedicalOrderRecord } from "@/features/medical-orders/api/types"
import { MedicalOrderCard } from "@/features/medical-orders/components/MedicalOrderCard"

function makeAdviceRecord(
  overrides: Partial<MedicalOrderRecord> = {},
): MedicalOrderRecord {
  return {
    recordId: "order-1",
    sessionId: "visit-1",
    sessionTitle: "头痛问诊",
    kind: "advice",
    advices: ["多休息", "避免劳累"],
    watchItems: ["若头痛加重及时就医"],
    followUpRecommendation: "一周后复诊",
    handledAt: "2025-03-15T10:00:00.000Z",
    createdAt: "2025-03-15T10:00:00.000Z",
    ...overrides,
  }
}

function makeMedicationRecord(
  overrides: Partial<MedicalOrderRecord> = {},
): MedicalOrderRecord {
  return {
    recordId: "order-2",
    sessionId: "visit-1",
    sessionTitle: "头痛问诊",
    kind: "medication",
    medications: [
      {
        name: "布洛芬",
        spec: "0.2g*24片",
        quantity: 1,
        dosage: "每次1片，每日3次",
        days: 3,
        price: 25.5,
      },
    ],
    fulfillmentStatus: "pending",
    deliveryAddress: {
      name: "张三",
      phone: "13800138000",
      fullAddress: "北京市海淀区中关村大街1号",
    },
    handledAt: "2025-03-15T10:00:00.000Z",
    createdAt: "2025-03-15T10:00:00.000Z",
    ...overrides,
  }
}

describe("MedicalOrderCard - advice kind", () => {
  it("renders the session title", () => {
    render(<MedicalOrderCard record={makeAdviceRecord({ sessionTitle: "感冒问诊" })} />)
    expect(screen.getByText("感冒问诊")).toBeInTheDocument()
  })

  it("renders the 健康建议 label", () => {
    render(<MedicalOrderCard record={makeAdviceRecord()} />)
    // "健康建议" appears as both the section header and the kind tag
    expect(screen.getAllByText("健康建议").length).toBeGreaterThanOrEqual(1)
  })

  it("renders advice items", () => {
    render(<MedicalOrderCard record={makeAdviceRecord()} />)
    expect(screen.getByText("多休息")).toBeInTheDocument()
    expect(screen.getByText("避免劳累")).toBeInTheDocument()
  })

  it("renders watch items when present", () => {
    render(<MedicalOrderCard record={makeAdviceRecord()} />)
    expect(screen.getByText("注意事项")).toBeInTheDocument()
    expect(screen.getByText("若头痛加重及时就医")).toBeInTheDocument()
  })

  it("does not render advice section when advices is empty", () => {
    render(<MedicalOrderCard record={makeAdviceRecord({ advices: [] })} />)
    // The section header "健康建议" should not appear (only the kind tag "健康建议" remains)
    const sectionHeaders = screen.queryAllByText((content, element) =>
      content === "健康建议" && element?.tagName === "P",
    )
    expect(sectionHeaders).toHaveLength(0)
  })

  it("does not render watch section when watchItems is absent", () => {
    render(
      <MedicalOrderCard
        record={makeAdviceRecord({ watchItems: undefined })}
      />,
    )
    expect(screen.queryByText("注意事项")).not.toBeInTheDocument()
  })

  it("renders follow-up recommendation when present", () => {
    render(
      <MedicalOrderCard
        record={makeAdviceRecord({ followUpRecommendation: "三天后复诊" })}
      />,
    )
    expect(screen.getByText("三天后复诊")).toBeInTheDocument()
  })

  it("does not render follow-up when absent", () => {
    render(
      <MedicalOrderCard
        record={makeAdviceRecord({ followUpRecommendation: undefined })}
      />,
    )
    expect(screen.queryByText("一周后复诊")).not.toBeInTheDocument()
  })

  it("renders the advice kind label tag", () => {
    render(<MedicalOrderCard record={makeAdviceRecord()} />)
    // The kind tag at the bottom uses the same "健康建议" label
    expect(screen.getAllByText("健康建议").length).toBeGreaterThanOrEqual(1)
  })
})

describe("MedicalOrderCard - medication kind", () => {
  it("renders medication names", () => {
    render(
      <MedicalOrderCard
        record={makeMedicationRecord({
          medications: [
            { name: "布洛芬", spec: "0.2g*24片", quantity: 1, dosage: "每次1片", days: 3, price: 25.5 },
            { name: "维生素C", spec: "0.1g*100片", quantity: 2, dosage: "每次2片", days: 7, price: 12 },
          ],
        })}
      />,
    )
    expect(screen.getByText("布洛芬")).toBeInTheDocument()
    expect(screen.getByText("维生素C")).toBeInTheDocument()
  })

  it("renders medication detail line with spec, dosage, days, quantity", () => {
    render(<MedicalOrderCard record={makeMedicationRecord()} />)
    expect(
      screen.getByText("0.2g*24片 | 每次1片，每日3次 | 3天 | ×1"),
    ).toBeInTheDocument()
  })

  it("renders medication price formatted to 2 decimals", () => {
    render(<MedicalOrderCard record={makeMedicationRecord()} />)
    expect(screen.getByText("¥25.50")).toBeInTheDocument()
  })

  it("renders fulfillment status when present", () => {
    render(
      <MedicalOrderCard
        record={makeMedicationRecord({ fulfillmentStatus: "pending" })}
      />,
    )
    expect(screen.getByText("待确认")).toBeInTheDocument()
  })

  it("renders confirmed fulfillment status", () => {
    render(
      <MedicalOrderCard
        record={makeMedicationRecord({ fulfillmentStatus: "confirmed" })}
      />,
    )
    expect(screen.getByText("已确认")).toBeInTheDocument()
  })

  it("renders completed fulfillment status", () => {
    render(
      <MedicalOrderCard
        record={makeMedicationRecord({ fulfillmentStatus: "completed" })}
      />,
    )
    expect(screen.getByText("已完成")).toBeInTheDocument()
  })

  it("does not render medication section when medications is empty", () => {
    render(
      <MedicalOrderCard
        record={makeMedicationRecord({ medications: [] })}
      />,
    )
    expect(screen.queryByText("布洛芬")).not.toBeInTheDocument()
  })

  it("renders delivery address when present", () => {
    render(<MedicalOrderCard record={makeMedicationRecord()} />)
    // name and phone are rendered in the same text node "张三 13800138000"
    expect(screen.getByText((content) => content.includes("张三"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("13800138000"))).toBeInTheDocument()
    expect(
      screen.getByText("北京市海淀区中关村大街1号"),
    ).toBeInTheDocument()
  })

  it("does not render delivery address when absent", () => {
    render(
      <MedicalOrderCard
        record={makeMedicationRecord({ deliveryAddress: undefined })}
      />,
    )
    expect(
      screen.queryByText("北京市海淀区中关村大街1号"),
    ).not.toBeInTheDocument()
  })

  it("renders the medication kind label tag", () => {
    render(<MedicalOrderCard record={makeMedicationRecord()} />)
    expect(screen.getByText("处方药品")).toBeInTheDocument()
  })

  it("renders the handled-at date in zh-CN locale format", () => {
    render(
      <MedicalOrderCard
        record={makeMedicationRecord({ handledAt: "2025-03-15T10:00:00.000Z" })}
      />,
    )
    expect(screen.getByText(/03\/15/)).toBeInTheDocument()
  })
})
