import { useCallback, useState } from "react"
import {
  Button,
  Drawer,
  TextArea,
} from "@heroui/react"

interface LockQuestionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardTitle?: string
  onSubmit: (content: string) => void
}

/**
 * 阻断疑问输入 Sheet。
 *
 * 在阻断状态下，用户可通过此 Drawer 提交疑问。
 * 使用 HeroUI Drawer 底部弹出。
 */
export function LockQuestionSheet({
  open,
  onOpenChange,
  cardTitle,
  onSubmit,
}: LockQuestionSheetProps) {
  const [content, setContent] = useState("")

  const handleSubmit = useCallback(() => {
    if (content.trim()) {
      onSubmit(content.trim())
      setContent("")
      onOpenChange(false)
    }
  }, [content, onSubmit, onOpenChange])

  const handleCancel = useCallback(() => {
    setContent("")
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Drawer>
      <Drawer.Backdrop isOpen={open} onOpenChange={onOpenChange}>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog>
            <Drawer.Header className="flex flex-col gap-1">
              关于 {cardTitle ?? "当前操作"} 的疑问
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <TextArea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请输入您的疑问..."
                rows={3}
              />
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onPress={handleCancel}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  onPress={handleSubmit}
                  isDisabled={!content.trim()}
                  className="flex-1"
                >
                  发送疑问
                </Button>
              </div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
