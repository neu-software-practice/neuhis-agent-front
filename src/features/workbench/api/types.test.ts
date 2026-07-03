import { describe, expect, it } from "vitest"

import type { FlowCardAction } from "@/features/workbench/api/types"

// NOTE: types.ts is a pure-type module.  No runtime code is exported.
// We verify that the FlowCardAction union type is structurally sound by
// constructing values that match each variant.

describe("FlowCardAction type", () => {
  it("accept_lab action shape", () => {
    const action: FlowCardAction = { type: "accept_lab", cardId: "card-1" }
    expect(action.type).toBe("accept_lab")
    expect(action.cardId).toBe("card-1")
  })

  it("veto_lab action shape", () => {
    const action: FlowCardAction = { type: "veto_lab", cardId: "card-1" }
    expect(action.type).toBe("veto_lab")
  })

  it("skip_lab action shape", () => {
    const action: FlowCardAction = { type: "skip_lab", cardId: "card-1" }
    expect(action.type).toBe("skip_lab")
  })

  it("submit_payment action shape", () => {
    const action: FlowCardAction = {
      type: "submit_payment",
      cardId: "card-1",
      paymentMethodId: "pm-1",
    }
    expect(action.type).toBe("submit_payment")
    expect((action as { paymentMethodId: string }).paymentMethodId).toBe("pm-1")
  })

  it("defer_payment action shape", () => {
    const action: FlowCardAction = { type: "defer_payment", cardId: "card-1" }
    expect(action.type).toBe("defer_payment")
  })

  it("choose_fulfillment action shape", () => {
    const action: FlowCardAction = {
      type: "choose_fulfillment",
      cardId: "card-1",
      mode: "delivery",
      addressId: "addr-1",
    }
    expect(action.type).toBe("choose_fulfillment")
    expect(action.mode).toBe("delivery")
    expect(action.addressId).toBe("addr-1")
  })

  it("submit_treatment_execution action shape", () => {
    const action: FlowCardAction = {
      type: "submit_treatment_execution",
      cardId: "card-1",
      action: "start",
    }
    expect(action.type).toBe("submit_treatment_execution")
    expect(action.action).toBe("start")
  })

  it("ack_advice action shape", () => {
    const action: FlowCardAction = { type: "ack_advice", cardId: "card-1" }
    expect(action.type).toBe("ack_advice")
  })
})

// ---------------------------------------------------------------------------
// Verify that FlowCardAction correctly exhausts the union via a runtime
// discriminant.  This class is a compile-time check expressed at runtime.
// ---------------------------------------------------------------------------
describe("FlowCardAction discriminant coverage", () => {
  it("discriminates on type", () => {
    function getActionType(action: FlowCardAction): string {
      switch (action.type) {
        case "accept_lab":
        case "veto_lab":
        case "skip_lab":
        case "submit_payment":
        case "defer_payment":
        case "choose_fulfillment":
        case "submit_treatment_execution":
        case "ack_advice":
          return action.type
      }
    }

    expect(getActionType({ type: "accept_lab", cardId: "c" })).toBe("accept_lab")
    expect(getActionType({ type: "ack_advice", cardId: "c" })).toBe("ack_advice")
  })
})
