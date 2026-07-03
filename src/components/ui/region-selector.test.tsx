import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { RegionSelector, type RegionValue } from "@/components/ui/region-selector"

const EMPTY_VALUE: RegionValue = { province: "", city: "", district: "" }

describe("RegionSelector", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders province, city, and district selects", () => {
    render(
      <RegionSelector value={EMPTY_VALUE} onChange={() => {}} />,
    )
    // "省份" appears as both a label and a select placeholder
    expect(screen.getAllByText("省份").length).toBeGreaterThan(0)
    expect(screen.getAllByText("城市").length).toBeGreaterThan(0)
    expect(screen.getAllByText("区县").length).toBeGreaterThan(0)
  })

  it("renders with a pre-selected province", () => {
    render(
      <RegionSelector
        value={{ province: "辽宁省", city: "", district: "" }}
        onChange={() => {}}
      />,
    )
    expect(screen.getAllByText("省份").length).toBeGreaterThan(0)
  })

  it("renders with full pre-selected value", () => {
    render(
      <RegionSelector
        value={{
          province: "辽宁省",
          city: "沈阳市",
          district: "浑南区",
        }}
        onChange={() => {}}
      />,
    )
    expect(screen.getAllByText("省份").length).toBeGreaterThan(0)
    expect(screen.getAllByText("城市").length).toBeGreaterThan(0)
    expect(screen.getAllByText("区县").length).toBeGreaterThan(0)
  })

  it("renders in column layout", () => {
    render(
      <RegionSelector
        value={EMPTY_VALUE}
        onChange={() => {}}
        layout="col"
      />,
    )
    expect(screen.getAllByText("省份").length).toBeGreaterThan(0)
  })

  it("renders error messages", () => {
    render(
      <RegionSelector
        value={EMPTY_VALUE}
        onChange={() => {}}
        isInvalid={{
          province: true,
          city: false,
          district: false,
        }}
        errorMessage={{
          province: "请选择省份",
        }}
      />,
    )
    expect(screen.getByText("请选择省份")).toBeInTheDocument()
  })

  it("renders boolean isInvalid for all fields", () => {
    render(
      <RegionSelector
        value={EMPTY_VALUE}
        onChange={() => {}}
        isInvalid={true}
      />,
    )
    expect(screen.getAllByText("省份").length).toBeGreaterThan(0)
  })

  it("passes through className", () => {
    const { container } = render(
      <RegionSelector
        value={EMPTY_VALUE}
        onChange={() => {}}
        className="custom-region"
      />,
    )
    expect(container.querySelector(".custom-region")).not.toBeNull()
  })

  it("renders disabled state", () => {
    render(
      <RegionSelector
        value={EMPTY_VALUE}
        onChange={() => {}}
        isDisabled
      />,
    )
    expect(screen.getAllByText("省份").length).toBeGreaterThan(0)
  })
})
