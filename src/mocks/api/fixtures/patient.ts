import type { PatientContext, PatientProfile } from "@/features/patient/api/types"

export const mockPatient: PatientProfile = {
  id: "patient-mock-001",
  name: "李明",
  gender: "male",
  age: 37,
  phoneMasked: "138****2468",
  idCardMasked: "2101**********1234",
  allergies: ["青霉素"],
  chronicDiseases: ["慢性咽炎"],
  longTermMedications: [],
  updatedAt: "2026-06-28T01:30:00.000Z",
}

export const mockPatientContext: PatientContext = {
  patient: mockPatient,
  chiefComplaint: "发热两天，伴咽痛",
  medicalHistory: ["慢性咽炎病史 3 年"],
  allergies: mockPatient.allergies,
  longTermMedications: mockPatient.longTermMedications,
  priorVisit: {
    sessionId: "visit-mock-completed",
    completedAt: "2026-06-18T03:30:00.000Z",
    diagnosis: "急性上呼吸道感染",
    labResultSummary: "血常规白细胞轻度升高，C 反应蛋白轻度升高",
    treatmentSummary: "口服对症药物并观察体温变化",
  },
}
