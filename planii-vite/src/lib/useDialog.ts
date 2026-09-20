import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Keyboard behaviour shared by every modal surface (WCAG 2.1.2, 2.4.3, 2.4.11):
 * moves focus inside on open, keeps Tab/Shift+Tab within the dialog, closes on Escape
 * and gives focus back to the element that opened it.
 */
export function useDialog<T extends HTMLElement>(onClose: () => void, active = true) {
  const ref = useRef<T>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  // Remember who had focus *before* the dialog renders: an `autoFocus` field steals it during commit.
  const openerRef = useRef<HTMLElement | null>(null)
  if (active && !openerRef.current) openerRef.current = document.activeElement as HTMLElement | null
  if (!active) openerRef.current = null

  useEffect(() => {
    const node = ref.current
    if (!active || !node) return
    const opener = openerRef.current
    const visible = (el: HTMLElement) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
    const focusables = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible)

    if (!node.contains(document.activeElement)) {
      // Skip the sizing/close controls of the header when the dialog holds a real field.
      const field = Array.from(node.querySelectorAll<HTMLElement>('input:not([disabled]):not([type="hidden"]):not([type="file"]),textarea:not([disabled]),select:not([disabled])')).find(visible)
      const first = field ?? focusables()[0]
      if (first) first.focus()
      else { node.tabIndex = -1; node.focus() }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); return }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !node.contains(active))) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (active === last || !node.contains(active))) { e.preventDefault(); first.focus() }
    }
    node.addEventListener('keydown', onKey)
    return () => {
      node.removeEventListener('keydown', onKey)
      if (opener && document.contains(opener)) opener.focus()
    }
  }, [active])

  return ref
}
