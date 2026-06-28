import { memo } from "react"
import { Button, Card, CardFooter, CardHeader, Chip } from "@heroui/react"
import { Package, Pill, Truck } from "lucide-react"

import type { FlowCard, FlowCardAction } from "@/features/workbench/api"
import { formatDateTime } from "@/lib/time"

interface MedicationFulfillmentCardProps {
  card: FlowCard & { kind: "medication_fulfillment" }
  disabled?: boolean
  onAction?: (action: FlowCardAction) => void
}

const fulfillmentStatusLabel: Record<string, string> = {
  pending: "待取药",
  confirmed: "已确认",
  completed: "已完成",
}

const modeLabels: Record<string, string> = {
  pickup: "自取",
  delivery: "配送",
}

/**
 * 取药卡片。
 *
 * 展示处方药品明细，患者可选择自取或配送方式。
 * - pending: 显示自取/配送选择按钮
 * - confirmed/completed: 显示已确认方式和状态
 */
export const MedicationFulfillmentCard = memo(
  function MedicationFulfillmentCard({
    card,
    disabled,
    onAction,
  }: MedicationFulfillmentCardProps) {
    const isHandled = card.fulfillmentStatus !== "pending"
    const isLocked = disabled || isHandled

    return (
      <Card className="w-full border border-divider">
        <CardHeader className="flex items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <Pill className="size-4 text-primary" />
            <span className="text-sm font-medium">{card.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Chip
              size="sm"
              variant="tertiary"
              color={
                card.fulfillmentStatus === "completed"
                  ? "success"
                  : card.fulfillmentStatus === "confirmed"
                    ? "accent"
                    : "default"
              }
            >
              {fulfillmentStatusLabel[card.fulfillmentStatus] ??
                card.fulfillmentStatus}
            </Chip>
            <span className="text-[11px] text-muted-foreground">
              {formatDateTime(card.createdAt)}
            </span>
          </div>
        </CardHeader>

        <Card.Content className="space-y-3 pb-2 pt-0">
          {/* 药品列表 */}
          <div>
            <span className="text-xs font-medium text-foreground/70">
              药品清单
            </span>
            <div className="mt-1 space-y-2">
              {card.medications.map((med, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-divider px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{med.name}</span>
                    <span className="text-sm font-medium text-foreground">
                      ¥{med.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>规格：{med.spec}</span>
                    <span>用量：{med.dosage}</span>
                    <span>数量：{med.quantity}</span>
                    <span>天数：{med.days}天</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 总价 */}
          <div className="flex items-center justify-end gap-1 text-sm">
            <span className="text-muted-foreground">合计：</span>
            <span className="font-semibold text-foreground">
              ¥
              {card.medications
                .reduce((sum, m) => sum + m.price * m.quantity, 0)
                .toFixed(2)}
            </span>
          </div>

          {/* 已选方式 */}
          {card.selectedMode ? (
            <div className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-sm">
              {card.selectedMode === "pickup" ? (
                <Package className="size-4 text-primary" />
              ) : (
                <Truck className="size-4 text-primary" />
              )}
              <span>
                已选择方式：
                <span className="font-medium">
                  {modeLabels[card.selectedMode] ?? card.selectedMode}
                </span>
              </span>
              {card.fulfillmentStatus === "completed" && card.handledAt ? (
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDateTime(card.handledAt)}
                </span>
              ) : null}
            </div>
          ) : null}
        </Card.Content>

        {!isHandled ? (
          <CardFooter className="flex gap-2 pt-0">
            {card.availableModes.includes("pickup") ? (
              <Button
                size="sm"
                variant="primary"
                isDisabled={isLocked}
                onPress={() =>
                  onAction?.({
                    type: "choose_fulfillment",
                    cardId: card.id,
                    mode: "pickup",
                  })
                }
              >
                <Package className="size-3.5" />
                自取
              </Button>
            ) : null}
            {card.availableModes.includes("delivery") ? (
              <Button
                size="sm"
                variant="secondary"
                isDisabled={isLocked}
                onPress={() =>
                  onAction?.({
                    type: "choose_fulfillment",
                    cardId: card.id,
                    mode: "delivery",
                  })
                }
              >
                <Truck className="size-3.5" />
                配送
              </Button>
            ) : null}
          </CardFooter>
        ) : null}
      </Card>
    )
  },
)
