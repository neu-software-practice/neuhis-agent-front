import { useCallback, useState } from "react"
import { Button, Drawer } from "@heroui/react"
import { PauseCircle } from "lucide-react"

import { useIsDesktop } from "@/lib/use-is-desktop"
import type { ExitConsequence } from "@/features/workbench/hooks/useExitSettlement"

type ExitStep = "choose" | "confirmExit"

interface ExitVisitSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consequence: ExitConsequence
  onConfirm: () => void
  onSuspend: () => void
}

/**
 * 退出问诊 Sheet（两步交互）。
 *
 * Step 1「选择意图」：暂离问诊（suspend，可恢复）或结束问诊（进入退出结算确认）。
 * Step 2「确认退出」：展示退出后果文案，确认后永久退出。
 *
 * - 暂离：调用 onSuspend，会话保留为 suspended 状态，可从历史列表恢复。
 * - 确认退出：调用 onConfirm，会话标记为 exited 不可逆。
 * - 关闭 Sheet 时自动重置回 Step 1。
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
  const [step, setStep] = useState<ExitStep>("choose")

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen)
      if (!nextOpen) {
        // 关闭时重置到初始步骤
        setStep("choose")
      }
    },
    [onOpenChange],
  )

  const handleSuspend = useCallback(() => {
    onSuspend()
    handleOpenChange(false)
  }, [onSuspend, handleOpenChange])

  const handleConfirm = useCallback(() => {
    onConfirm()
    handleOpenChange(false)
  }, [onConfirm, handleOpenChange])


  return (
    <Drawer>
      <Drawer.Backdrop isOpen={open} onOpenChange={handleOpenChange}>
        <Drawer.Content placement={isDesktop ? "right" : "bottom"}>
          <Drawer.Dialog
            aria-label="退出问诊"
            className="bg-background text-foreground shadow-xl"
          >
            {!isDesktop ? <Drawer.Handle /> : null}
            <Drawer.CloseTrigger />

            {step === "choose" ? (
              <>
                <Drawer.Header className="flex flex-col gap-1">
                  离开问诊
                </Drawer.Header>
                <Drawer.Body className="flex flex-col gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  <p className="text-sm text-muted-foreground">
                    你可以暂时离开稍后继续，或直接结束本次问诊。
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="secondary"
                      onPress={handleSuspend}
                      className="w-full"
                    >
                      <PauseCircle className="size-4" aria-hidden="true" />
                      暂离问诊
                    </Button>
                    <Button
                      variant="danger"
                      onPress={() => setStep("confirmExit")}
                      className="w-full"
                    >
                      结束问诊
                    </Button>
                  </div>
                </Drawer.Body>
              </>
            ) : (
              <>
                <Drawer.Header className="flex flex-col gap-1">
                  确认结束本次问诊？
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
                      onPress={() => setStep("choose")}
                      className="w-full"
                    >
                      返回
                    </Button>
                  </div>
                </Drawer.Body>
              </>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
