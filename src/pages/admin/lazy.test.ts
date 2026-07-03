import { describe, expect, it } from "vitest"

import * as lazyModule from "@/pages/admin/lazy"

describe("admin lazy imports", () => {
  it("exports AdminLoginPage", () => {
    expect(lazyModule.AdminLoginPage).toBeDefined()
  })

  it("exports AdminGuard", () => {
    expect(lazyModule.AdminGuard).toBeDefined()
  })

  it("exports AdminShell", () => {
    expect(lazyModule.AdminShell).toBeDefined()
  })

  it("exports DashboardPage", () => {
    expect(lazyModule.DashboardPage).toBeDefined()
  })

  it("exports PatientListPage", () => {
    expect(lazyModule.PatientListPage).toBeDefined()
  })

  it("exports SessionListPage", () => {
    expect(lazyModule.SessionListPage).toBeDefined()
  })

  it("exports SettingsPage", () => {
    expect(lazyModule.SettingsPage).toBeDefined()
  })

  it("all exports are React lazy components (have $$typeof)", () => {
    const lazyComponents = [
      lazyModule.AdminLoginPage,
      lazyModule.AdminGuard,
      lazyModule.AdminShell,
      lazyModule.DashboardPage,
      lazyModule.PatientListPage,
      lazyModule.SessionListPage,
      lazyModule.SettingsPage,
    ]

    for (const component of lazyComponents) {
      // React.lazy returns a LazyComponent with a $$typeof Symbol
      expect(component).toBeDefined()
      expect(component.$$typeof).toBeDefined()
      expect(component.$$typeof.toString()).toContain("Symbol")
    }
  })
})
