import { memo } from "react"
import { Button, Card, Chip } from "@heroui/react"
import { CheckCircle2, Home, MapPin, Pencil, Phone, Star, Trash2 } from "lucide-react"

import type { Address } from "@/features/patient/api"
import { cn } from "@/lib/utils"

interface AddressCardProps {
  address: Address
  onEdit?: (address: Address) => void
  onDelete?: (address: Address) => void
  onSetDefault?: (address: Address) => void
  selectable?: boolean
  selected?: boolean
  onSelect?: (address: Address) => void
  className?: string
}

function AddressCardContent({
  address,
  selectable,
  selected,
}: Pick<AddressCardProps, "address" | "selectable" | "selected">) {
  const fullAddress = `${address.province}${address.city}${address.district}${address.detail}`

  return (
    <>
      <Card.Header className="flex items-start justify-between gap-3 pb-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {address.name}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="size-3" />
              {address.phone}
            </span>
            {address.tag ? (
              <Chip size="sm" variant="soft" color="default">
                {address.tag}
              </Chip>
            ) : null}
            {address.isDefault ? (
              <Chip size="sm" variant="soft" color="success">
                默认
              </Chip>
            ) : null}
          </div>
        </div>
        {selectable ? (
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background",
            )}
            aria-hidden="true"
          >
            {selected ? <CheckCircle2 className="size-4" /> : null}
          </span>
        ) : null}
      </Card.Header>

      <Card.Content className="pt-0">
        <div className="flex gap-2 text-sm text-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="leading-6">{fullAddress}</span>
        </div>
      </Card.Content>
    </>
  )
}

export const AddressCard = memo(function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  selectable = false,
  selected = false,
  onSelect,
  className,
}: AddressCardProps) {
  const cardClassName = cn(
    "w-full border border-divider bg-card shadow-none",
    selectable && "transition-colors",
    selectable && selected && "border-primary bg-primary/5",
    className,
  )

  if (selectable) {
    return (
      <button
        type="button"
        className="w-full text-left"
        onClick={() => onSelect?.(address)}
        aria-pressed={selected}
      >
        <Card className={cardClassName}>
          <AddressCardContent
            address={address}
            selectable={selectable}
            selected={selected}
          />
        </Card>
      </button>
    )
  }

  return (
    <Card className={cardClassName}>
      <AddressCardContent address={address} />
      <Card.Footer className="flex flex-wrap justify-between gap-2 pt-1">
        <Button
          size="sm"
          variant="ghost"
          onPress={() => onSetDefault?.(address)}
          isDisabled={address.isDefault}
        >
          {address.isDefault ? (
            <Home className="size-3.5" />
          ) : (
            <Star className="size-3.5" />
          )}
          {address.isDefault ? "默认地址" : "设为默认"}
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onPress={() => onEdit?.(address)}>
            <Pencil className="size-3.5" />
            编辑
          </Button>
          <Button size="sm" variant="danger" onPress={() => onDelete?.(address)}>
            <Trash2 className="size-3.5" />
            删除
          </Button>
        </div>
      </Card.Footer>
    </Card>
  )
})
