import { useCallback } from "react"
import { Button, Drawer } from "@heroui/react"

import { useIsDesktop } from "@/lib/use-is-desktop"
import type { ExitConsequence } from "@/features/workbench/hooks/useExitSettlement"

interface ExitVisitSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consequence: ExitConsequence
  onConfirm: () => void
  onSuspend: () => void
}

/**
 * 退出问诊 Sheet。
 *
 * 点击 X 后弹出，提供三个动作（从上到下）：
 * 1. 结束问诊（红色/danger）— 永久退出，不可恢复。
 * 2. 暂离问诊（橙色/warning）— 挂起会话，可从历史列表恢复。
 * 3. 返回问诊（灰底黑字/flat）— 关闭 Sheet，继续当前问诊。
 *
 * 本组件不调 transport / API、不直接 send，只通过 props / 回调通信。
 */
export function ExitVisitSheet({
  open,
  onOpenChange,
  consequence,
  onConfirm,
  onSuspend,
}: ExitVisitSheetProps) {
  const isDesktop = useIsDesktop()

  const handleSuspend = useCallback(() => {
    onSuspend()
    onOpenChange(false)
  }, [onSuspend, onOpenChange])

  const handleConfirm = useCallback(() => {
    onConfirm()
    onOpenChange(false)
  }, [onConfirm, onOpenChange])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Drawer>
      <Drawer.Backdrop isOpen={open} onOpenChange={onOpenChange}>
        <Drawer.Content placement={isDesktop ? "right" : "bottom"}>
          <Drawer.Dialog
            aria-label="退出问诊"
            className="bg-background text-foreground shadow-xl"
          >
            {!isDesktop ? <Drawer.Handle /> : null}
            <Drawer.CloseTrigger />
            <Drawer.Header className="flex flex-col gap-1">
              离开问诊
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <p>{consequence.text}</p>
                <p>暂离问诊不会结算，可随时回来继续。</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="danger"
                  onPress={handleConfirm}
                  className="w-full"
                >
                  结束问诊
                </Button>
                <Button
                  variant="secondary"
                  onPress={handleSuspend}
                  className="w-full bg-warning text-warning-foreground hover:bg-warning/90"
                >
                  暂离问诊
                </Button>
                <Button
                  variant="ghost"
                  onPress={handleCancel}
                  className="w-full text-foreground"
                >
                  返回问诊
                </Button>
              </div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
