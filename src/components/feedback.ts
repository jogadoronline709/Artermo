import { createContext, useContext } from 'react'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
}

export interface FeedbackCtx {
  confirm: (o: ConfirmOptions) => Promise<boolean>
  toast: (message: string, kind?: 'ok' | 'error') => void
}

export const FeedbackContext = createContext<FeedbackCtx>({
  confirm: async () => false,
  toast: () => {},
})

export function useFeedback(): FeedbackCtx {
  return useContext(FeedbackContext)
}
