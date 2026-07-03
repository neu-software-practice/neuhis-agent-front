import { describe, expect, it } from "vitest"

import { api } from "@/features/api"

describe("api facade", () => {
  it("exports billing API", () => {
    expect(api.billing).toBeDefined()
  })

  it("exports medicalOrders API", () => {
    expect(api.medicalOrders).toBeDefined()
  })

  it("exports patient API", () => {
    expect(api.patient).toBeDefined()
  })

  it("exports visits API", () => {
    expect(api.visits).toBeDefined()
  })

  it("exports workbench API", () => {
    expect(api.workbench).toBeDefined()
  })

  it("billing API has listRecords method", () => {
    expect(typeof api.billing.listRecords).toBe("function")
  })

  it("medicalOrders API has listRecords method", () => {
    expect(typeof api.medicalOrders.listRecords).toBe("function")
  })

  it("patient API has verifyIdentity method", () => {
    expect(typeof api.patient.verifyIdentity).toBe("function")
  })

  it("patient API has listAddresses method", () => {
    expect(typeof api.patient.listAddresses).toBe("function")
  })

  it("patient API has createAddress method", () => {
    expect(typeof api.patient.createAddress).toBe("function")
  })

  it("patient API has updateAddress method", () => {
    expect(typeof api.patient.updateAddress).toBe("function")
  })

  it("patient API has deleteAddress method", () => {
    expect(typeof api.patient.deleteAddress).toBe("function")
  })

  it("patient API has setDefaultAddress method", () => {
    expect(typeof api.patient.setDefaultAddress).toBe("function")
  })

  it("visits API has listSessions method", () => {
    expect(typeof api.visits.listSessions).toBe("function")
  })

  it("visits API has createSession method", () => {
    expect(typeof api.visits.createSession).toBe("function")
  })

  it("visits API has getSession method", () => {
    expect(typeof api.visits.getSession).toBe("function")
  })

  it("visits API has createFollowUp method", () => {
    expect(typeof api.visits.createFollowUp).toBe("function")
  })

  it("visits API has getReadonlySnapshot method", () => {
    expect(typeof api.visits.getReadonlySnapshot).toBe("function")
  })

  it("visits API has generateTitle method", () => {
    expect(typeof api.visits.generateTitle).toBe("function")
  })

  it("patient API has getPatientContext method", () => {
    expect(typeof api.patient.getPatientContext).toBe("function")
  })

  it("patient API has updatePatientProfile method", () => {
    expect(typeof api.patient.updatePatientProfile).toBe("function")
  })

  it("workbench API has sendMessage method", () => {
    expect(typeof api.workbench.sendMessage).toBe("function")
  })

  it("workbench API has listTimeline method", () => {
    expect(typeof api.workbench.listTimeline).toBe("function")
  })

  it("workbench API has submitLabDecision method", () => {
    expect(typeof api.workbench.submitLabDecision).toBe("function")
  })

  it("workbench API has submitPayment method", () => {
    expect(typeof api.workbench.submitPayment).toBe("function")
  })
})
