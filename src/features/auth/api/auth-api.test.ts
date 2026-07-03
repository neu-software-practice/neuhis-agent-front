import { beforeEach, describe, expect, it, vi } from "vitest"

import { getTransport } from "@/lib/api"

import { authApi } from "@/features/auth/api/auth-api"

vi.mock("@/lib/api", () => ({
  getTransport: vi.fn(),
}))

describe("authApi", () => {
  const mockTransport = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    stream: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getTransport as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockTransport)
  })

  describe("login", () => {
    it("calls POST /auth/login with phone and password", async () => {
      const input = { phone: "13800138000", password: "Pass1234" }
      const response = {
        accessToken: "at",
        refreshToken: "rt",
        expiresIn: 900,
        user: { userId: "u1", patientId: "p1", phone: "13800138000" },
      }
      mockTransport.post.mockResolvedValue(response)

      const result = await authApi.login(input)

      expect(mockTransport.post).toHaveBeenCalledWith("/auth/login", input)
      expect(mockTransport.post).toHaveBeenCalledTimes(1)
      expect(result).toEqual(response)
    })

    it("returns the full AuthResponse including user", async () => {
      const response = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresIn: 1800,
        user: {
          userId: "user-42",
          patientId: "patient-42",
          phone: "13900139000",
          realName: "Test",
          createdAt: "2026-01-01T00:00:00Z",
        },
      }
      mockTransport.post.mockResolvedValue(response)

      const result = await authApi.login({
        phone: "13900139000",
        password: "pwd",
      })

      expect(result.user.userId).toBe("user-42")
      expect(result.expiresIn).toBe(1800)
    })

    it("accepts user with minimal fields (no realName or createdAt)", async () => {
      const input = { phone: "13800138000", password: "Pass1234" }
      const response = {
        accessToken: "at",
        refreshToken: "rt",
        expiresIn: 900,
        user: { userId: "u1", patientId: "p1", phone: "13800138000" },
      }
      mockTransport.post.mockResolvedValue(response)

      const result = await authApi.login(input)

      expect(result.user.realName).toBeUndefined()
      expect(result.user.createdAt).toBeUndefined()
    })
  })

  describe("register", () => {
    it("calls POST /auth/register with registration input", async () => {
      const input = {
        phone: "13800138000",
        password: "Pass1234",
        realName: "张三",
        gender: "男",
        birthDate: "1990-01-01",
      }
      const response = {
        accessToken: "at",
        refreshToken: "rt",
        expiresIn: 900,
        user: { userId: "u1", patientId: "p1", phone: "13800138000", realName: "张三" },
      }
      mockTransport.post.mockResolvedValue(response)

      const result = await authApi.register(input)

      expect(mockTransport.post).toHaveBeenCalledWith("/auth/register", input)
      expect(mockTransport.post).toHaveBeenCalledTimes(1)
      expect(result).toEqual(response)
    })

    it("works with minimal input (phone + password only)", async () => {
      const input = { phone: "13800138000", password: "Pass1234" }
      mockTransport.post.mockResolvedValue({
        accessToken: "at",
        refreshToken: "rt",
        expiresIn: 900,
        user: { userId: "u1", patientId: "p1", phone: "13800138000" },
      })

      await authApi.register(input)

      expect(mockTransport.post).toHaveBeenCalledWith("/auth/register", input)
    })
  })

  describe("refresh", () => {
    it("calls POST /auth/refresh with refreshToken", async () => {
      const input = { refreshToken: "my-refresh-token" }
      const response = {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        expiresIn: 900,
      }
      mockTransport.post.mockResolvedValue(response)

      const result = await authApi.refresh(input)

      expect(mockTransport.post).toHaveBeenCalledWith("/auth/refresh", input)
      expect(mockTransport.post).toHaveBeenCalledTimes(1)
      expect(result).toEqual(response)
    })

    it("returns a TokenPair (no user field)", async () => {
      const response = {
        accessToken: "access",
        refreshToken: "refresh",
        expiresIn: 900,
      }
      mockTransport.post.mockResolvedValue(response)

      const result = await authApi.refresh({ refreshToken: "rt" })

      expect(result).toHaveProperty("accessToken")
      expect(result).toHaveProperty("refreshToken")
      expect(result).toHaveProperty("expiresIn")
      expect((result as any).user).toBeUndefined()
    })
  })

  describe("logout", () => {
    it("calls POST /auth/logout with refreshToken in body", async () => {
      mockTransport.post.mockResolvedValue(undefined)

      await authApi.logout("some-refresh-token")

      expect(mockTransport.post).toHaveBeenCalledWith("/auth/logout", {
        refreshToken: "some-refresh-token",
      })
      expect(mockTransport.post).toHaveBeenCalledTimes(1)
    })

    it("resolves to void", async () => {
      mockTransport.post.mockResolvedValue(undefined)

      const result = await authApi.logout("token")

      expect(result).toBeUndefined()
    })
  })

  describe("error propagation", () => {
    it("propagates transport errors from login", async () => {
      mockTransport.post.mockRejectedValue(new Error("Network error"))

      await expect(
        authApi.login({ phone: "13800138000", password: "pass" }),
      ).rejects.toThrow("Network error")
    })

    it("propagates transport errors from register", async () => {
      mockTransport.post.mockRejectedValue(new Error("Conflict"))

      await expect(
        authApi.register({ phone: "13800138000", password: "Pass1234" }),
      ).rejects.toThrow("Conflict")
    })

    it("propagates transport errors from refresh", async () => {
      mockTransport.post.mockRejectedValue(new Error("Token expired"))

      await expect(
        authApi.refresh({ refreshToken: "expired" }),
      ).rejects.toThrow("Token expired")
    })

    it("propagates transport errors from logout", async () => {
      mockTransport.post.mockRejectedValue(new Error("Server error"))

      await expect(authApi.logout("token")).rejects.toThrow("Server error")
    })

    it("propagates non-Error rejection (string) from login", async () => {
      mockTransport.post.mockRejectedValue("Unauthorized")

      await expect(
        authApi.login({ phone: "13800138000", password: "pass" }),
      ).rejects.toBe("Unauthorized")
    })

    it("propagates HTTP-like error object from refresh", async () => {
      const httpError = { status: 401, message: "Invalid refresh token" }
      mockTransport.post.mockRejectedValue(httpError)

      await expect(
        authApi.refresh({ refreshToken: "bad" }),
      ).rejects.toEqual(httpError)
    })
  })
})
