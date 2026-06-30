import { memo } from "react"
import { Button, Card, CardFooter, CardHeader, Chip, Separator } from "@heroui/react"
import type { ChipProps } from "@heroui/react"
import {
  Banknote,
  CheckCircle,
  CircleX,
  CreditCard,
  RefreshCw,
} from "lucide-react"

import type { FlowCard, FlowCardAction } from "@/features/workbench/api"
import { formatDateTime } from "@/lib/time"

interface PaymentCardProps {
  card: FlowCard & { kind: "payment" }
  disabled?: boolean
  onAction?: (action: FlowCardAction) => void
}

const purposeLabel: Record<string, string> = {
  lab: "检验费",
  medication: "药品费",
}

const paymentStatusColor: Record<string, ChipProps["color"]> = {
  unpaid: "warning",
  pending: "accent",
  paid: "success",
  failed: "danger",
  refunded: "default",
}

const paymentStatusLabel: Record<string, string> = {
  unpaid: "未支付",
  pending: "支付中",
  paid: "已支付",
  failed: "支付失败",
  refunded: "已退款",
}

/**
 * 缴费卡片。
 *
 * 展示费用明细、总金额、医保报销和个人自付金额。
 * - pending: 显示确认支付和暂不缴费按钮
 * - paid: 显示已支付状态
 * - failed: 显示失败状态和重试按钮
 */
export const PaymentCard = memo(function PaymentCard({
  card,
  disabled,
  onAction,
}: PaymentCardProps) {
  const isPaid = card.paymentStatus === "paid"
  const isFailed = card.paymentStatus === "failed"
  const isPending = card.status === "pending" && !isPaid && !isFailed
  const isLocked = disabled || card.status !== "pending"

  return (
    <Card className="w-full border border-divider bg-warning-foreground">
      <CardHeader className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-primary" />
          <span className="text-sm font-medium">
            {card.title}
            <span className="ml-1 text-xs text-muted-foreground">
              （{purposeLabel[card.purpose] ?? card.purpose}）
            </span>
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {formatDateTime(card.createdAt)}
        </span>
      </CardHeader>

      <Card.Content className="space-y-3 pb-2 pt-0">
        {/* 缴费项目 */}
        <div>
          <span className="text-xs font-medium text-foreground/70">缴费项目</span>
          <ul className="mt-1 space-y-1">
            {card.items.map((item, idx) => (
              <li key={idx} className="flex items-center justify-between text-sm">
                <span className="text-foreground/80">
                  {item.name}
                  {item.quantity != null ? ` ×${item.quantity}` : ""}
                </span>
                <span className="font-medium">¥{item.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* 金额汇总 */}
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">合计</span>
            <span className="font-medium">¥{card.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">医保报销</span>
            <span className="font-medium text-success">
              -¥{card.insuranceAmount.toFixed(2)}
            </span>
          </div>
          <Separator className="my-1" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">个人自付</span>
            <span className="text-base font-semibold text-foreground">
              ¥{card.selfPayAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 支付状态 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">支付状态：</span>
          <Chip
            size="sm"
            variant="tertiary"
            color={paymentStatusColor[card.paymentStatus] ?? "default"}
          >
            {paymentStatusLabel[card.paymentStatus] ?? card.paymentStatus}
          </Chip>
        </div>

        {/* 已支付状态 */}
        {isPaid && card.handledAt ? (
          <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm">
            <CheckCircle className="size-4 text-success" />
            <span className="text-success">支付成功</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {formatDateTime(card.handledAt)}
            </span>
          </div>
        ) : null}

        {/* 支付失败 */}
        {isFailed ? (
          <div className="flex items-center gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm">
            <CircleX className="size-4 text-danger" />
            <span className="text-danger">支付失败</span>
          </div>
        ) : null}
      </Card.Content>

      {isPending ? (
        <CardFooter className="flex gap-2 pt-0">
          <Button
            size="sm"
            variant="primary"
            isDisabled={isLocked}
            onPress={() =>
              onAction?.({
                type: "submit_payment",
                cardId: card.id,
                paymentMethodId: "default",
              })
            }
          >
            <Banknote className="size-3.5" />
            确认支付
          </Button>
          <Button
            size="sm"
            variant="outline"
            isDisabled={isLocked}
            onPress={() => onAction?.({ type: "defer_payment", cardId: card.id })}
          >
            暂不缴费
          </Button>
        </CardFooter>
      ) : isFailed ? (
        <CardFooter className="pt-0">
          <Button
            size="sm"
            variant="primary"
            isDisabled={disabled}
            onPress={() =>
              onAction?.({
                type: "submit_payment",
                cardId: card.id,
                paymentMethodId: "default",
              })
            }
          >
            <RefreshCw className="size-3.5" />
            重新支付
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
})
