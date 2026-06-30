/**
 * Zod 全局中文错误映射。
 *
 * 替换 Zod 默认英文提示（如 "Too small: expected string to have >=1 characters"），
 * 改为亲民的本地化中文提示。通过 core.config() 在应用入口注入。
 *
 * 注意：API 请求体的校验错误会被 errors.ts 中的 toUiMessage 二次加工，
 * 这里的提示主要影响前端表单直接显示的 react-hook-form + zodResolver 场景。
 */
import { core } from "zod"
import type { ZodErrorMap, IssueData } from "zod"

const SIZABLE_LABELS: Record<string, { unit: string }> = {
  string: { unit: "个字符" },
  array: { unit: "项" },
  set: { unit: "项" },
  file: { unit: "字节" },
}

const FORMAT_LABELS: Record<string, string> = {
  email: "电子邮件地址",
  url: "网址",
  emoji: "表情符号",
  uuid: "UUID",
  uuidv4: "UUIDv4",
  uuidv6: "UUIDv6",
  nanoid: "nanoid",
  guid: "GUID",
  cuid: "cuid",
  cuid2: "cuid2",
  ulid: "ULID",
  xid: "XID",
  ksuid: "KSUID",
  datetime: "ISO 日期时间",
  date: "ISO 日期",
  time: "ISO 时间",
  duration: "ISO 时长",
  ipv4: "IPv4 地址",
  ipv6: "IPv6 地址",
  cidrv4: "IPv4 网段",
  cidrv6: "IPv6 网段",
  base64: "base64 编码",
  base64url: "base64url 编码",
  json_string: "JSON 字符串",
  e164: "E.164 号码",
  jwt: "JWT",
}

const TYPE_LABELS: Record<string, string> = {
  string: "文本",
  number: "数字",
  int: "整数",
  boolean: "布尔值",
  bigint: "大整数",
  symbol: "符号",
  undefined: "未定义",
  null: "空值",
  void: "空",
  date: "日期",
  array: "数组",
  object: "对象",
  file: "文件",
  nan: "数字",
  function: "函数",
}

const customErrorMap: ZodErrorMap = (issue: IssueData) => {
  switch (issue.code) {
    // ── 类型错误 ──────────────────────────────────
    case "invalid_type": {
      const expected = TYPE_LABELS[issue.expected] ?? issue.expected
      if (issue.expected === "nonoptional") {
        return { message: "此字段为必填项" }
      }
      return { message: `请输入${expected}` }
    }

    // ── 太小 ─────────────────────────────────────
    case "too_small": {
      const sizing = SIZABLE_LABELS[issue.origin]
      const min = (issue as core.$ZodIssueTooSmall).minimum

      if (sizing) {
        // string / array / set / file
        if (min === 1) {
          if (issue.origin === "string")
            return { message: "请填写此字段" }
          if (issue.origin === "file")
            return { message: "请上传文件" }
          return { message: `请至少选择 1 项` }
        }
        if (issue.origin === "string")
          return { message: `至少输入 ${min} 个字符` }
        return { message: `至少选择 ${min} 项` }
      }

      // number / int / bigint / date
      if (issue.origin === "date")
        return { message: `日期不能早于指定时间` }
      return { message: `最小值为 ${min}` }
    }

    // ── 太大 ─────────────────────────────────────
    case "too_big": {
      const sizing = SIZABLE_LABELS[issue.origin]
      const max = (issue as core.$ZodIssueTooBig).maximum

      if (sizing) {
        if (issue.origin === "string")
          return { message: `最多输入 ${max} 个字符` }
        return { message: `最多选择 ${max} 项` }
      }

      if (issue.origin === "date")
        return { message: `日期不能晚于指定时间` }
      return { message: `最大值为 ${max}` }
    }

    // ── 格式错误 ─────────────────────────────────
    case "invalid_format": {
      if (issue.format === "starts_with")
        return { message: `必须以 "${(issue as unknown as { prefix: string }).prefix}" 开头` }
      if (issue.format === "ends_with")
        return { message: `必须以 "${(issue as unknown as { suffix: string }).suffix}" 结尾` }
      if (issue.format === "includes")
        return { message: `必须包含 "${(issue as unknown as { includes: string }).includes}"` }
      if (issue.format === "regex")
        return { message: "格式不正确" }
      const label = FORMAT_LABELS[issue.format]
      return { message: `请输入有效的${label ?? issue.format}` }
    }

    // ── 非倍数 ───────────────────────────────────
    case "not_multiple_of":
      return { message: `必须是 ${issue.divisor} 的倍数` }

    // ── 未知键 ───────────────────────────────────
    case "unrecognized_keys":
      return { message: `包含未知字段：${(issue.keys as string[]).join("、")}` }

    // ── 无效键 ───────────────────────────────────
    case "invalid_key":
      return { message: "键值无效" }

    // ── 联合类型 ─────────────────────────────────
    case "invalid_union":
      return { message: "输入格式不正确" }

    // ── 集合元素 ─────────────────────────────────
    case "invalid_element":
      return { message: "其中包含无效值" }

    // ── 无效值 ───────────────────────────────────
    case "invalid_value":
      return { message: "取值不在允许范围内" }

    default:
      return { message: "输入无效" }
  }
}

/** 安装全局中文错误映射。在应用入口调用一次即可。 */
export function installZodErrorMap() {
  core.config({ localeError: customErrorMap })
}
