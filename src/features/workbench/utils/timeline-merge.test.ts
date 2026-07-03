import { describe, expect, it } from "vitest"

import type {
  FlowCard,
  FlowCardTimelineItem,
  MessageTimelineItem,
  SystemEventTimelineItem,
  TerminalTimelineItem,
  TimelineItem,
} from "@/features/workbench/api"
import {
  appendMessageDelta,
  createOptimisticPatientMessage,
  createStreamingAssistantMessage,
  createSystemEventItem,
  createTerminalItem,
  finalizeStreamingMessage,
  flattenTimelinePages,
  timelineItemsShareIdentity,
  upsertFlowCardItem,
} from "@/features/workbench/utils/timeline-merge"

const SESSION_ID = "session-001"

function messageItem(id: string, createdAt: string): MessageTimelineItem {
  return {
    kind: "message",
    id,
    sessionId: SESSION_ID,
    createdAt,
    status: "done",
    role: "patient",
    content: id,
  }
}

function assistantMessageItem(
  id: string,
  createdAt: string,
): MessageTimelineItem {
  return {
    ...messageItem(id, createdAt),
    role: "assistant",
  }
}

function labDecisionCard(id: string): FlowCard {
  return {
    id,
    sessionId: SESSION_ID,
    kind: "lab_decision",
    status: "pending",
    blocking: true,
    title: "建议进行血常规检验",
    createdAt: "2026-06-28T02:00:00.000Z",
    testItems: [{ code: "CBC", name: "血常规", sampleType: "静脉血" }],
    reason: "发热伴咽痛需要区分病毒感染、细菌感染。",
    differentialTargets: ["病毒性上呼吸道感染", "细菌性扁桃体炎"],
    estimatedFee: 35,
  }
}

describe("flattenTimelinePages", () => {
  it("flattens pages and sorts out-of-order items by createdAt ascending", () => {
    const pages = [
      {
        items: [
          messageItem("c", "2026-06-28T03:00:00.000Z"),
          messageItem("a", "2026-06-28T01:00:00.000Z"),
        ],
      },
      {
        items: [
          messageItem("d", "2026-06-28T04:00:00.000Z"),
          messageItem("b", "2026-06-28T02:00:00.000Z"),
        ],
      },
    ]

    const result = flattenTimelinePages(pages)

    expect(result.map((item) => item.id)).toEqual(["a", "b", "c", "d"])
  })

  it("returns an empty array when there are no pages", () => {
    expect(flattenTimelinePages([])).toEqual([])
  })

  it("keeps patient messages before assistant messages when timestamps are equal", () => {
    const createdAt = "2026-06-28T03:00:00.000Z"
    const pages = [
      {
        items: [
          assistantMessageItem("assistant", createdAt),
          messageItem("patient", createdAt),
        ],
      },
    ]

    const result = flattenTimelinePages(pages)

    expect(result.map((item) => item.id)).toEqual(["patient", "assistant"])
  })

  it("keeps original order for equal timestamps with the same tie-break rank", () => {
    const createdAt = "2026-06-28T03:00:00.000Z"
    const pages = [
      {
        items: [
          messageItem("first", createdAt),
          messageItem("second", createdAt),
        ],
      },
    ]

    const result = flattenTimelinePages(pages)

    expect(result.map((item) => item.id)).toEqual(["first", "second"])
  })
})

describe("timelineItemsShareIdentity", () => {
  it("matches optimistic and server messages through localKey", () => {
    const optimistic = createOptimisticPatientMessage(
      "发热",
      "client-msg-1",
      SESSION_ID,
    )
    const serverMessage: MessageTimelineItem = {
      kind: "message",
      id: "server-msg-1",
      sessionId: SESSION_ID,
      createdAt: "2026-06-28T03:00:00.000Z",
      status: "done",
      role: "patient",
      content: "发热",
      localKey: "client-msg-1",
    }

    expect(timelineItemsShareIdentity(optimistic, serverMessage)).toBe(true)
  })

  it("does not match unrelated assistant placeholders", () => {
    const first = assistantMessageItem(
      "stream-1",
      "2026-06-28T03:00:00.000Z",
    )
    const second = assistantMessageItem(
      "stream-2",
      "2026-06-28T03:00:00.000Z",
    )

    expect(timelineItemsShareIdentity(first, second)).toBe(false)
  })
})

describe("createOptimisticPatientMessage", () => {
  it("builds a pending patient message with id and localKey set to clientMessageId", () => {
    const item = createOptimisticPatientMessage(
      "你好",
      "client-msg-1",
      SESSION_ID,
    ) as MessageTimelineItem

    expect(item.kind).toBe("message")
    expect(item.role).toBe("patient")
    expect(item.status).toBe("pending")
    expect(item.content).toBe("你好")
    expect(item.id).toBe("client-msg-1")
    expect(item.localKey).toBe("client-msg-1")
    expect(item.sessionId).toBe(SESSION_ID)
  })
})

describe("createStreamingAssistantMessage", () => {
  it("builds a streaming assistant message with empty content", () => {
    const item = createStreamingAssistantMessage(SESSION_ID) as MessageTimelineItem

    expect(item.kind).toBe("message")
    expect(item.role).toBe("assistant")
    expect(item.status).toBe("streaming")
    expect(item.content).toBe("")
    expect(item.sessionId).toBe(SESSION_ID)
  })
})

