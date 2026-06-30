/**
 * 行政区选择器 —— 省/市/区三级级联下拉框。
 *
 * 基于 china-area-data + HeroUI v3 Select/ListBox，
 * 支持直辖市自动跳过"市辖区"层级、反向查找、回填编辑。
 */
import { useMemo } from "react"
import {
  Label,
  ListBox,
  Select,
} from "@heroui/react"
import areaData from "china-area-data"

import { cn } from "@/lib/utils"

// ── 类型 ────────────────────────────────────────────

export interface RegionValue {
  province: string
  city: string
  district: string
}

export interface RegionSelectorProps {
  value: RegionValue
  onChange: (value: RegionValue) => void
  isInvalid?: boolean | { province?: boolean; city?: boolean; district?: boolean }
  errorMessage?: { province?: string; city?: string; district?: string }
  isDisabled?: boolean
  className?: string
  /** 布局方向，默认 "row" 为 sm 以上三列 */
  layout?: "row" | "col"
}

// ── 内部选项 ────────────────────────────────────────

interface AreaOption {
  code: string
  name: string
}

/** 直辖市前两位（11=北京 12=天津 31=上海 50=重庆） */
const MUNICIPALITY_PREFIXES = ["11", "12", "31", "50"]

function isMunicipality(code: string) {
  return MUNICIPALITY_PREFIXES.some((p) => code.startsWith(p))
}

// ── 数据工具（模块级缓存，只构建一次）───────────────

function buildDataStructures() {
  const provinces: AreaOption[] = []
  /** provinceName → code */
  const provinceNameToCode = new Map<string, string>()
  /** provinceCode → city list */
  const provinceCities = new Map<string, AreaOption[]>()
  /** cityCode → cityName (跨省反向查找用) */
  const cityCodeToName = new Map<string, string>()
  /** cityCode → district list */
  const cityDistricts = new Map<string, AreaOption[]>()

  const provinceMap = areaData["86"]
  if (!provinceMap) return { provinces, provinceNameToCode, provinceCities, cityCodeToName, cityDistricts }

  for (const [pCode, pName] of Object.entries(provinceMap)) {
    provinces.push({ code: pCode, name: pName })
    provinceNameToCode.set(pName, pCode)

    const cityMap = areaData[pCode]
    if (!cityMap) continue

    const cities: AreaOption[] = []
    for (const [cCode, cName] of Object.entries(cityMap)) {
      cities.push({ code: cCode, name: cName })
      cityCodeToName.set(cCode, cName)

      const districtMap = areaData[cCode]
      if (districtMap) {
        const districts: AreaOption[] = []
        for (const [dCode, dName] of Object.entries(districtMap)) {
          districts.push({ code: dCode, name: dName })
        }
        if (districts.length > 0) {
          cityDistricts.set(cCode, districts)
        }
      }
    }
    provinceCities.set(pCode, cities)
  }

  return { provinces, provinceNameToCode, provinceCities, cityCodeToName, cityDistricts }
}

const DATA = buildDataStructures()

// ── 组件 ────────────────────────────────────────────

