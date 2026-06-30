import { Switch, type SwitchRootProps } from "@heroui/react"

type SwitchFieldComponent = React.FC<SwitchRootProps> & {
  Content: typeof Switch.Content
  Control: typeof Switch.Control
  Thumb: typeof Switch.Thumb
  Icon: typeof Switch.Icon
}

/**
 * 品牌色 Switch。
 *
 * 解决 shadcn 覆盖 HeroUI --accent 变量导致 Switch 选中态异常的问题，
 * 将滑块改为品牌主色，轨道保持默认灰。
 */
export const SwitchField = (({ children, ...props }: SwitchRootProps) => {
  return (
    <Switch
      {...props}
      style={{
        "--accent-foreground": "var(--primary)",
        "--accent": "var(--primary-foreground)",
        "--switch-control-bg-checked": "var(--switch-control-bg)",
        ...props.style,
      } as unknown as React.CSSProperties}
    >
      {children}
    </Switch>
  )
}) as SwitchFieldComponent

SwitchField.Content = Switch.Content
SwitchField.Control = Switch.Control
SwitchField.Thumb = Switch.Thumb
SwitchField.Icon = Switch.Icon
