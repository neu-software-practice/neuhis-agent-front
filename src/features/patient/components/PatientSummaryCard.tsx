import { Card, CardHeader, CardContent } from "@heroui/react"
import { Chip } from "@heroui/react"
import { Phone, ShieldAlert } from "lucide-react"

import type { PatientProfile } from "@/features/patient/api"
import { cn } from "@/lib/utils"

/**
 * Gender → 中文文案。
 */
const GENDER_LABEL: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
  unknown: "未知",
}

interface PatientSummaryCardProps {
  /** 患者档案。 */
  patient: PatientProfile
  className?: string
}

/**
 * 患者摘要卡片。
 *
 * 展示姓名、性别、年龄、脱敏手机号、过敏史（红色调）、
 * 慢性病列表、长期用药列表。
 */
export function PatientSummaryCard({
  patient,
  className,
}: PatientSummaryCardProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-semibold">{patient.name}</h2>
          <span className="text-sm text-muted-foreground">
            {GENDER_LABEL[patient.gender] ?? "未知"}
          </span>
          <span className="text-sm text-muted-foreground">{patient.age}岁</span>
        </div>
        {patient.phoneMasked ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Phone className="size-3.5" />
            <span>{patient.phoneMasked}</span>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* 过敏史 */}
        {patient.allergies.length > 0 ? (
          <section>
            <div className="mb-1.5 flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
              <ShieldAlert className="size-4" />
              <span>过敏史</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {patient.allergies.map((allergy) => (
                <Chip key={allergy} color="danger" variant="soft" size="sm">
                  {allergy}
                </Chip>
              ))}
            </div>
          </section>
        ) : null}

        {/* 慢性病 */}
        {patient.chronicDiseases.length > 0 ? (
          <section>
            <div className="mb-1.5 text-sm font-medium text-foreground">
              慢性病
            </div>
            <div className="flex flex-wrap gap-1.5">
              {patient.chronicDiseases.map((disease) => (
                <Chip key={disease} color="warning" variant="soft" size="sm">
                  {disease}
                </Chip>
              ))}
            </div>
          </section>
        ) : null}

        {/* 长期用药 */}
        {patient.longTermMedications.length > 0 ? (
          <section>
            <div className="mb-1.5 text-sm font-medium text-foreground">
              长期用药
            </div>
            <div className="flex flex-wrap gap-1.5">
              {patient.longTermMedications.map((med) => (
                <Chip key={med} color="default" variant="soft" size="sm">
                  {med}
                </Chip>
              ))}
            </div>
          </section>
        ) : null}

        {/* 无任何医疗记录 */}
        {patient.allergies.length === 0 &&
        patient.chronicDiseases.length === 0 &&
        patient.longTermMedications.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无医疗记录</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
