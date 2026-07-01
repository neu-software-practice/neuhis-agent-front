import type { VisitSession } from "@/features/visits/api/types"

import { mockPatient } from "@/mocks/api/fixtures/patient"

export const mockActiveSession: VisitSession = {
  id: "visit-mock-active",
  patientId: mockPatient.id,
  patientName: mockPatient.name,
  entryType: "new",
  status: "chatting",
  startedAt: "2026-06-28T01:50:00.000Z",
  updatedAt: "2026-06-28T01:55:00.000Z",
  lastActivityAt: "2026-06-28T01:55:00.000Z",
  askRound: 1,
  askRoundLimit: 6,
  labRound: 0,
  labRoundLimit: 2,
  timerPaused: false,
  summary: {
    chiefComplaint: "发热两天，伴咽痛",
    lastMessage: "请继续描述体温最高多少度，以及是否咳嗽、胸闷。",
  },
}

export const mockCompletedSession: VisitSession = {
  id: "visit-mock-completed",
  patientId: mockPatient.id,
  patientName: mockPatient.name,
  entryType: "new",
  status: "completed",
  startedAt: "2026-06-18T02:30:00.000Z",
  updatedAt: "2026-06-18T03:30:00.000Z",
  endedAt: "2026-06-18T03:30:00.000Z",
  lastActivityAt: "2026-06-18T03:30:00.000Z",
  askRound: 3,
  askRoundLimit: 6,
  labRound: 1,
  labRoundLimit: 2,
  timerPaused: false,
  summary: {
    chiefComplaint: "咽痛、低热",
    diagnosis: "急性上呼吸道感染",
    treatmentSummary: "对症用药并观察。",
    lastMessage: "本次问诊已完成。",
  },
}
