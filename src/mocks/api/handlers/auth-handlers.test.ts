import { beforeEach, describe, expect, it } from "vitest"

import { mockDb } from "@/mocks/api/mock-db"
import {
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
} from "@/mocks/api/handlers/auth-handlers"

describe("auth handlers", () => {
  beforeEach(() => {
    mockDb.reset()
  })

  describe("handleRegister", () => {
    it("registers a new user and returns tokens", () => {
      const result = handleRegister({
        phone: "13811113333",
        password: "pass1234",
        realName: "王五",
        gender: "female",
        birthDate: "1995-05-05",
      })
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
      expect(result.expiresIn).toBe(900)
      expect(result.user.phone).toBe("13811113333")
      expect(result.user.realName).toBe("王五")
    })

    it("rejects duplicate phone", () => {
      expect(() =>
        handleRegister({ phone: "13800002468", password: "any" }),
      ).toThrow()
    })
  })

  describe("handleLogin", () => {
    it("logs in with correct credentials", () => {
      const result = handleLogin({ phone: "13800002468", password: "12345678" })
      expect(result.accessToken).toBeTruthy()
      expect(result.user.userId).toBe("user-seed-001")
    })

    it("rejects wrong password", () => {
      expect(() =>
        handleLogin({ phone: "13800002468", password: "wrong" }),
      ).toThrow()
    })
  })

  describe("handleRefresh", () => {
    it("returns new tokens", async () => {
      const login = handleLogin({ phone: "13800002468", password: "12345678" })
      await new Promise((r) => setTimeout(r, 2))
      const result = handleRefresh({ refreshToken: login.refreshToken })
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
    })

    it("rejects invalid token", () => {
      expect(() => handleRefresh({ refreshToken: "invalid" })).toThrow()
    })
  })

  describe("handleLogout", () => {
    it("does not throw with valid token", () => {
      const login = handleLogin({ phone: "13800002468", password: "12345678" })
      expect(() => handleLogout({ refreshToken: login.refreshToken })).not.toThrow()
    })

    it("handles missing token gracefully", () => {
      expect(() => handleLogout({})).not.toThrow()
    })
  })
})
