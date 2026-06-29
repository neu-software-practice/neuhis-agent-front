import { useCallback } from "react"
import { Button, Drawer } from "@heroui/react"

import { useIsDesktop } from "@/lib/use-is-desktop"
import type { ExitConsequence } from "@/features/workbench/hooks/useExitSettlement"

interface ExitVisitSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consequence: ExitConsequence
  onConfirm: () => void
  onCancel?: () => void
}

/**
 * 退出问诊确认 Sheet。
 *
 * 在非终止态下，用户可通过此 Drawer 退出问诊。展示从时间线派生的
 * 动态后果文案（无费用 / 可退 / 已执行不可退 / 已取药），并提供
 * 确认 / 取消两个动作。
 *
 * - 确认：调用 onConfirm（Wave 3 接线为 exitVisit + EXIT_REQUESTED/EXIT_CONFIRMED）。
 * - 取消：关闭 Sheet，不改变时间线。
 *
 * 本组件不调 transport / API、不直接 send，只通过 props / 回调通信。
 * 主动作（退出）与次动作（取消）通过 variant 与文案双重区分，不只靠颜色。
 */
export function ExitVisitSheet({
  open,
  onOpenChange,
  consequence,
  onConfirm,
  onCancel,
}: ExitVisitSheetProps) {
  const isDesktop = useIsDesktop()

  const handleConfirm = useCallback(() => {
    onConfirm()
    onOpenChange(false)
  }, [onConfirm, onOpenChange])

  const handleCancel = useCallback(() => {
    onCancel?.()
    onOpenChange(false)
  }, [onCancel, onOpenChange])

  return (
    <Drawer>
      <Drawer.Backdrop isOpen={open} onOpenChange={onOpenChange}>
        <Drawer.Content placement={isDesktop ? "right" : "bottom"}>
          <Drawer.Dialog
            aria-label="退出问诊确认"
            className="bg-background text-foreground shadow-xl"
          >
            {!isDesktop ? <Drawer.Handle /> : null}
            <Drawer.CloseTrigger />
            <Drawer.Header className="flex flex-col gap-1">
              确认退出本次问诊？
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {consequence.text}
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="danger"
                  onPress={handleConfirm}
                  className="w-full"
                >
                  确认退出
                </Button>
                <Button
                  variant="secondary"
                  onPress={handleCancel}
                  className="w-full"
                >
                  继续问诊
                </Button>
              </div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
