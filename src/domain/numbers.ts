/**
 * Leitura e formatação de números com suporte a vírgula decimal (pt-BR)
 * e ponto decimal (en), incluindo notação científica.
 */

/**
 * Converte texto em número aceitando:
 * - "1.5", "1,5", "-0,25", "+3"
 * - notação científica: "1,846E-5", "1.846e-5", "1,846×10^-5", "1.846x10-5"
 * - separador de milhar quando AMBOS os separadores aparecem: "1.234,5" ou "1,234.5"
 *
 * Retorna `null` para texto vazio (dado ausente) e `NaN` para texto inválido.
 * Nunca retorna 0 para texto vazio.
 */
export function parseNumber(raw: string | number | null | undefined): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN
  let s = raw.trim().replace(/[\s  ]/g, '')
  if (s === '') return null

  // Notação "×10^-5" / "x10^-5" / "*10^-5" / "·10-5" → "e-5"
  s = s.replace(/[×xX*·]10\^?([+\-−]?\d+)$/, 'e$1')
  // Sinal de menos tipográfico
  s = s.replace(/−/g, '-')

  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) {
    // O último separador é o decimal; o outro é milhar.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (hasComma) {
    if ((s.match(/,/g) ?? []).length > 1) return NaN
    s = s.replace(',', '.')
  } else if (hasDot) {
    if ((s.match(/\./g) ?? []).length > 1) return NaN
  }

  // Validação estrita: nada além de um número decimal com expoente opcional.
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻',
  '+': '',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
}

export interface FormatOptions {
  /** Algarismos significativos (padrão 5). */
  sig?: number
  /** Separador decimal. Padrão vírgula (pt-BR). */
  decimal?: ',' | '.'
}

/**
 * Formata para exibição: algarismos significativos, vírgula decimal e
 * notação científica com sobrescrito para números muito pequenos/grandes.
 * Ex.: 1.8462e-5 → "1,8462 × 10⁻⁵"; 1.1614 → "1,1614"; 1007 → "1007,0".
 */
export function formatNumber(value: number | null | undefined, opts: FormatOptions = {}): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const sig = opts.sig ?? 5
  const dec = opts.decimal ?? ','
  if (value === 0) return '0'
  const abs = Math.abs(value)
  const exp = Math.floor(Math.log10(abs))
  let out: string
  if (exp < -3 || exp >= 6) {
    const [mant, e] = value.toExponential(sig - 1).split('e')
    const eSup = e.replace(/^\+/, '').split('').map((c) => SUPERSCRIPT[c] ?? c).join('')
    out = `${mant} × 10${eSup}`
  } else {
    out = value.toPrecision(sig)
    if (out.includes('e')) out = String(Number(out))
  }
  return dec === ',' ? out.replace('.', ',') : out
}

/** Formato "plano" para CSV/cópia: número completo, sem perder precisão. */
export function formatPlain(value: number | null | undefined, decimal: ',' | '.' = '.'): string {
  if (value == null || !Number.isFinite(value)) return ''
  const s = String(value)
  return decimal === ',' ? s.replace('.', ',') : s
}

/** Formata uma temperatura para exibição (até 4 casas, sem zeros sobrando). */
export function formatTemp(value: number, decimal: ',' | '.' = ','): string {
  const rounded = Math.round(value * 1e4) / 1e4
  const s = String(Object.is(rounded, -0) ? 0 : rounded)
  return decimal === ',' ? s.replace('.', ',') : s
}
