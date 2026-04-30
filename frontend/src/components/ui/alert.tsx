import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckCircle2, Info, Triangle, AlertCircle } from "lucide-react"

interface AlertProps {
  variant?: 'default' | 'destructive' | 'warning' | 'info' | 'success'
  title?: string
  children: React.ReactNode
  className?: string
}

const Alert = React.forwardRef<
  HTMLDivElement,
  AlertProps
>(({ className, variant = 'default', title, children, ...props }, ref) => {
  const variants = {
    default: {
      bg: 'bg-slate-100 dark:bg-slate-800',
      border: 'border-slate-200 dark:border-slate-700',
      text: 'text-slate-700 dark:text-slate-200',
      icon: Info
    },
    destructive: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      icon: AlertCircle
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      icon: Triangle
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300',
      icon: CheckCircle2
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      icon: Info
    }
  }

  const config = variants[variant]
  const Icon = config.icon

  return (
    <div
      ref={ref}
      className={cn(
        'relative rounded-xl border p-4',
        config.bg,
        config.border,
        className
      )}
      {...props}
    >
      <div className="flex gap-3">
        <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.text)} />
        <div className="flex-1">
          {title && (
            <h4 className={cn("text-sm font-semibold mb-1", config.text)}>
              {title}
            </h4>
          )}
          <div className={cn("text-sm", config.text)}>{children}</div>
        </div>
      </div>
    </div>
  )
})
Alert.displayName = 'Alert'

export { Alert }