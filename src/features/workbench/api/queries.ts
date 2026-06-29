import { infiniteQueryOptions, mutationOptions, queryOptions } from "@tanstack/react-query"

import { workbenchApi } from "@/features/workbench/api"
import type {
  AckAdviceInput,
  DismissEmergencyInput,
  ExitVisitInput,
  ListTimelineInput,
  ReportVitalsInput,
  SendMessageInput,
  SubmitFulfillmentInput,
  SubmitLabDecisionInput,
  SubmitPaymentInput,
  SubmitTreatmentExecutionInput,
} from "@/features/workbench/api/types"
import type { SessionId } from "@/lib/api/types"

export const workbenchQueryKeys = {
  all: ["workbench"] as const,
  session: (sessionId: SessionId) =>
    [...workbenchQueryKeys.all, "session", sessionId] as const,
  timeline: (sessionId: SessionId) =>
    [...workbenchQueryKeys.all, "timeline", sessionId] as const,
}

export const workbenchQueries = {
  session: (sessionId: SessionId) =>
    queryOptions({
      queryKey: workbenchQueryKeys.session(sessionId),
      queryFn: () => workbenchApi.getSession(sessionId),
    }),
  timeline: (input: ListTimelineInput) =>
    infiniteQueryOptions({
      queryKey: workbenchQueryKeys.timeline(input.sessionId),
      queryFn: ({ pageParam }) =>
        workbenchApi.listTimeline({
          ...input,
          cursor: pageParam,
        }),
      initialPageParam: input.cursor,
      getNextPageParam: (lastPage) =>
        lastPage.hasMore ? lastPage.nextCursor : undefined,
    }),
}

export const workbenchMutations = {
  sendMessage: () =>
    mutationOptions({
      mutationFn: (input: SendMessageInput) => workbenchApi.sendMessage(input),
    }),
  submitLabDecision: () =>
    mutationOptions({
      mutationFn: (input: SubmitLabDecisionInput) =>
        workbenchApi.submitLabDecision(input),
    }),
  submitPayment: () =>
    mutationOptions({
      mutationFn: (input: SubmitPaymentInput) => workbenchApi.submitPayment(input),
    }),
  submitFulfillment: () =>
    mutationOptions({
      mutationFn: (input: SubmitFulfillmentInput) =>
        workbenchApi.submitFulfillment(input),
    }),
  submitTreatmentExecution: () =>
    mutationOptions({
      mutationFn: (input: SubmitTreatmentExecutionInput) =>
        workbenchApi.submitTreatmentExecution(input),
    }),
  ackAdvice: () =>
    mutationOptions({
      mutationFn: (input: AckAdviceInput) => workbenchApi.ackAdvice(input),
    }),
  exitVisit: () =>
    mutationOptions({
      mutationFn: (input: ExitVisitInput) => workbenchApi.exitVisit(input),
    }),
  reportVitals: () =>
    mutationOptions({
      mutationFn: (input: ReportVitalsInput) => workbenchApi.reportVitals(input),
    }),
  pauseVisitTimer: () =>
    mutationOptions({
      mutationFn: (input: { sessionId: SessionId }) =>
        workbenchApi.pauseVisitTimer(input),
    }),
  resumeVisitTimer: () =>
    mutationOptions({
      mutationFn: (input: { sessionId: SessionId }) =>
        workbenchApi.resumeVisitTimer(input),
    }),
  dismissEmergency: () =>
    mutationOptions({
      mutationFn: (input: DismissEmergencyInput) =>
        workbenchApi.dismissEmergency(input),
    }),
}
