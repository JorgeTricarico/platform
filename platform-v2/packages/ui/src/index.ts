// ── Components ──────────────────────────────────────────────────────────────
export { Button, type ButtonProps } from './components/Button.js'
export { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './components/Card.js'
export { Badge, type BadgeProps } from './components/Badge.js'
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './components/Dialog.js'
export { Input, type InputProps } from './components/Input.js'
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './components/Select.js'
export { Skeleton } from './components/Skeleton.js'
export { Toast, ToastProvider, useToast, type ToastMessage } from './components/Toast.js'
export { OfflineIndicator } from './components/OfflineIndicator.js'

// ── DataView (full-featured adaptive data display) ───────────────────────────
export {
  DataView,
  type DataViewProps,
  type ColumnDef,
  type FilterDef,
  type FilterType,
  type ActionDef,
  type BulkActionDef,
  type PaginationOptions,
} from './components/DataView.js'

// ── ConfirmDialog (imperative confirm replacement) ───────────────────────────
export {
  ConfirmDialog,
  LegacyConfirmDialog,
  type ConfirmDialogProps,
  type ConfirmDialogVariant,
} from './components/ConfirmDialog.js'

// ── Hooks ──────────────────────────────────────────────────────────────────
export { useDebounce } from './hooks/useDebounce.js'
export {
  useMediaQuery,
  useIsXs,
  useIsMobile,
  useIsTabletOrDesktop,
  useIsDesktop,
  usePrefersReducedMotion,
  usePrefersDarkMode,
} from './hooks/useMediaQuery.js'
export { useConfirm, type ConfirmOptions, type UseConfirmReturn } from './hooks/useConfirm.js'

// ── Utilities ──────────────────────────────────────────────────────────────
export { cn, formatCurrency, formatDate, truncate } from './lib/utils.js'
