"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type ComboboxOption = {
  value: string
  label: string
}

type ComboboxProps = {
  options: ComboboxOption[]
  value?: string | null
  defaultValue?: string | null
  onChange?: (value: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  buttonClassName?: string
  popoverClassName?: string
  listClassName?: string
  disabled?: boolean
}

export default function Combobox({
  options,
  value: valueProp,
  defaultValue = null,
  onChange,
  searchPlaceholder = "Tìm kiếm...",
  emptyText = "Không có kết quả.",
  buttonClassName,
  popoverClassName,
  listClassName,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const isControlled = valueProp !== undefined
  const [internalValue, setInternalValue] = React.useState<string | null>(defaultValue)
  const selected = (isControlled ? valueProp : internalValue) ?? null

  const selectedLabel = React.useMemo(() => {
    if (!selected) return null
    return options.find((o) => o.value === selected)?.label ?? null
  }, [options, selected])

  function handleSelect(next: string) {
    const nextVal = next === selected ? null : next
    if (!isControlled) setInternalValue(nextVal)
    onChange?.(nextVal)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between font-normal", buttonClassName)}
        >
          {selectedLabel ?? "Chọn..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", popoverClassName)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList className={listClassName}>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                >
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      selected === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
