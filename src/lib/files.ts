/** Baixa um texto como arquivo — tudo acontece no próprio navegador. */
export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8') {
  // BOM para o Excel reconhecer UTF-8 (acentos, °, μ) em CSV.
  const body = mime.startsWith('text/csv') ? '﻿' + text : text
  const blob = new Blob([body], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Lê um arquivo local como texto, recusando arquivos maiores que `maxBytes`. */
export async function readTextFile(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) {
    throw new Error(`Arquivo grande demais (${(file.size / 1024 / 1024).toFixed(1)} MB). Limite: ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`)
  }
  return file.text()
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Alternativa para contextos sem a API de área de transferência.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function dateStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
