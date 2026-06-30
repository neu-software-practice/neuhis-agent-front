/**
 * 封装 HeroUI DatePicker，提供简洁 API。
 *
 * 值类型为 YYYY-MM-DD 字符串（与后端对齐），内部做 DateValue 转换。
 */
import type { DateValue } from "@internationalized/date"
import { parseDate, today, getLocalTimeZone } from "@internationalized/date"
import { Calendar, DateField, DatePicker as HeroDatePicker, Label } from "@heroui/react"

interface DatePickerProps {
  /** 字段标签 */
  label?: string
  /** 当前值，YYYY-MM-DD 格式字符串 */
  value?: string
  /** 值变更回调 */
  onChange?: (value: string) => void
  /** 最大可选日期，YYYY-MM-DD；默认今天 */
  maxDate?: string
  /** 最小可选日期，YYYY-MM-DD */
  minDate?: string
  /** 错误信息 */
  errorMessage?: string
  /** 是否必填 */
  isRequired?: boolean
  /** 是否无效状态 */
  isInvalid?: boolean
  /** aria-label（无 label 时使用） */
  "aria-label"?: string
  /** 额外 className */
  className?: string
}

export function DatePicker({
  label,
  value,
  onChange,
  maxDate,
  minDate,
  errorMessage,
  isRequired,
  isInvalid,
  "aria-label": ariaLabel,
  className = "w-full",
}: DatePickerProps) {
  const dateValue: DateValue | null = value ? parseDate(value) : null
  const maxValue = maxDate ? parseDate(maxDate) : today(getLocalTimeZone())
  const minValue = minDate ? parseDate(minDate) : undefined

  function handleChange(val: DateValue | null) {
    onChange?.(val ? val.toString() : "")
  }

  return (
    <HeroDatePicker
      aria-label={ariaLabel}
      className={className}
      isInvalid={isInvalid}
      isRequired={isRequired}
      maxValue={maxValue}
      minValue={minValue}
      value={dateValue}
      onChange={handleChange}
    >
      {label && <Label>{label}</Label>}
      <DateField.Group fullWidth>
        <DateField.Input>
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <HeroDatePicker.Trigger>
            <HeroDatePicker.TriggerIndicator />
          </HeroDatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <HeroDatePicker.Popover>
        <Calendar aria-label={label || ariaLabel || "选择日期"}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>
              {(date) => <Calendar.Cell date={date} />}
            </Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid>
            <Calendar.YearPickerGridBody>
              {({ year }) => <Calendar.YearPickerCell year={year} />}
            </Calendar.YearPickerGridBody>
          </Calendar.YearPickerGrid>
        </Calendar>
      </HeroDatePicker.Popover>
      {errorMessage && (
        <p className="mt-1 text-xs text-danger">{errorMessage}</p>
      )}
    </HeroDatePicker>
  )
}
