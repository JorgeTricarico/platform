/**
 * ConfirmDialog — Accessible confirmation modal.
 *
 * Replaces window.confirm() with a styled, accessible dialog.
 * Supports async onConfirm with built-in loading state.
 *
 * Two usage patterns:
 *
 * 1. Imperative (with useConfirm hook):
 *    const { confirm, confirmProps } = useConfirm()
 *    const ok = await confirm({ title: '...', message: '...' })
 *    <ConfirmDialog {...confirmProps} />
 *
 * 2. Controlled (direct props):
 *    <ConfirmDialog
 *      isOpen={open}
 *      title="Eliminar"
 *      message="¿Estás seguro?"
 *      variant="danger"
 *      onConfirm={handleDelete}
 *      onCancel={() => setOpen(false)}
 *    />
 */
import * as React from 'react'
import { AlertTriangle, Info, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './Dialog.js'
import { Button } from './Button.js'
import { cn } from '../lib/utils.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info'

export interface ConfirmDialogProps {
  /** Controls dialog visibility */
  isOpen: boolean
  /** Dialog title */
  title: string
  /** Body message — plain string or any React node */
  message: React.ReactNode
  /** Label for the confirm button. Default: 'Confirmar' */
  confirmText?: string
  /** Label for the cancel button. Default: 'Cancelar' */
  cancelText?: string
  /** Visual variant affecting icon and confirm button color. Default: 'info' */
  variant?: ConfirmDialogVariant
  /** Called when user clicks the confirm button. May be async. */
  onConfirm: () => void | Promise<void>
  /** Called when user cancels (button click or Escape key) */
  onCancel: () => void
  /** Override loading state manually (merged with async onConfirm detection) */
  loading?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VARIANT_CONFIG: Record<
  ConfirmDialogVariant,
  {
    icon: React.ElementType
    iconClass: string
    buttonVariant: 'default' | 'destructive'
  }
> = {
  danger: {
    icon: AlertCircle,
    iconClass: 'text-destructive',
    buttonVariant: 'destructive',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    buttonVariant: 'default',
  },
  info: {
    icon: Info,
    iconClass: 'text-primary',
    buttonVariant: 'default',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'info',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const [pending, setPending] = React.useState(false)

  const { icon: Icon, iconClass, buttonVariant } = VARIANT_CONFIG[variant]

  const isLoading = loading || pending

  const handleConfirm = async () => {
    if (isLoading) return
    setPending(true)
    try {
      await onConfirm()
    } finally {
      setPending(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      onCancel()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent hideCloseButton className="max-w-sm">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                variant === 'danger' && 'bg-destructive/10',
                variant === 'warning' && 'bg-amber-500/10',
                variant === 'info' && 'bg-primary/10',
              )}
              aria-hidden
            >
              <Icon className={cn('h-5 w-5', iconClass)} />
            </div>
            <div className="space-y-1 min-w-0">
              <DialogTitle className="text-base leading-snug">{title}</DialogTitle>
              {message && (
                <DialogDescription className="text-sm leading-relaxed">
                  {message}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={handleConfirm}
            loading={isLoading}
            className="flex-1 sm:flex-none"
            autoFocus
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Backwards-compatible export for code using the original prop names
// ---------------------------------------------------------------------------

/**
 * @deprecated Use ConfirmDialog with isOpen/message/onCancel instead.
 * This wrapper preserves the old open/description/onOpenChange interface.
 */
export function LegacyConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant: legacyVariant = 'default',
  loading,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
  onConfirm: () => void | Promise<void>
}) {
  return (
    <ConfirmDialog
      isOpen={open}
      title={title}
      message={description}
      confirmText={confirmLabel}
      cancelText={cancelLabel}
      variant={legacyVariant === 'destructive' ? 'danger' : 'info'}
      loading={loading}
      onConfirm={onConfirm}
      onCancel={() => onOpenChange(false)}
    />
  )
}
