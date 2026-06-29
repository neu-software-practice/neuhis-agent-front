import { Button, Modal } from "@heroui/react"
import { PauseCircle } from "lucide-react"

import { cn } from "@/lib/utils"

interface SuspendOverlayProps {
  /** 是否展示空闲挂起弹层。 */
  open: boolean
  /** 「继续问诊」回调：按复诊流程创建新 session 并跳转。 */
  onContinue: () => void
  className?: string
}

/**
 * 会话空闲挂起弹层。
 *
 * 长时间未操作后自动挂起，以居中 Modal 提示患者会话已暂停。挂起非终态：
 * 患者点「继续问诊」即按复诊流程继续（也可关闭弹层后直接在输入框输入继续）。
 * 文案使用患者语言，不暴露内部状态名。无障碍：标题 + 单一明确继续路径。
 *
 * 不调用 transport / API / 状态机，只通过 `open` 与 `onContinue` 通信；
 * 实际复诊推进由调用方接线。
 */
export function SuspendOverlay({ open, onContinue, className }: SuspendOverlayProps) {
  return (
    <Modal>
      <Modal.Backdrop isOpen={open} isDismissable={false}>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog
            role="alertdialog"
            className={cn("mx-auto w-full max-w-[480px]", className)}
          >
            <Modal.Header className="flex items-center gap-2">
              <Modal.Icon>
                <PauseCircle className="size-5 text-warning" aria-hidden="true" />
              </Modal.Icon>
              <Modal.Heading>会话已暂停</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>因长时间未操作，本次问诊已自动暂停。</p>
              <p>需要的话可以继续问诊，我们会基于本次记录帮你接着看。</p>
            </Modal.Body>
            <Modal.Footer className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button variant="primary" onPress={onContinue} className="w-full">
                继续问诊
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
