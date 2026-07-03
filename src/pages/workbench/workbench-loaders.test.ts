import { describe, it, expect } from "vitest"
import type { LoaderFunctionArgs } from "react-router"
import {
  newWorkbenchLoader,
  workbenchLoader,
  readonlyVisitLoader,
} from "./workbench-loaders"

function mockRequest(url: string): Request {
  return { url } as unknown as Request
}

function mockArgs(overrides: Partial<LoaderFunctionArgs> = {}): LoaderFunctionArgs {
  return {
    request: mockRequest("http://localhost/"),
    params: {},
    context: {},
    ...overrides,
  } as LoaderFunctionArgs
}

describe("newWorkbenchLoader", () => {
  it("returns null for both params when no search params are present", () => {
    const result = newWorkbenchLoader(
      mockArgs({ request: mockRequest("http://localhost/workbench/new") })
    )
    expect(result).toEqual({ draft: null, followUpFrom: null })
  })

  it("returns both draft and followUpFrom when both params are present", () => {
    const result = newWorkbenchLoader(
      mockArgs({
        request: mockRequest(
          "http://localhost/workbench/new?draft=hello&followUpFrom=abc123"
        ),
      })
    )
    expect(result).toEqual({ draft: "hello", followUpFrom: "abc123" })
  })

  it("returns only draft when followUpFrom is missing", () => {
    const result = newWorkbenchLoader(
      mockArgs({ request: mockRequest("http://localhost/workbench/new?draft=hello") })
    )
    expect(result).toEqual({ draft: "hello", followUpFrom: null })
  })
})

describe("workbenchLoader", () => {
  it("returns sessionId when valid", () => {
    const result = workbenchLoader(mockArgs({ params: { sessionId: "abc123" } }))
    expect(result).toEqual({ sessionId: "abc123" })
  })

  it("throws redirect when sessionId is undefined", () => {
    expect(() =>
      workbenchLoader(mockArgs({ params: { sessionId: undefined } }))
    ).toThrow()
  })

  it("throws redirect when sessionId contains whitespace", () => {
    expect(() =>
      workbenchLoader(mockArgs({ params: { sessionId: "abc 123" } }))
    ).toThrow()
  })
})

describe("readonlyVisitLoader", () => {
  it("returns sessionId when valid", () => {
    const result = readonlyVisitLoader(
      mockArgs({ params: { sessionId: "abc123" } })
    )
    expect(result).toEqual({ sessionId: "abc123" })
  })

  it("throws redirect to /history when sessionId is undefined", () => {
    expect(() =>
      readonlyVisitLoader(mockArgs({ params: { sessionId: undefined } }))
    ).toThrow()
  })
})
