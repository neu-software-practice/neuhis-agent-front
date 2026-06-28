import { apiConfig } from "@/lib/api/config"
import { createHttpTransport } from "@/lib/api/client"
import type { ApiTransport } from "@/lib/api/transport"
import { createMockTransport } from "@/mocks/api/mock-transport"

let transport: ApiTransport | null = null

export function getTransport(): ApiTransport {
  if (transport) {
    return transport
  }

  transport =
    apiConfig.mode === "mock" ? createMockTransport() : createHttpTransport()

  return transport
}

export function resetTransportForTests() {
  transport = null
}
