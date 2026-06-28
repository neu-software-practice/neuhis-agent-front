import { memo } from "react"
import { Card, CardHeader, Chip } from "@heroui/react"
import type { ChipProps } from "@heroui/react"
import { AlertTriangle, ClipboardList } from "lucide-react"

import type { FlowCard } from "@/features/workbench/api"
import { formatDateTime } from "@/lib/time"

interface TreatmentPlanCardProps {
  card: FlowCard & { kind: "treatment_plan" }
  disabled?: boolean
}

const planLabels: Record<string, string> = {
  medication: "药物治疗",
  treatment: "院内治疗",
  advice_only: "仅医嘱",
  referral: "转诊",
}

const capabilityConfig: Record<
  string,
  { label: string; color: ChipProps["color"] }
> = {
  available: { label: "本院可执行", color: "success" },
  limited: { label: "部分可执行", color: "warning" },
  unavailable: { label: "需转诊", color: "danger" },
}

/**
 * 处置方案卡片。
 *
 * 展示 AI 制定的处置方案，包括方案类型、本院执行能力、方案摘要和具体行动项。
 * 信息型卡片，患者仅查看无需操作。
 */
export const TreatmentPlanCard = memo(function TreatmentPlanCard({
  card,
}: TreatmentPlanCardProps) {
  const cap = capabilityConfig[card.capability]

  return (
    <Card className="w-full border border-divider">
      <CardHeader className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" />
          <span className="text-sm font-medium">{card.title}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {formatDateTime(card.createdAt)}
        </span>
      </CardHeader>

      <Card.Content className="space-y-3 pb-2 pt-0">
        {/* 方案类型与执行能力 */}
        <div className="flex items-center gap-2">
          <Chip size="sm" variant="tertiary" color="accent">
            {planLabels[card.plan] ?? card.plan}
          </Chip>
          {cap ? (
            <Chip size="sm" variant="tertiary" color={cap.color}>
              {cap.label}
            </Chip>
          ) : null}
        </div>

        {/* 处置方案摘要 */}
        <div>
          <span className="text-xs font-medium text-foreground/70">处置方案</span>
          <p className="mt-0.5 text-sm text-foreground/80">{card.summary}</p>
        </div>

        {/* 行动项 */}
        {card.actions.length > 0 ? (
          <div>
            <span className="text-xs font-medium text-foreground/70">行动项</span>
            <ul className="mt-1 space-y-1">
              {card.actions.map((action, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-foreground/80"
                >
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 能力不足提示 */}
        {card.capability === "unavailable" || card.capability === "limited" ? (
          <div className="flex items-start gap-2 rounded-md bg-warning/5 px-3 py-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <span className="text-xs font-medium text-warning">
                {card.capability === "unavailable"
                  ? "本院无法执行该方案"
                  : "本院仅能部分执行"}
              </span>
              <p className="text-xs text-warning/70">
                {card.capability === "unavailable"
                  ? "建议前往上级医院就诊，或联系医生咨询转诊事宜"
                  : "部分项目需配合转诊或外送检验完成"}
              </p>
            </div>
          </div>
        ) : null}
      </Card.Content>
    </Card>
  )
})
