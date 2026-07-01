import { useCallback } from "react"
import { Button, Drawer } from "@heroui/react"

import { useIsDesktop } from "@/lib/use-is-desktop"

interface CompletedExitSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigateHome: () => void
  /** 弹窗标题，默认 "问诊已完成"。 */
  title?: string
  /** 弹窗描述，默认已完成问诊的文案。 */
  description?: string
}

/**
 * 已完成/已终止问诊的退出 Sheet。
 *
 * 与 ExitVisitSheet 不同：已结束的会话无需「结束/暂离」等状态转移操作，
 * 仅提供返回首页的导航按钮，不触发任何状态机事件或 API 调用。
 */
export function CompletedExitSheet({
  open,
  onOpenChange,
  onNavigateHome,
  title = "问诊已完成",
  description = "本次问诊已正常完成，您可以返回首页查看历史记录或发起新的问诊。",
}: CompletedExitSheetProps) {
  const isDesktop = useIsDesktop()

  const handleNavigateHome = useCallback(() => {
    onNavigateHome()
    onOpenChange(false)
  }, [onNavigateHome, onOpenChange])

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
              {title}
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <p>{description}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  onPress={handleNavigateHome}
                  className="w-full"
                >
                  返回首页
                </Button>
                <Button
                  variant="ghost"
                  onPress={handleCancel}
                  className="w-full text-foreground"
                >
                  留在当前页
                </Button>
              </div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
