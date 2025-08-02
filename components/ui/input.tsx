import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, prefix, suffix, ...props }, ref) => {
  return (
    <div className={cn("relative", prefix && "input-with-icon", suffix && "input-with-icon")}>
      {prefix && <span className="input-prefix">{prefix}</span>}
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          prefix && "pl-10", // Adjust padding if prefix exists
          suffix && "pr-10", // Adjust padding if suffix exists
          className,
        )}
        ref={ref}
        {...props}
      />
      {suffix && <span className="input-suffix">{suffix}</span>}
    </div>
  )
})
Input.displayName = "Input"

export { Input }
