import { useCallback, useRef, useState, type ReactNode } from 'react'
import { FeedbackContext, type ConfirmOptions } from './feedback'
import { Modal } from './Modal'

interface ToastItem {
  id: number
  message: string
  kind: 'ok' | 'error'
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const confirm = useCallback((o: ConfirmOptions) => {
    setPending(o)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (v: boolean) => {
    resolver.current?.(v)
    resolver.current = null
    setPending(null)
  }

  const toast = useCallback((message: string, kind: 'ok' | 'error' = 'ok') => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, message, kind }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3200)
  }, [])

  return (
    <FeedbackContext.Provider value={{ confirm, toast }}>
      {children}
      <Modal
        open={pending != null}
        title={pending?.title ?? ''}
        onClose={() => close(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => close(false)}>
              Cancelar
            </button>
            <button type="button" className={`btn ${pending?.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)}>
              {pending?.confirmLabel}
            </button>
          </>
        }
      >
        <p className="confirm-text">{pending?.message}</p>
      </Modal>
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}
