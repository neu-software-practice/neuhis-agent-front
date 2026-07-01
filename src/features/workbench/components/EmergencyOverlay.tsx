import { AlertTriangle } from "lucide-react"
import { Button, Modal } from "@heroui/react"

/**
 * 急症打断 Overlay（最高优先级全局覆盖态）。
 *
 * HTTP 模式约束：
 * - 后端一旦命中急症（emergency 判定），会**直接关闭当前会话**并转入终止态；
 *   「前往急诊」即对此终止结果的确认，不存在后端层面的撤销。
 * - 「误报，继续问诊」的恢复语义**仅为前端 mock**：真实后端不提供急症误报回滚，
 *   该路径只在 mock transport 下还原会话以便联调，生产环境行为以后端为准。
 *
 * 边界约束（与其他叶子组件一致）：
 * - 不调用 transport/API，不 import mock fixtures，不直接 `machine.send`。
 * - 仅通过 props 回调与外界通信；显隐由调用方依据机器状态派生后传入 `open`。
 */
interface EmergencyOverlayProps {
  /** 是否展示。由调用方依据机器 `emergencyPending` 态派生。 */
  open: boolean
  /** 触发来源的补充说明（可选）。由调用方提供患者可读文案，不应含内部状态名。 */
  source?: string
  /** 主动作：确认前往急诊（确认后端急症终止结果）。 */
  onConfirmEmergency: () => void
  /** 次动作：判定为误报，继续问诊（前端 mock 恢复语义）。 */
  onDismiss: () => void
  className?: string
}

/**
 * 急症打断 Overlay。
 *
 * 行为：遮罩展示，提供两个互斥动作——
 * - 「前往急诊」（主，filled）→ `onConfirmEmergency`
 * - 「误报，继续问诊」（次，outline）→ `onDismiss`
 *
 * 主/次动作通过填充 vs 描边、尺寸层级与文案区分，不只依赖颜色。
 * 急症态不可由点击遮罩随意关闭；ESC 等隐式关闭走安全路径（继续问诊）。
 */
export function EmergencyOverlay({
  open,
  source,
  onConfirmEmergency,
  onDismiss,
  className,
}: EmergencyOverlayProps) {
  // 任何非「确认前往急诊」的关闭意图（ESC 等）都按安全路径处理：继续问诊。
  const handleOpenChange = (next: boolean) => {
    console.log("[emergency] Modal.Backdrop onOpenChange called, next:", next)
    if (!next) {
      console.log("[emergency] Modal.Backdrop closing, calling onDismiss")
      onDismiss()
    }
  }

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={open}
        onOpenChange={handleOpenChange}
        isDismissable={false}
      >
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog className={className}>
            <Modal.Header className="flex items-center gap-3">
              <Modal.Icon className="text-danger">
                <AlertTriangle aria-hidden className="size-6" />
              </Modal.Icon>
              <Modal.Heading className="text-lg font-semibold">
                检测到紧急情况
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-2">
              <p className="text-foreground">
                根据您描述的情况，建议立即前往急诊就医。请优先保障您的安全。
              </p>
              {source ? (
                <p className="text-sm text-muted-foreground">
                  触发原因：{source}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer className="flex flex-col gap-2">
              <Button
                variant="primary"
                size="lg"
                onPress={() => {
                  console.log("[emergency] '前往急诊' button pressed, calling onConfirmEmergency")
                  onConfirmEmergency()
                }}
                className="w-full"
              >
                前往急诊
              </Button>
              <Button
                variant="outline"
                size="md"
                onPress={() => {
                  console.log("[emergency] '误报，继续问诊' button pressed, calling onDismiss")
                  onDismiss()
                }}
                className="w-full"
              >
                误报，继续问诊
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
