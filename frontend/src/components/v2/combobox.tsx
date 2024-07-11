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

interface ComboboxProps {
    onSelectTicker: (ticker: string) => void;
  }

export function Combobox({onSelectTicker}: ComboboxProps){
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")
  const [tickers, setTickers] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const getAllTickers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`http://localhost:8000/api/v1/tickers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`)
      }
      const result = await response.json()
      if (result.tickers && Array.isArray(result.tickers)) {
        setTickers(result.tickers)
      } else {
        throw new Error("Invalid data format")
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Failed to fetch data. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    getAllTickers()
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[160px] h-[36px] justify-between rounded-lg"
        >
          {value
            ? tickers.find((ticker) => ticker === value)
            : "Select stock..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[160px] p-0">
        <Command>
          <CommandInput placeholder="Search ticker..." />
          <CommandEmpty>No ticker found.</CommandEmpty>
          <CommandGroup>
            <CommandList>
            {tickers.map((ticker) => (
              <CommandItem
                key={ticker}
                value={ticker}
                onSelect={(currentValue) => {
                  setValue(currentValue === value ? "" : currentValue)
                  setOpen(false)
                  onSelectTicker(currentValue)
                }}
                data-disabled={false}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === ticker ? "opacity-100" : "opacity-0"
                  )}
                />
                {ticker}
              </CommandItem>
            ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