export function RegionSelector({
  value,
  onChange,
  isInvalid: isInvalidRaw,
  errorMessage: errorMsg,
  isDisabled = false,
  className,
  layout = "row",
}: RegionSelectorProps) {
  const { provinces, provinceNameToCode, provinceCities, cityDistricts } = DATA

  // ── 级联选项 ──────────────────────────────────

  const provinceCode = provinceNameToCode.get(value.province) ?? null

  const cities = useMemo<AreaOption[]>(() => {
    if (!provinceCode) return []
    return provinceCities.get(provinceCode) ?? []
  }, [provinceCode, provinceCities])

  const cityCode = useMemo<string | null>(() => {
    if (!value.city || cities.length === 0) return null
    return cities.find((c) => c.name === value.city)?.code ?? null
  }, [value.city, cities])

  const districts = useMemo<AreaOption[]>(() => {
    if (!cityCode) return []
    return cityDistricts.get(cityCode) ?? []
  }, [cityCode, cityDistricts])

  // ── 直辖市跳过逻辑 ────────────────────────────

  const municipality = provinceCode ? isMunicipality(provinceCode) : false
  const skipCityLevel =
    municipality && cities.length === 1 && cities[0].name === "市辖区"

  // ── 直辖市自动补全城市 ────────────────────────

  const effectiveCity = skipCityLevel
    ? cities[0].name // "市辖区"
    : value.city

  // ── 错误状态 ──────────────────────────────────

  const inv =
    typeof isInvalidRaw === "object"
      ? isInvalidRaw
      : { province: isInvalidRaw, city: isInvalidRaw, district: isInvalidRaw }

  // ── 事件处理 ──────────────────────────────────

  function handleProvinceChange(key: string) {
    // key = province name (我们用它作为 ListBox.Item id)
    const newCities = provinceCities.get(provinceNameToCode.get(key) ?? "") ?? []
    const munic = provinceNameToCode.get(key)
      ? isMunicipality(provinceNameToCode.get(key)!)
      : false
    const skip =
      munic && newCities.length === 1 && newCities[0].name === "市辖区"

    onChange({
      province: key,
      city: skip ? newCities[0].name : "",
      district: "",
    })
  }

  function handleCityChange(key: string) {
    onChange({ ...value, city: key, district: "" })
  }

  function handleDistrictChange(key: string) {
    onChange({ ...value, district: key })
  }

  // ── 渲染 ──────────────────────────────────────

  return (
    <div
      className={cn(
        "grid gap-4",
        layout === "row" ? "sm:grid-cols-3" : "grid-cols-1",
        className,
      )}
    >
      {/* 省份 */}
      <RegionSelect
        label="省份"
        placeholder="省份"
        items={provinces}
        selectedKey={value.province || null}
        onSelectionChange={(k) => handleProvinceChange(String(k))}
        isInvalid={inv.province}
        errorMessage={errorMsg?.province}
        isDisabled={isDisabled}
      />

      {/* 城市 */}
      {!skipCityLevel && (
        <RegionSelect
          label="城市"
          placeholder="城市"
          items={cities}
          selectedKey={effectiveCity || null}
          onSelectionChange={(k) => handleCityChange(String(k))}
          isInvalid={inv.city}
          errorMessage={errorMsg?.city}
          isDisabled={isDisabled || cities.length === 0}
        />
      )}

      {/* 区县 */}
      <RegionSelect
        label="区县"
        placeholder={districts.length === 0 ? "暂无数据" : "区县"}
        items={districts}
        selectedKey={value.district || null}
        onSelectionChange={(k) => handleDistrictChange(String(k))}
        isInvalid={inv.district}
        errorMessage={errorMsg?.district}
        isDisabled={isDisabled || districts.length === 0}
      />
    </div>
  )
}

// ── 内部 Select 封装 ──────────────────────────────

interface RegionSelectProps {
  label: string
  placeholder: string
  items: AreaOption[]
  selectedKey: string | null
  onSelectionChange: (key: string) => void
  isInvalid?: boolean
  errorMessage?: string
  isDisabled?: boolean
}

function RegionSelect({
  label,
  placeholder,
  items,
  selectedKey,
  onSelectionChange,
  isInvalid,
  errorMessage,
  isDisabled,
}: RegionSelectProps) {
  return (
    <Select
      selectedKey={selectedKey}
      onSelectionChange={(key) => {
        if (key != null) onSelectionChange(String(key))
      }}
      placeholder={placeholder}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      isDisabled={isDisabled}
      className="w-full [&_[data-slot=select-trigger]]:bg-[#f3f3f3] [&_[data-placeholder=true]]:text-[#999] [&_[data-slot=select-popover]]:shadow-2xl [&_[data-slot=label]]:text-foreground"
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox items={items}>
          {(item) => (
            <ListBox.Item id={item.name} textValue={item.name}>
              {item.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
