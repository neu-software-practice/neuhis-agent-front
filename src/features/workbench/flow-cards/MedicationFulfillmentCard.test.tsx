import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { MedicationFulfillmentCard } from "@/features/workbench/flow-cards/MedicationFulfillmentCard"
import { resetTransportForTests } from "@/lib/api"
import { createMedicationFulfillmentCard } from "@/mocks/api/fixtures/flow-cards"
import { mockDb } from "@/mocks/api/mock-db"

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )

  return queryClient
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  mockDb.reset()
  resetTransportForTests()
})

describe("MedicationFulfillmentCard", () => {
  it("submits the selected delivery address before closing the picker", async () => {
    const user = userEvent.setup()
    const onAction = vi.fn(async () => {})
    const card = createMedicationFulfillmentCard(
      "visit-mock-active",
      "card-medication-fulfillment",
    )
    if (card.kind !== "medication_fulfillment") {
      throw new Error("expected medication fulfillment card")
    }

    renderWithQueryClient(
      <MedicationFulfillmentCard
        card={card}
        patientId="patient-mock-001"
        onAction={onAction}
      />,
    )

    const deliveryButton = screen.getByRole("button", { name: /配送/ })
    expect(deliveryButton).toBeEnabled()
    await user.click(deliveryButton)

    expect(await screen.findByText("选择配送地址")).toBeInTheDocument()
    expect(await screen.findByText(/创新路195号/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "确认配送" }))

    await waitFor(() => {
      expect(onAction).toHaveBeenCalledWith({
        type: "choose_fulfillment",
        cardId: card.id,
        mode: "delivery",
        addressId: "addr-seed-001",
      })
    })
    await waitFor(() => {
      expect(screen.queryByText("选择配送地址")).not.toBeInTheDocument()
    })
  })
})
