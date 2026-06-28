import { memo } from "react"
import { Card, CardHeader, Chip } from "@heroui/react"
import { AlertTriangle, CheckCircle, Stethoscope } from "lucide-react"

import type { FlowCard } from "@/features/workbench/api"
import { formatDateTime } from "@/lib/time"

interface DiagnosisCardProps {
  card: FlowCard & { kind: "diagnosis" }
  disabled?: boolean
}

const confidenceConfig: Record<
  string,
  { label: string; color: "warning" | "accent" | "success" }
> = {
  low: { label: "低", color: "warning" },
  medium: { label: "中", color: "accent" },
  high: { label: "高", color: "success" },
}

const evidenceSourceLabels: Record<string, string> = {
  history: "病史",
  answer: "问诊回答",
  lab_result: "检验结果",
}

/**
 * 诊断结果卡片。
 *
 * 展示 AI 的诊断结论、置信度、依据和风险信号。
 * 信息型卡片，无需患者操作。
 */
export const DiagnosisCard = memo(function DiagnosisCard({
  card,
}: DiagnosisCardProps) {
  const conf = confidenceConfig[card.confidence]

  return (
    <Card className="w-full border border-divider">
      <CardHeader className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <Stethoscope className="size-4 text-primary" />
          <span className="text-sm font-medium">{card.title}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {formatDateTime(card.createdAt)}
        </span>
      </CardHeader>

      <Card.Content className="space-y-3 pb-2 pt-0">
        {/* 诊断结论 */}
        <div>
          <span className="text-xs font-medium text-foreground/70">诊断结论</span>
          <p className="mt-0.5 text-base font-semibold text-foreground">
            {card.diagnosis}
          </p>
        </div>

        {/* 置信度 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">置信度：</span>
          <Chip size="sm" variant="tertiary" color={conf?.color ?? "default"}>
            {conf?.label ?? card.confidence}
          </Chip>
        </div>

        {/* 诊断依据 */}
        {card.evidence.length > 0 ? (
          <div>
            <span className="text-xs font-medium text-foreground/70">诊断依据</span>
            <ul className="mt-1 space-y-1">
              {card.evidence.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-foreground/80"
                >
                  <CheckCircle className="mt-0.5 size-3.5 shrink-0 text-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 依据来源 */}
        {card.evidenceSources.length > 0 ? (
          <div>
            <span className="text-xs font-medium text-foreground/70">依据来源</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {card.evidenceSources.map((source) => (
                <Chip key={source} size="sm" variant="tertiary" color="default">
                  {evidenceSourceLabels[source] ?? source}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        {/* 风险信号 */}
        {card.riskSignals.length > 0 ? (
          <div className="rounded-md bg-danger/5 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-danger" />
              <span className="text-xs font-medium text-danger">风险提示</span>
            </div>
            <ul className="mt-1 space-y-0.5">
              {card.riskSignals.map((signal, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1.5 text-sm text-danger/80"
                >
                  <span className="mt-1 block size-1 shrink-0 rounded-full bg-danger/60" />
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card.Content>
    </Card>
  )
})
