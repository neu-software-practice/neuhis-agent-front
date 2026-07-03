import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { PatientProfile } from "@/features/patient/api"
import { PatientSummaryCard } from "@/features/patient/components/PatientSummaryCard"

function makePatient(overrides: Partial<PatientProfile> = {}): PatientProfile {
  return {
    id: "patient-1",
    name: "张三",
    gender: "male",
    age: 30,
    phoneMasked: "138****8000",
    idCardMasked: "110***********1234",
    allergies: ["青霉素"],
    chronicDiseases: ["高血压"],
    longTermMedications: ["降压药"],
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("PatientSummaryCard", () => {
  it("renders the patient name", () => {
    render(<PatientSummaryCard patient={makePatient({ name: "李四" })} />)
    expect(screen.getByText("李四")).toBeInTheDocument()
  })

  it("renders gender label in Chinese", () => {
    render(<PatientSummaryCard patient={makePatient({ gender: "female" })} />)
    expect(screen.getByText("女")).toBeInTheDocument()
  })

  it("renders 'unknown' for the unknown gender value", () => {
    render(
      <PatientSummaryCard patient={makePatient({ gender: "unknown" })} />,
    )
    expect(screen.getByText("未知")).toBeInTheDocument()
  })

  it("renders '其他' for the 'other' gender value", () => {
    render(
      <PatientSummaryCard patient={makePatient({ gender: "other" })} />,
    )
    expect(screen.getByText("其他")).toBeInTheDocument()
  })

  it("renders fallback '未知' for a gender not in the label map", () => {
    render(
      // Using a type assertion to bypass TS and hit the `?? "未知"` fallback
      <PatientSummaryCard patient={makePatient({ gender: "invalid" as never })} />,
    )
    expect(screen.getByText("未知")).toBeInTheDocument()
  })

  it("renders age", () => {
    render(<PatientSummaryCard patient={makePatient({ age: 45 })} />)
    expect(screen.getByText("45岁")).toBeInTheDocument()
  })

  it("renders masked phone when provided", () => {
    render(
      <PatientSummaryCard
        patient={makePatient({ phoneMasked: "139****9000" })}
      />,
    )
    expect(screen.getByText("139****9000")).toBeInTheDocument()
  })

  it("does not render phone section when phoneMasked is undefined", () => {
    render(
      <PatientSummaryCard patient={makePatient({ phoneMasked: undefined })} />,
    )
    expect(screen.queryByText("138****8000")).not.toBeInTheDocument()
  })

  it("renders allergy chips", () => {
    render(
      <PatientSummaryCard
        patient={makePatient({ allergies: ["青霉素", "花粉"] })}
      />,
    )
    expect(screen.getByText("青霉素")).toBeInTheDocument()
    expect(screen.getByText("花粉")).toBeInTheDocument()
  })

  it("does not render allergy section when allergies is empty", () => {
    render(
      <PatientSummaryCard patient={makePatient({ allergies: [] })} />,
    )
    expect(screen.queryByText("过敏史")).not.toBeInTheDocument()
  })

  it("renders chronic disease chips", () => {
    render(
      <PatientSummaryCard
        patient={makePatient({ chronicDiseases: ["高血压", "糖尿病"] })}
      />,
    )
    expect(screen.getByText("高血压")).toBeInTheDocument()
    expect(screen.getByText("糖尿病")).toBeInTheDocument()
  })

  it("does not render chronic disease section when list is empty", () => {
    render(
      <PatientSummaryCard patient={makePatient({ chronicDiseases: [] })} />,
    )
    expect(screen.queryByText("慢性病")).not.toBeInTheDocument()
  })

  it("renders long-term medication chips", () => {
    render(
      <PatientSummaryCard
        patient={makePatient({ longTermMedications: ["降压药", "阿司匹林"] })}
      />,
    )
    expect(screen.getByText("降压药")).toBeInTheDocument()
    expect(screen.getByText("阿司匹林")).toBeInTheDocument()
  })

  it("does not render long-term medication section when list is empty", () => {
    render(
      <PatientSummaryCard
        patient={makePatient({ longTermMedications: [] })}
      />,
    )
    expect(screen.queryByText("长期用药")).not.toBeInTheDocument()
  })

  it("renders '暂无医疗记录' when all medical fields are empty arrays", () => {
    render(
      <PatientSummaryCard
        patient={makePatient({
          allergies: [],
          chronicDiseases: [],
          longTermMedications: [],
        })}
      />,
    )
    expect(screen.getByText("暂无医疗记录")).toBeInTheDocument()
  })

  it("does not render medical sections when hideMedicalSections is true", () => {
    render(
      <PatientSummaryCard
        patient={makePatient()}
        hideMedicalSections
      />,
    )
    expect(screen.queryByText("过敏史")).not.toBeInTheDocument()
    expect(screen.queryByText("慢性病")).not.toBeInTheDocument()
    expect(screen.queryByText("长期用药")).not.toBeInTheDocument()
    expect(screen.queryByText("暂无医疗记录")).not.toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <PatientSummaryCard patient={makePatient()} className="custom-cls" />,
    )
    expect(container.querySelector(".custom-cls")).toBeInTheDocument()
  })
})
