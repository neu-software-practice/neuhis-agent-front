import { describe, expect, it } from "vitest"

import {
  loginInputSchema,
  refreshInputSchema,
  registerFormSchema,
} from "@/features/auth/api/schemas"

describe("loginInputSchema", () => {
  it("accepts a valid phone + password", () => {
    const result = loginInputSchema.safeParse({
      phone: "13800138000",
      password: "anypassword",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an empty password", () => {
    const result = loginInputSchema.safeParse({
      phone: "13800138000",
      password: "",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("请输入密码")
    }
  })

  it("rejects a phone number that does not start with 1", () => {
    const result = loginInputSchema.safeParse({
      phone: "23800138000",
      password: "pass",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a phone number starting with 1 but second digit < 3", () => {
    const result = loginInputSchema.safeParse({
      phone: "12800138000",
      password: "pass",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a phone number with fewer than 11 digits", () => {
    const result = loginInputSchema.safeParse({
      phone: "1380013800",
      password: "pass",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a phone number with more than 11 digits", () => {
    const result = loginInputSchema.safeParse({
      phone: "138001380001",
      password: "pass",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a non-numeric phone number", () => {
    const result = loginInputSchema.safeParse({
      phone: "1380013800a",
      password: "pass",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing phone field", () => {
    const result = loginInputSchema.safeParse({
      password: "pass",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing password field", () => {
    const result = loginInputSchema.safeParse({
      phone: "13800138000",
    })
    expect(result.success).toBe(false)
  })

  it("rejects completely empty input", () => {
    const result = loginInputSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects wrong types (number phone)", () => {
    const result = loginInputSchema.safeParse({
      phone: 13800138000,
      password: "pass",
    })
    expect(result.success).toBe(false)
  })
})

describe("registerFormSchema", () => {
  function validRegisterInput() {
    return {
      phone: "13800138000",
      password: "Pass1234",
      confirmPassword: "Pass1234",
      realName: "张三",
      gender: "男",
      birthDate: "1990-01-15",
    }
  }

  it("accepts a fully valid registration form", () => {
    const result = registerFormSchema.safeParse(validRegisterInput())
    expect(result.success).toBe(true)
  })

  it("rejects password shorter than 8 characters", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      password: "Ab1",
      confirmPassword: "Ab1",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("密码至少 8 位")
    }
  })

  it("rejects password longer than 32 characters", () => {
    const longPwd = "A1" + "a".repeat(31)
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      password: longPwd,
      confirmPassword: longPwd,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("密码最长 32 位")
    }
  })

  it("rejects password without letters", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      password: "12345678",
      confirmPassword: "12345678",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("密码需包含字母")
    }
  })

  it("rejects password without digits", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      password: "abcdefgh",
      confirmPassword: "abcdefgh",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("密码需包含数字")
    }
  })

  it("rejects mismatched confirmPassword", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      confirmPassword: "Different1",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmIssue = result.error.issues.find(
        (i) => i.path[0] === "confirmPassword",
      )
      expect(confirmIssue?.message).toBe("两次输入的密码不一致")
    }
  })

  it("rejects empty confirmPassword", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      confirmPassword: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty realName", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      realName: "",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("请输入真实姓名")
    }
  })

  it("rejects realName exceeding 32 characters", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      realName: "张".repeat(33),
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty gender", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      gender: "",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("请输入性别")
    }
  })

  it("rejects invalid birthDate format", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      birthDate: "19900115",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "出生日期格式无效，应为 YYYY-MM-DD",
      )
    }
  })

  it("rejects impossible date (e.g. Feb 30)", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      birthDate: "1990-02-30",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid phone", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      phone: "123",
    })
    expect(result.success).toBe(false)
  })

  it("trims whitespace from realName before validation", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      realName: "   ",
    })
    expect(result.success).toBe(false)
  })

  it("trims whitespace from gender before validation", () => {
    const result = registerFormSchema.safeParse({
      ...validRegisterInput(),
      gender: "   ",
    })
    expect(result.success).toBe(false)
  })
})

describe("refreshInputSchema", () => {
  it("accepts a non-empty refreshToken string", () => {
    const result = refreshInputSchema.safeParse({
      refreshToken: "some-token-value",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an empty refreshToken", () => {
    const result = refreshInputSchema.safeParse({
      refreshToken: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing refreshToken", () => {
    const result = refreshInputSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects non-string refreshToken", () => {
    const result = refreshInputSchema.safeParse({
      refreshToken: 12345,
    })
    expect(result.success).toBe(false)
  })
})