describe("appendMessageDelta", () => {
  it("concatenates content for a message item", () => {
    const base = messageItem("m1", "2026-06-28T01:00:00.000Z")
    const first = appendMessageDelta(base, "你") as MessageTimelineItem
    const second = appendMessageDelta(first, "好") as MessageTimelineItem

    expect(second.content).toBe("m1你好")
  })

  it("returns the item unchanged when kind is not message", () => {
    const card: FlowCardTimelineItem = {
      kind: "flow_card",
      id: "card-1",
      sessionId: SESSION_ID,
      createdAt: "2026-06-28T02:00:00.000Z",
      status: "done",
      card: labDecisionCard("card-1"),
    }

    const result = appendMessageDelta(card, "ignored")

    expect(result).toBe(card)
  })
})

describe("finalizeStreamingMessage", () => {
  it("sets status to done and replaces content", () => {
    const streaming = createStreamingAssistantMessage(SESSION_ID)
    const finalized = finalizeStreamingMessage(
      streaming,
      "完整回复",
    ) as MessageTimelineItem

    expect(finalized.status).toBe("done")
    expect(finalized.content).toBe("完整回复")
  })

  it("returns the item unchanged when kind is not message", () => {
    const card: FlowCardTimelineItem = {
      kind: "flow_card",
      id: "card-1",
      sessionId: SESSION_ID,
      createdAt: "2026-06-28T02:00:00.000Z",
      status: "done",
      card: labDecisionCard("card-1"),
    }

    expect(finalizeStreamingMessage(card, "x")).toBe(card)
  })
})

describe("upsertFlowCardItem", () => {
  it("appends a new flow_card item when card.id is absent", () => {
    const items: TimelineItem[] = [
      messageItem("m1", "2026-06-28T01:00:00.000Z"),
    ]
    const card = labDecisionCard("card-1")

    const result = upsertFlowCardItem(items, card)

    expect(result).toHaveLength(2)
    const appended = result[1] as FlowCardTimelineItem
    expect(appended.kind).toBe("flow_card")
    expect(appended.id).toBe("card-1")
    expect(appended.card).toBe(card)
  })

  it("replaces the card in place when a flow_card with the same card.id exists", () => {
    const original = labDecisionCard("card-1")
    const items: TimelineItem[] = [
      messageItem("m1", "2026-06-28T01:00:00.000Z"),
      {
        kind: "flow_card",
        id: "card-1",
        sessionId: SESSION_ID,
        createdAt: original.createdAt,
        status: "done",
        card: original,
      },
    ]
    const updatedCard: FlowCard = { ...labDecisionCard("card-1"), status: "accepted" }

    const result = upsertFlowCardItem(items, updatedCard)

    expect(result).toHaveLength(2)
    const replaced = result[1] as FlowCardTimelineItem
    expect(replaced.card).toBe(updatedCard)
    expect(replaced.card.status).toBe("accepted")
  })
})

describe("createSystemEventItem", () => {
  it("builds a system_event with required fields", () => {
    const item = createSystemEventItem(
      SESSION_ID,
      "context_loaded",
      "已加载上下文",
    ) as SystemEventTimelineItem

    expect(item.kind).toBe("system_event")
    expect(item.sessionId).toBe(SESSION_ID)
    expect(item.status).toBe("done")
    expect(item.eventType).toBe("context_loaded")
    expect(item.title).toBe("已加载上下文")
  })

  it("omits description when not passed", () => {
    const item = createSystemEventItem(
      SESSION_ID,
      "agent_thinking",
      "思考中",
    ) as SystemEventTimelineItem

    expect("description" in item).toBe(false)
  })

  it("includes description when passed", () => {
    const item = createSystemEventItem(
      SESSION_ID,
      "agent_thinking",
      "思考中",
      "正在收敛诊断",
    ) as SystemEventTimelineItem

    expect(item.description).toBe("正在收敛诊断")
  })
})

describe("createTerminalItem", () => {
  it("builds a terminal item with required fields", () => {
    const item = createTerminalItem(
      SESSION_ID,
      "exited",
      "问诊结束",
    ) as TerminalTimelineItem

    expect(item.kind).toBe("terminal")
    expect(item.sessionId).toBe(SESSION_ID)
    expect(item.status).toBe("done")
    expect(item.reason).toBe("exited")
    expect(item.title).toBe("问诊结束")
  })

  it("omits optional description and suggestedDepartment when not passed", () => {
    const item = createTerminalItem(
      SESSION_ID,
      "exited",
      "问诊结束",
    ) as TerminalTimelineItem

    expect("description" in item).toBe(false)
    expect("suggestedDepartment" in item).toBe(false)
  })

  it("includes description and suggestedDepartment when passed", () => {
    const item = createTerminalItem(
      SESSION_ID,
      "referral",
      "建议转诊",
      "需线下专科评估",
      "呼吸内科",
    ) as TerminalTimelineItem

    expect(item.description).toBe("需线下专科评估")
    expect(item.suggestedDepartment).toBe("呼吸内科")
  })
})
