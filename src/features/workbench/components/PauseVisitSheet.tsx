import { useCallback } from "react"
import { Button, Drawer } from "@heroui/react"

import { useIsDesktop } from "@/lib/use-is-desktop"

interface PauseVisitSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel?: () => void
}

/**
 * 暂停计时确认 Sheet。
 *
 * 用户点击"暂离"按钮后，通过此 Drawer 确认是否暂停问诊计时。
 * 复用与 ExitVisitSheet 相同的 Drawer 组件体系。
 *
 * - 确认：调用 onConfirm（接线为 pauseVisit），关闭 Sheet。
 * - 取消：关闭 Sheet，不影响时间线与计时。
 *
 * 本组件不调 transport / API、不直接 send，只通过 props / 回调通信。
 */
export function PauseVisitSheet({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: PauseVisitSheetProps) {
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
            aria-label="暂停计时确认"
            className="bg-background text-foreground shadow-xl"
          >
            {!isDesktop ? <Drawer.Handle /> : null}
            <Drawer.CloseTrigger />
            <Drawer.Header className="flex flex-col gap-1">
              暂停计时？
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                暂停后计时将停止，可稍后继续问诊
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="secondary"
                  onPress={handleConfirm}
                  className="w-full bg-amber-500 text-white hover:bg-amber-600"
                >
                  暂停计时
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
