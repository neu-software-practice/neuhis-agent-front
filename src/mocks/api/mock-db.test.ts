import { beforeEach, describe, expect, it } from "vitest"

import { mockDb } from "@/mocks/api/mock-db"

describe("MockDb", () => {
  beforeEach(() => {
    mockDb.reset()
  })

  describe("verifyIdentity", () => {
    it("returns patient with readable scopes", () => {
      const result = mockDb.verifyIdentity()
      expect(result.patient).toBeDefined()
      expect(result.readableScopes).toContain("profile")
      expect(result.verifiedAt).toBeTruthy()
    })
  })

  describe("getPatientContext", () => {
    it("returns context for existing patient", () => {
      const context = mockDb.getPatientContext("patient-mock-001")
      expect(context.patient.id).toBe("patient-mock-001")
      expect(context.allergies).toBeDefined()
    })

    it("throws for unknown patient", () => {
      expect(() => mockDb.getPatientContext("nonexistent")).toThrow()
    })
  })

  describe("updatePatientProfile", () => {
    it("updates allergies", () => {
      const updated = mockDb.updatePatientProfile({
        patientId: "patient-mock-001",
        allergies: ["青霉素", "头孢"],
      })
      expect(updated.allergies).toEqual(["青霉素", "头孢"])
    })

    it("preserves existing fields when not provided", () => {
      const before = mockDb.getPatientContext("patient-mock-001")
      const updated = mockDb.updatePatientProfile({
        patientId: "patient-mock-001",
        chronicDiseases: ["高血压"],
      })
      expect(updated.allergies).toEqual(before.patient.allergies)
      expect(updated.chronicDiseases).toEqual(["高血压"])
    })

    it("throws for unknown patient", () => {
      expect(() =>
        mockDb.updatePatientProfile({ patientId: "nonexistent", allergies: [] }),
      ).toThrow()
    })
  })

  describe("listSessions", () => {
    it("returns sessions list", () => {
      const result = mockDb.listSessions({})
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.hasMore).toBeDefined()
    })

    it("filters by patientId", () => {
      const result = mockDb.listSessions({ patientId: "patient-mock-001" })
      for (const session of result.items) {
        expect(session.patientId).toBe("patient-mock-001")
      }
    })

    it("filters by status", () => {
      const result = mockDb.listSessions({ status: "completed" })
      for (const session of result.items) {
        expect(session.status).toBe("completed")
      }
    })

    it("respects pageSize", () => {
      const result = mockDb.listSessions({ pageSize: 1 })
      expect(result.items.length).toBeLessThanOrEqual(1)
    })

    it("sorts by updatedAt descending", () => {
      const result = mockDb.listSessions({})
      if (result.items.length >= 2) {
        expect(
          result.items[0].updatedAt >= result.items[1].updatedAt,
        ).toBe(true)
      }
    })
  })

  describe("createSession", () => {
    it("creates a new session with chatting status", () => {
      const result = mockDb.createSession({
        patientId: "patient-mock-001",
        entryType: "new",
        chiefComplaint: "头痛",
      })
      expect(result.session.status).toBe("chatting")
      expect(result.session.summary.chiefComplaint).toBe("头痛")
      expect(result.session.entryType).toBe("new")
    })

    it("generates a unique session ID", () => {
      const a = mockDb.createSession({ patientId: "patient-mock-001", entryType: "new" })
      const b = mockDb.createSession({ patientId: "patient-mock-001", entryType: "new" })
      expect(a.session.id).not.toBe(b.session.id)
    })

    it("creates initial timeline with context_loaded event", () => {
      const result = mockDb.createSession({
        patientId: "patient-mock-001",
        entryType: "new",
        chiefComplaint: "咳嗽",
      })
      expect(result.initialTimeline.length).toBeGreaterThan(0)
      expect(result.initialTimeline[0].kind).toBe("system_event")
    })

    it("includes patient message when chiefComplaint provided", () => {
      const result = mockDb.createSession({
        patientId: "patient-mock-001",
        entryType: "new",
        chiefComplaint: "发热",
      })
      const messages = result.initialTimeline.filter((i) => i.kind === "message")
      expect(messages.length).toBe(1)
      expect(messages[0].content).toBe("发热")
    })
  })

  describe("createFollowUp", () => {
    it("creates a follow_up session linked to parent", () => {
      const result = mockDb.createFollowUp({
        patientId: "patient-mock-001",
        parentSessionId: "visit-mock-completed",
        chiefComplaint: "复诊",
      })
      expect(result.session.entryType).toBe("follow_up")
      expect(result.session.parentSessionId).toBe("visit-mock-completed")
    })

    it("extracts context from parent timeline", () => {
      const result = mockDb.createFollowUp({
        patientId: "patient-mock-001",
        parentSessionId: "visit-mock-completed",
        chiefComplaint: "复诊",
      })
      const contextEvents = result.initialTimeline.filter(
        (i) => i.kind === "system_event" && i.eventType === "context_loaded",
      )
      // Should have at least the initial context_loaded + parent context events
      expect(contextEvents.length).toBeGreaterThan(1)
    })

    it("throws for nonexistent parent session", () => {
      expect(() =>
        mockDb.createFollowUp({
          patientId: "patient-mock-001",
          parentSessionId: "nonexistent",
        }),
      ).toThrow()
    })
  })

  describe("sendMessage", () => {
    it("adds patient message and assistant placeholder to timeline", () => {
      const result = mockDb.sendMessage({
        sessionId: "visit-mock-active",
        content: "体温38度",
        clientMessageId: "client-1",
      })
      expect(result.patientMessage.kind).toBe("message")
      expect(result.patientMessage.role).toBe("patient")
      expect(result.patientMessage.content).toBe("体温38度")
      expect(result.assistantPlaceholder.status).toBe("streaming")
    })

    it("updates session status to analyzing", () => {
      const result = mockDb.sendMessage({
        sessionId: "visit-mock-active",
        content: "test",
        clientMessageId: "client-2",
      })
      expect(result.session.status).toBe("analyzing")
    })

    it("increments askRound", () => {
      const before = mockDb.getSession("visit-mock-active")
      const result = mockDb.sendMessage({
        sessionId: "visit-mock-active",
        content: "test",
        clientMessageId: "client-3",
      })
      expect(result.session.askRound).toBe(before.askRound + 1)
    })

    it("throws for nonexistent session", () => {
      expect(() =>
        mockDb.sendMessage({
          sessionId: "nonexistent",
          content: "test",
          clientMessageId: "client-4",
        }),
      ).toThrow()
    })
  })

  describe("raiseLabDecision", () => {
    it("creates a lab decision card and blocks session", () => {
      const result = mockDb.raiseLabDecision("visit-mock-active")
      expect(result.card).toBeDefined()
      expect(result.card?.kind).toBe("lab_decision")
      expect(result.status).toBe("blocked")
      expect(result.activeCardId).toBe(result.card?.id)
    })
  })

  describe("submitLabDecision", () => {
    it("accepting creates a payment card", () => {
      const raised = mockDb.raiseLabDecision("visit-mock-active")
      const result = mockDb.submitLabDecision({
        sessionId: "visit-mock-active",
        cardId: raised.card!.id,
        decision: "accepted",
      })
      expect(result.card?.kind).toBe("payment")
      expect(result.status).toBe("blocked")
    })

    it("vetoing returns to chatting", () => {
      const raised = mockDb.raiseLabDecision("visit-mock-active")
      const result = mockDb.submitLabDecision({
        sessionId: "visit-mock-active",
        cardId: raised.card!.id,
        decision: "vetoed",
      })
      expect(result.status).toBe("chatting")
    })

    it("skipping creates advice-only path", () => {
      const raised = mockDb.raiseLabDecision("visit-mock-active")
      const result = mockDb.submitLabDecision({
        sessionId: "visit-mock-active",
        cardId: raised.card!.id,
        decision: "skipped",
      })
      expect(result.card?.kind).toBe("advice_only")
    })

    it("throws for nonexistent card", () => {
      expect(() =>
        mockDb.submitLabDecision({
          sessionId: "visit-mock-active",
          cardId: "non-lab-card",
          decision: "accepted",
        }),
      ).toThrow()
    })
  })

  describe("submitPayment", () => {
    function setupLabPayment() {
      const raised = mockDb.raiseLabDecision("visit-mock-active")
      const paid = mockDb.submitLabDecision({
        sessionId: "visit-mock-active",
        cardId: raised.card!.id,
        decision: "accepted",
      })
      return paid
    }

    it("paying lab card creates diagnosis and treatment plan", () => {
      const paid = setupLabPayment()
      const result = mockDb.submitPayment({
        sessionId: "visit-mock-active",
        cardId: paid.card!.id,
        purpose: "lab",
      })
      expect(result.status).toBe("blocked")
      // Should have created lab_execution, diagnosis, treatment_plan cards
      expect(result.timelineItems.length).toBeGreaterThan(1)
    })

    it("deferring returns to chatting", () => {
      const paid = setupLabPayment()
      const result = mockDb.submitPayment({
        sessionId: "visit-mock-active",
        cardId: paid.card!.id,
        purpose: "lab",
        defer: true,
      })
      expect(result.status).toBe("chatting")
    })

    it("simulating failure marks card as failed", () => {
      const paid = setupLabPayment()
      const result = mockDb.submitPayment({
        sessionId: "visit-mock-active",
        cardId: paid.card!.id,
        purpose: "lab",
        simulateStatus: "failed",
      })
      expect(result.card?.status).toBe("failed")
    })

    it("throws for nonexistent card", () => {
      expect(() =>
        mockDb.submitPayment({
          sessionId: "visit-mock-active",
          cardId: "non-payment-card",
          purpose: "lab",
        }),
      ).toThrow()
    })
  })

  describe("submitFulfillment", () => {
    it("completing pickup mode completes the visit", () => {
      // Setup: create a fulfillment card first
      const raised = mockDb.raiseLabDecision("visit-mock-active")
      const paid = mockDb.submitLabDecision({
        sessionId: "visit-mock-active",
        cardId: raised.card!.id,
        decision: "accepted",
      })
      const medPay = mockDb.submitPayment({
        sessionId: "visit-mock-active",
        cardId: paid.card!.id,
        purpose: "lab",
      })
      // medPay should be medication_fulfillment or medication_payment
      // The flow creates a medication_payment card after lab payment
      // We need to pay that first to get to fulfillment
      const fulfillment = mockDb.submitPayment({
        sessionId: "visit-mock-active",
        cardId: medPay.card!.id,
        purpose: "medication",
      })
      expect(fulfillment.card?.kind).toBe("medication_fulfillment")

      const result = mockDb.submitFulfillment({
        sessionId: "visit-mock-active",
        cardId: fulfillment.card!.id,
        mode: "pickup",
      })
      expect(result.card?.kind).toBe("completed_visit")
    })

    it("delivery mode requires addressId", () => {
      // Setup to get a fulfillment card
      const raised = mockDb.raiseLabDecision("visit-mock-active")
      const paid = mockDb.submitLabDecision({
        sessionId: "visit-mock-active",
        cardId: raised.card!.id,
        decision: "accepted",
      })
      const medPay = mockDb.submitPayment({
        sessionId: "visit-mock-active",
        cardId: paid.card!.id,
        purpose: "lab",
      })
      const fulfillment = mockDb.submitPayment({
        sessionId: "visit-mock-active",
        cardId: medPay.card!.id,
        purpose: "medication",
      })

      expect(() =>
        mockDb.submitFulfillment({
          sessionId: "visit-mock-active",
          cardId: fulfillment.card!.id,
          mode: "delivery",
        }),
      ).toThrow()
    })

    it("throws for nonexistent card", () => {
      expect(() =>
        mockDb.submitFulfillment({
          sessionId: "visit-mock-active",
          cardId: "non-fulfillment",
          mode: "pickup",
        }),
      ).toThrow()
    })
  })

  describe("ackAdvice", () => {
    it("acknowledging advice completes the visit", () => {
      // Create an advice_only card via skipped lab decision
      const raised = mockDb.raiseLabDecision("visit-mock-active")
      const skipped = mockDb.submitLabDecision({
        sessionId: "visit-mock-active",
        cardId: raised.card!.id,
        decision: "skipped",
      })
      expect(skipped.card?.kind).toBe("advice_only")

      const result = mockDb.ackAdvice({
        sessionId: "visit-mock-active",
        cardId: skipped.card!.id,
      })
      expect(result.card?.kind).toBe("completed_visit")
    })

    it("throws for nonexistent card", () => {
      expect(() =>
        mockDb.ackAdvice({
          sessionId: "visit-mock-active",
          cardId: "non-advice",
        }),
      ).toThrow()
    })
  })

  describe("classifyFollowUpIntent", () => {
    it("classifies follow-up intent", () => {
      const result = mockDb.classifyFollowUpIntent({
        sessionId: "visit-mock-active",
        content: "我想复诊",
      })
      expect(result.intent).toBe("follow_up")
    })

    it("classifies consultation intent", () => {
      const result = mockDb.classifyFollowUpIntent({
        sessionId: "visit-mock-active",
        content: "这个药能不能停",
      })
      expect(result.intent).toBe("consultation")
    })

    it("returns uncertain for unclear content", () => {
      const result = mockDb.classifyFollowUpIntent({
        sessionId: "visit-mock-active",
        content: "好的谢谢",
      })
      expect(result.intent).toBe("uncertain")
    })
  })

  describe("reportVitals", () => {
    it("detects emergency from symptoms", () => {
      const result = mockDb.reportVitals({
        sessionId: "visit-mock-active",
        symptoms: ["胸痛", "呼吸困难"],
      })
      expect(result.emergency).toBe(true)
      expect(result.severity).toBe("critical")
    })

    it("detects emergency from low SpO2", () => {
      const result = mockDb.reportVitals({
        sessionId: "visit-mock-active",
        symptoms: ["轻微咳嗽"],
        vitals: { spo2: 85 },
      })
      expect(result.emergency).toBe(true)
    })

    it("returns non-emergency for normal vitals", () => {
      const result = mockDb.reportVitals({
        sessionId: "visit-mock-active",
        symptoms: ["轻微咳嗽"],
        vitals: { spo2: 98 },
      })
      expect(result.emergency).toBe(false)
    })
  })

  describe("exitVisit", () => {
    it("exits a session normally", () => {
      const result = mockDb.exitVisit({
        sessionId: "visit-mock-active",
        reason: "exited",
      })
      expect(result.terminalReason).toBe("exited")
      const session = mockDb.getSession("visit-mock-active")
      expect(session.status).toBe("exited")
    })

    it("handles emergency exit", () => {
      const result = mockDb.exitVisit({
        sessionId: "visit-mock-active",
        reason: "emergency",
      })
      expect(result.terminalReason).toBe("emergency")
      const session = mockDb.getSession("visit-mock-active")
      expect(session.status).toBe("emergency_terminated")
    })

    it("handles timeout exit", () => {
      const result = mockDb.exitVisit({
        sessionId: "visit-mock-active",
        reason: "timeout",
      })
      expect(result.terminalReason).toBe("timeout")
    })

    it("prevents double exit", () => {
      mockDb.exitVisit({ sessionId: "visit-mock-active", reason: "exited" })
      const result = mockDb.exitVisit({
        sessionId: "visit-mock-active",
        reason: "exited",
      })
      // Second exit should return existing terminal reason
      expect(result.terminalReason).toBe("exited")
    })
  })

  describe("dismissEmergency", () => {
    it("restores session from emergency", () => {
      mockDb.exitVisit({ sessionId: "visit-mock-active", reason: "emergency" })
      const result = mockDb.dismissEmergency({ sessionId: "visit-mock-active" })
      expect(result.session.status).not.toBe("emergency_terminated")
      expect(result.timelineItem.eventType).toBe("emergency_dismissed")
    })
  })

  describe("suspendVisit", () => {
    it("suspends an active session", () => {
      const result = mockDb.suspendVisit({ sessionId: "visit-mock-active" })
      expect(result.session.status).toBe("suspended")
      expect(result.timelineItem.eventType).toBe("session_suspended")
    })
  })

  describe("pauseVisitTimer / resumeVisitTimer", () => {
    it("pauses the timer", () => {
      const result = mockDb.pauseVisitTimer("visit-mock-active")
      expect(result.timerPaused).toBe(true)
      expect(result.pausedAt).toBeTruthy()
    })

    it("resumes the timer", () => {
      mockDb.pauseVisitTimer("visit-mock-active")
      const result = mockDb.resumeVisitTimer("visit-mock-active")
      expect(result.timerPaused).toBe(false)
      expect(result.pausedAt).toBeUndefined()
    })

    it("preserves original pausedAt on repeated pause", () => {
      const first = mockDb.pauseVisitTimer("visit-mock-active")
      const second = mockDb.pauseVisitTimer("visit-mock-active")
      expect(second.pausedAt).toBe(first.pausedAt)
    })
  })

  describe("address book", () => {
    it("lists addresses for a patient", () => {
      const addresses = mockDb.listAddresses("patient-mock-001")
      expect(addresses.length).toBeGreaterThan(0)
    })

    it("creates a new address", () => {
      const address = mockDb.createAddress("patient-mock-001", {
        name: "张三",
        phone: "13900001111",
        province: "北京市",
        city: "市辖区",
        district: "朝阳区",
        detail: "某街道1号",
      })
      expect(address.id).toBeTruthy()
      expect(address.name).toBe("张三")
    })

    it("first address becomes default automatically", () => {
      // Use a patient with no seed addresses
      const address = mockDb.createAddress("patient-no-addresses", {
        name: "新用户",
        phone: "13900002222",
        province: "上海市",
        city: "市辖区",
        district: "浦东新区",
        detail: "某路2号",
      })
      expect(address.isDefault).toBe(true)
    })

    it("setting default clears other defaults", () => {
      const pid = "patient-default-test"
      const a = mockDb.createAddress(pid, {
        name: "A",
        phone: "13900001111",
        province: "北京市",
        city: "市辖区",
        district: "朝阳区",
        detail: "路1号",
      })
      const b = mockDb.createAddress(pid, {
        name: "B",
        phone: "13900002222",
        province: "上海市",
        city: "市辖区",
        district: "浦东新区",
        detail: "路2号",
      })
      expect(a.isDefault).toBe(true)
      expect(b.isDefault).toBe(false)

      const updated = mockDb.setDefaultAddress(pid, b.id)
      expect(updated.isDefault).toBe(true)

      const addresses = mockDb.listAddresses(pid)
      const defaultCount = addresses.filter((addr) => addr.isDefault).length
      expect(defaultCount).toBe(1)
    })

    it("deleting default address transfers default", () => {
      const pid = "patient-delete-default-test"
      const a = mockDb.createAddress(pid, {
        name: "A",
        phone: "13900001111",
        province: "北京市",
        city: "市辖区",
        district: "朝阳区",
        detail: "路1号",
      })
      mockDb.createAddress(pid, {
        name: "B",
        phone: "13900002222",
        province: "上海市",
        city: "市辖区",
        district: "浦东新区",
        detail: "路2号",
      })
      mockDb.setDefaultAddress(pid, a.id)
      mockDb.deleteAddress(pid, a.id)

      const addresses = mockDb.listAddresses(pid)
      expect(addresses.length).toBe(1)
      expect(addresses[0].isDefault).toBe(true)
    })

    it("deleting nonexistent address throws", () => {
      expect(() => mockDb.deleteAddress("patient-mock-001", "nonexistent")).toThrow()
    })

    it("updating nonexistent address throws", () => {
      expect(() =>
        mockDb.updateAddress("patient-mock-001", {
          addressId: "nonexistent",
          name: "新名字",
        }),
      ).toThrow()
    })

    it("enforces address limit of 10", () => {
      const pid = "patient-limit-test"
      // Create 10 addresses
      for (let i = 0; i < 10; i++) {
        mockDb.createAddress(pid, {
          name: `用户${i}`,
          phone: `1390000000${i}`,
          province: "北京市",
          city: "市辖区",
          district: "朝阳区",
          detail: `路${i}号`,
        })
      }
      // 11th should throw
      expect(() =>
        mockDb.createAddress(pid, {
          name: "超额",
          phone: "13900009999",
          province: "北京市",
          city: "市辖区",
          district: "朝阳区",
          detail: "超额路",
        }),
      ).toThrow()
    })
  })

  describe("auth", () => {
    it("registers a new user", () => {
      const result = mockDb.register({
        phone: "13811112222",
        password: "password123",
        realName: "新用户",
        gender: "male",
        birthDate: "1990-01-01",
      })
      expect(result.user.phone).toBe("13811112222")
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
      expect(result.expiresIn).toBe(900)
    })

    it("rejects duplicate phone registration", () => {
      expect(() =>
        mockDb.register({
          phone: "13800002468", // seed user phone
          password: "any",
        }),
      ).toThrow()
    })

    it("logs in with correct credentials", () => {
      const result = mockDb.login({
        phone: "13800002468",
        password: "12345678",
      })
      expect(result.user.phone).toBe("13800002468")
      expect(result.accessToken).toBeTruthy()
    })

    it("rejects wrong password", () => {
      expect(() =>
        mockDb.login({ phone: "13800002468", password: "wrong" }),
      ).toThrow()
    })

    it("rejects unknown phone", () => {
      expect(() =>
        mockDb.login({ phone: "13899999999", password: "any" }),
      ).toThrow()
    })

    it("refreshes token with rotation", async () => {
      const login = mockDb.login({ phone: "13800002468", password: "12345678" })
      // Wait a tick so Date.now() advances and the new token differs
      await new Promise((r) => setTimeout(r, 2))
      const refresh = mockDb.refreshToken(login.refreshToken)
      expect(refresh.accessToken).toBeTruthy()
      expect(refresh.refreshToken).toBeTruthy()
      // New tokens should be different (rotation)
      expect(refresh.refreshToken).not.toBe(login.refreshToken)
    })

    it("rejects reused refresh token (theft detection)", () => {
      const login = mockDb.login({ phone: "13800002468", password: "12345678" })
      mockDb.refreshToken(login.refreshToken)
      // Reusing the same token should throw
      expect(() => mockDb.refreshToken(login.refreshToken)).toThrow()
    })

    it("rejects invalid refresh token", () => {
      expect(() => mockDb.refreshToken("invalid-token")).toThrow()
    })

    it("logout removes refresh token", () => {
      const login = mockDb.login({ phone: "13800002468", password: "12345678" })
      mockDb.logout(login.refreshToken)
      // Token should no longer be valid
      expect(() => mockDb.refreshToken(login.refreshToken)).toThrow()
    })
  })

  describe("admin auth", () => {
    it("logs in admin with correct credentials", () => {
      const result = mockDb.adminLogin({ username: "admin", password: "admin123" })
      expect(result.user.username).toBe("admin")
      expect(result.tokens.accessToken).toContain("mock-admin-access")
    })

    it("rejects wrong admin credentials", () => {
      expect(() =>
        mockDb.adminLogin({ username: "admin", password: "wrong" }),
      ).toThrow()
    })

    it("refreshes admin token", () => {
      const login = mockDb.adminLogin({ username: "admin", password: "admin123" })
      const refresh = mockDb.adminRefreshToken(login.tokens.refreshToken)
      expect(refresh.tokens.accessToken).toBeTruthy()
    })

    it("rejects reused admin refresh token", () => {
      const login = mockDb.adminLogin({ username: "admin", password: "admin123" })
      mockDb.adminRefreshToken(login.tokens.refreshToken)
      expect(() => mockDb.adminRefreshToken(login.tokens.refreshToken)).toThrow()
    })
  })

  describe("admin dashboard", () => {
    it("returns dashboard stats", () => {
      const stats = mockDb.getAdminDashboardStats()
      expect(stats.totalPatients).toBeGreaterThan(0)
      expect(stats.totalSessions).toBeGreaterThan(0)
      expect(typeof stats.activeSessions).toBe("number")
    })
  })

  describe("admin patient management", () => {
    it("lists admin patients with pagination", () => {
      const result = mockDb.listAdminPatients({ page: 1, pageSize: 10 })
      expect(result.items).toBeDefined()
      expect(result.total).toBeGreaterThan(0)
      expect(result.page).toBe(1)
    })

    it("filters patients by search", () => {
      const result = mockDb.listAdminPatients({ search: "李明" })
      expect(result.total).toBeGreaterThan(0)
    })

    it("returns patient by id", () => {
      const patient = mockDb.getAdminPatient("patient-mock-001")
      expect(patient.id).toBe("patient-mock-001")
    })

    it("throws for nonexistent patient", () => {
      expect(() => mockDb.getAdminPatient("nonexistent")).toThrow()
    })
  })

  describe("admin session management", () => {
    it("lists admin sessions with pagination", () => {
      const result = mockDb.listAdminSessions({ page: 1, pageSize: 10 })
      expect(result.items).toBeDefined()
      expect(result.total).toBeGreaterThan(0)
    })

    it("filters sessions by status", () => {
      const result = mockDb.listAdminSessions({ status: "completed" })
      for (const s of result.items) {
        expect(s.status).toBe("completed")
      }
    })

    it("returns session by id", () => {
      const session = mockDb.getAdminSession("visit-mock-active")
      expect(session.id).toBe("visit-mock-active")
    })

    it("throws for nonexistent session", () => {
      expect(() => mockDb.getAdminSession("nonexistent")).toThrow()
    })
  })

  describe("system settings", () => {
    it("returns system settings", () => {
      const settings = mockDb.getSystemSettings()
      expect(settings.siteName).toBeTruthy()
      expect(settings.maxConcurrentSessions).toBeGreaterThan(0)
    })

    it("updates system settings", () => {
      const updated = mockDb.updateSystemSettings({ siteName: "新名称" })
      expect(updated.siteName).toBe("新名称")
    })

    it("rejects invalid settings", () => {
      expect(() =>
        mockDb.updateSystemSettings({ maxConcurrentSessions: -1 }),
      ).toThrow()
    })
  })

  describe("generateTitle", () => {
    it("generates a title for a session", () => {
      const result = mockDb.generateTitle({ sessionId: "visit-mock-completed" })
      expect(result.sessionId).toBe("visit-mock-completed")
      expect(result.title).toBeTruthy()
    })

    it("updates session summary with title", () => {
      mockDb.generateTitle({ sessionId: "visit-mock-active" })
      const session = mockDb.getSession("visit-mock-active")
      expect(session.summary.title).toBeTruthy()
    })
  })

  describe("listBillingRecords", () => {
    it("returns billing records for a patient", () => {
      const result = mockDb.listBillingRecords("patient-mock-001")
      expect(result.items).toBeDefined()
    })

    it("only includes payment cards", () => {
      const result = mockDb.listBillingRecords("patient-mock-001")
      for (const record of result.items) {
        expect(record.purpose).toMatch(/^(lab|medication)$/)
      }
    })
  })

  describe("listMedicalOrders", () => {
    it("returns medical orders for a patient", () => {
      const result = mockDb.listMedicalOrders("patient-mock-001")
      expect(result.items).toBeDefined()
    })
  })

  describe("reset", () => {
    it("resets database to initial state", () => {
      // Modify state
      mockDb.createSession({
        patientId: "patient-mock-001",
        entryType: "new",
        chiefComplaint: "test",
      })
      const beforeReset = mockDb.listSessions({})
      const sessionCountBefore = beforeReset.items.length

      mockDb.reset()
      const afterReset = mockDb.listSessions({})
      // After reset, should be back to initial 3 sessions
      expect(afterReset.items.length).toBe(3)
      expect(afterReset.items.length).toBeLessThan(sessionCountBefore)
    })
  })
})
