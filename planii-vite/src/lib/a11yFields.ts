/**
 * Programmatic labels for the `.field > label + control` pattern (WCAG 1.3.1, 3.3.2, 4.1.2).
 *
 * The forms were written as `<div class="field"><label>Name</label><input/></div>` (~70 places) where the
 * label is not tied to the control, so screen readers announce an unnamed field. This links them at runtime:
 * a plain control gets `id`/`for`; a control-less block (e.g. a segmented button list) becomes a labelled group.
 * Stopgap: new forms should use real `htmlFor` (or a shared <Field>) and this observer then leaves them alone.
 */
let seq = 0
const CONTROL = 'input:not([type="hidden"]),select,textarea'

function link(field: Element) {
  const label = field.querySelector(':scope > label')
  if (!label || label.hasAttribute('for') || label.querySelector(CONTROL)) return
  const control = field.querySelector<HTMLElement>(CONTROL)
  if (control) {
    if (control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby')) return
    if (!control.id) control.id = `fld-${++seq}`
    label.setAttribute('for', control.id)
    return
  }
  const group = label.nextElementSibling as HTMLElement | null
  if (!group || group.hasAttribute('aria-labelledby') || group.hasAttribute('aria-label')) return
  if (!label.id) label.id = `fld-${++seq}`
  group.setAttribute('role', 'group')
  group.setAttribute('aria-labelledby', label.id)
}

function scan(root: ParentNode) {
  if (root instanceof Element && root.matches('.field')) link(root)
  root.querySelectorAll('.field').forEach(link)
}

export function autoLabelFields() {
  scan(document)
  let queued = false
  new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => { queued = false; scan(document) })
  }).observe(document.body, { childList: true, subtree: true })
}
