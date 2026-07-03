import { describe, expect, it } from "vitest"

import {
  mockActiveTimeline,
  mockCompletedTimeline,
  mockScreenshotTimeline,
} from "@/mocks/api/fixtures/timeline"

describe("timeline fixtures", () => {
  describe("mockActiveTimeline", () => {
    it("is a non-empty array", () => {
      expect(Array.isArray(mockActiveTimeline)).toBe(true)
      expect(mockActiveTimeline.length).toBeGreaterThan(0)
    })

    it("contains system_event items", () => {
      const systemEvents = mockActiveTimeline.filter((i) => i.kind === "system_event")
      expect(systemEvents.length).toBeGreaterThan(0)
    })

    it("contains message items", () => {
      const messages = mockActiveTimeline.filter((i) => i.kind === "message")
      expect(messages.length).toBeGreaterThan(0)
    })

    it("all items reference the active session", () => {
      for (const item of mockActiveTimeline) {
        expect(item.sessionId).toBe("visit-mock-active")
      }
    })

    it("messages have role and content", () => {
      const messages = mockActiveTimeline.filter((i) => i.kind === "message")
      for (const msg of messages) {
        expect(msg.role).toMatch(/^(patient|assistant)$/)
        expect(msg.content).toBeTruthy()
      }
    })
  })

  describe("mockCompletedTimeline", () => {
    it("is a non-empty array", () => {
      expect(mockCompletedTimeline.length).toBeGreaterThan(0)
    })

    it("contains flow_card items", () => {
      const cards = mockCompletedTimeline.filter((i) => i.kind === "flow_card")
      expect(cards.length).toBeGreaterThan(0)
    })

    it("contains a completed visit card", () => {
      const completedCard = mockCompletedTimeline.find(
        (i) => i.kind === "flow_card" && i.card.kind === "completed_visit",
      )
      expect(completedCard).toBeDefined()
    })

    it("all items reference the completed session", () => {
      for (const item of mockCompletedTimeline) {
        expect(item.sessionId).toBe("visit-mock-completed")
      }
    })

    it("payment cards have paid status", () => {
      const paymentCards = mockCompletedTimeline.filter(
        (i) => i.kind === "flow_card" && i.card.kind === "payment",
      )
      for (const item of paymentCards) {
        expect(item.card.paymentStatus).toBe("paid")
      }
    })
  })

  describe("mockScreenshotTimeline", () => {
    it("contains all major flow card kinds", () => {
      const cardKinds = new Set(
        mockScreenshotTimeline
          .filter((i) => i.kind === "flow_card")
          .map((i) => i.card.kind),
      )

      expect(cardKinds.has("lab_decision")).toBe(true)
      expect(cardKinds.has("payment")).toBe(true)
      expect(cardKinds.has("lab_execution")).toBe(true)
      expect(cardKinds.has("diagnosis")).toBe(true)
      expect(cardKinds.has("treatment_plan")).toBe(true)
      expect(cardKinds.has("treatment_execution")).toBe(true)
      expect(cardKinds.has("medication_fulfillment")).toBe(true)
      expect(cardKinds.has("advice_only")).toBe(true)
      expect(cardKinds.has("completed_visit")).toBe(true)
    })

    it("has multiple treatment_plan variations", () => {
      const planCards = mockScreenshotTimeline.filter(
        (i) => i.kind === "flow_card" && i.card.kind === "treatment_plan",
      )
      const planTypes = new Set(planCards.map((i) => i.card.plan))
      expect(planTypes.has("medication")).toBe(true)
      expect(planTypes.has("treatment")).toBe(true)
      expect(planTypes.has("advice_only")).toBe(true)
      expect(planTypes.has("referral")).toBe(true)
    })

    it("all cards are readonly (done status)", () => {
      for (const item of mockScreenshotTimeline) {
        expect(item.status).toBe("done")
      }
    })

    it("all items reference the screenshot session", () => {
      for (const item of mockScreenshotTimeline) {
        expect(item.sessionId).toBe("visit-mock-screenshot")
      }
    })

    it("contains opening messages", () => {
      const messages = mockScreenshotTimeline.filter((i) => i.kind === "message")
      expect(messages.length).toBeGreaterThanOrEqual(2)
    })
  })
})
