import { useState, useCallback, useRef } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  resolve: ((value: boolean) => void) | null
}

const INITIAL_STATE: ConfirmState = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  variant: 'info',
  resolve: null,
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides an imperative `confirm()` function that returns a Promise<boolean>.
 * Use alongside <ConfirmDialog> to replace window.confirm() with a styled dialog.
 *
 * @example
 * const { confirm, confirmProps } = useConfirm()
 *
 * // In a handler:
 * const handleDelete = async () => {
 *   const ok = await confirm({
 *     title: 'Eliminar cliente',
 *     message: '¿Estás seguro? Esta acción no se puede deshacer.',
 *     variant: 'danger',
 *     confirmText: 'Eliminar',
 *   })
 *   if (ok) deleteClient(id)
 * }
 *
 * // In JSX:
 * <ConfirmDialog {...confirmProps} />
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(INITIAL_STATE)
  // Keep a stable ref to the resolver to avoid stale closures
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setState({
        isOpen: true,
        resolve,
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        variant: 'info',
        ...options,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true)
    resolverRef.current = null
    setState(INITIAL_STATE)
  }, [])

  const handleCancel = useCallback(() => {
    resolverRef.current?.(false)
    resolverRef.current = null
    setState(INITIAL_STATE)
  }, [])

  return {
    confirm,
    confirmProps: {
      isOpen: state.isOpen,
      title: state.title,
      message: state.message,
      confirmText: state.confirmText ?? 'Confirmar',
      cancelText: state.cancelText ?? 'Cancelar',
      variant: state.variant ?? 'info',
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  }
}

export type UseConfirmReturn = ReturnType<typeof useConfirm>
