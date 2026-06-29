import { Button, Modal } from "@heroui/react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"

interface TimeoutOverlayProps {
  /** 是否展示到期阻断态。 */
  open: boolean
  /** 确认回调（Wave 3 接线为 VISIT_TIMEOUT → terminated(timeout)）。 */
  onConfirm: () => void
  className?: string
}

/**
 * 问诊超时到期阻断弹层。
 *
 * 到期后以居中 Modal 阻断后续操作，患者只能确认结束本次问诊。
 * 文案使用患者语言，不暴露内部状态名。无障碍：标题 + 单一明确确认路径。
 *
 * 不调用 transport / API / 状态机，只通过 `open` 与 `onConfirm` 通信；
 * 实际状态推进由调用方在 Wave 3 接线。
 */
export function TimeoutOverlay({ open, onConfirm, className }: TimeoutOverlayProps) {
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
                <Clock className="size-5 text-warning" aria-hidden="true" />
              </Modal.Icon>
              <Modal.Heading>本次问诊已超时</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>本次问诊时间已结束，无法继续与 AI 医生对话或操作。</p>
              <p>如仍有不适，请重新发起问诊或前往人工门诊。</p>
            </Modal.Body>
            <Modal.Footer className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button variant="primary" onPress={onConfirm} className="w-full">
                我知道了，结束问诊
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
