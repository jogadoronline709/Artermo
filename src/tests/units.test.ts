// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.
// Nenhum valor foi retirado de Kreith, Incropera ou Çengel.
import { describe, expect, it } from 'vitest'
import {
  fromCanonical,
  fromCelsius,
  parsePropertyUnit,
  parseTempUnit,
  pressureFromKPa,
  pressureToKPa,
  propertyDefsFor,
  toCanonical,
  toCelsius,
} from '../domain/units'
import { formatNumber, parseNumber } from '../domain/numbers'

describe('conversões de temperatura (°C / K / °F)', () => {
  it('converte para °C', () => {
    expect(toCelsius(25, 'C')).toBe(25)
    expect(toCelsius(300, 'K')).toBeCloseTo(26.85, 12)
    expect(toCelsius(273.15, 'K')).toBe(0)
    expect(toCelsius(212, 'F')).toBeCloseTo(100, 12)
    expect(toCelsius(32, 'F')).toBe(0)
    expect(toCelsius(-40, 'F')).toBeCloseTo(-40, 12)
  })

  it('converte de °C e faz ida e volta', () => {
    expect(fromCelsius(0, 'K')).toBe(273.15)
    expect(fromCelsius(100, 'F')).toBeCloseTo(212, 12)
    for (const u of ['C', 'K', 'F'] as const) {
      expect(toCelsius(fromCelsius(37.5, u), u)).toBeCloseTo(37.5, 10)
    }
  })

  it('reconhece unidades de temperatura escritas de várias formas', () => {
    expect(parseTempUnit('°C')).toBe('C')
    expect(parseTempUnit(' k ')).toBe('K')
    expect(parseTempUnit('ºF')).toBe('F')
    expect(parseTempUnit('')).toBeNull()
    expect(parseTempUnit('R')).toBeNull()
  })
})

describe('conversões de cp e μ', () => {
  it('cp: kJ/(kg·K) → J/(kg·K) multiplica por 1000 (valor, não só rótulo)', () => {
    expect(toCanonical('specificHeat', 1.234, 'kJ/(kg.K)')).toBeCloseTo(1234, 10)
    expect(toCanonical('specificHeat', 1234, 'J/(kg.K)')).toBe(1234)
    expect(fromCanonical('specificHeat', 1234, 'kJ/(kg.K)')).toBeCloseTo(1.234, 12)
  })

  it('μ: mPa·s e μPa·s → Pa·s', () => {
    expect(toCanonical('dynamicViscosity', 2, 'mPa.s')).toBeCloseTo(2e-3, 15)
    expect(toCanonical('dynamicViscosity', 20, 'uPa.s')).toBeCloseTo(2e-5, 15)
    expect(toCanonical('dynamicViscosity', 200, '1e-7 Pa.s')).toBeCloseTo(2e-5, 15)
    expect(toCanonical('dynamicViscosity', 0.5, 'Pa.s')).toBe(0.5)
  })

  it('outras propriedades com unidades escaladas', () => {
    expect(toCanonical('kinematicViscosity', 15, '1e-6 m2/s')).toBeCloseTo(1.5e-5, 15)
    expect(toCanonical('kinematicViscosity', 15, 'mm2/s')).toBeCloseTo(1.5e-5, 15)
    expect(toCanonical('conductivity', 25, '1e-3 W/(m.K)')).toBeCloseTo(0.025, 15)
    expect(toCanonical('density', 1.2, 'g/cm3')).toBeCloseTo(1200, 10)
  })

  it('reconhece grafias de unidade da importação', () => {
    expect(parsePropertyUnit('specificHeat', 'kJ/kg·K')).toBe('kJ/(kg.K)')
    expect(parsePropertyUnit('specificHeat', 'J/(kg K)')).toBe('J/(kg.K)')
    expect(parsePropertyUnit('dynamicViscosity', 'µPa·s')).toBe('uPa.s')
    expect(parsePropertyUnit('dynamicViscosity', 'mPa s')).toBe('mPa.s')
    expect(parsePropertyUnit('dynamicViscosity', 'N·s/m²')).toBe('Pa.s')
    expect(parsePropertyUnit('kinematicViscosity', 'm²/s')).toBe('m2/s')
    expect(parsePropertyUnit('density', '')).toBeUndefined()
    expect(parsePropertyUnit('density', 'lb/ft3')).toBeNull()
  })

  it('rejeita unidade inexistente em vez de ignorar', () => {
    expect(() => toCanonical('density', 1, 'xyz')).toThrow()
  })
})

describe('pressão', () => {
  it('converte atm, bar e Pa para kPa', () => {
    expect(pressureToKPa(1, 'atm')).toBeCloseTo(101.325, 12)
    expect(pressureToKPa(1, 'bar')).toBe(100)
    expect(pressureToKPa(101325, 'Pa')).toBeCloseTo(101.325, 12)
    expect(pressureFromKPa(101.325, 'atm')).toBeCloseTo(1, 12)
  })
})

describe('leitura de números (vírgula e ponto decimal)', () => {
  it('aceita vírgula e ponto decimal', () => {
    expect(parseNumber('1,5')).toBe(1.5)
    expect(parseNumber('1.5')).toBe(1.5)
    expect(parseNumber('-0,25')).toBe(-0.25)
    expect(parseNumber('1.234,5')).toBe(1234.5)
    expect(parseNumber('1,234.5')).toBe(1234.5)
  })
  it('aceita notação científica', () => {
    expect(parseNumber('1,5E-5')).toBeCloseTo(1.5e-5, 18)
    expect(parseNumber('1.5e-5')).toBeCloseTo(1.5e-5, 18)
    expect(parseNumber('1,5×10^-5')).toBeCloseTo(1.5e-5, 18)
    expect(parseNumber('2x10-3')).toBeCloseTo(2e-3, 18)
  })
  it('vazio é ausente (null), nunca zero; lixo é NaN', () => {
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('   ')).toBeNull()
    expect(parseNumber('abc')).toBeNaN()
    expect(parseNumber('1,2,3')).toBeNaN()
    expect(parseNumber('=1+1')).toBeNaN()
  })
  it('formata em pt-BR', () => {
    expect(formatNumber(1.5)).toBe('1,5000')
    expect(formatNumber(1.5e-5, { sig: 4 })).toBe('1,500 × 10⁻⁵')
    expect(formatNumber(null)).toBe('—')
  })
})

describe('propriedades de gás ideal e conjuntos', () => {
  it('converte h, u e s° para SI', () => {
    expect(toCanonical('enthalpy', 1.5, 'kJ/kg')).toBeCloseTo(1500, 9)
    expect(toCanonical('internalEnergy', 2, 'kJ/kg')).toBeCloseTo(2000, 9)
    expect(toCanonical('entropyStd', 1.2, 'kJ/(kg.K)')).toBeCloseTo(1200, 9)
    expect(parsePropertyUnit('enthalpy', 'kJ/kg')).toBe('kJ/kg')
  })

  it('cada conjunto lista suas propriedades na ordem certa', () => {
    expect(propertyDefsFor('gasIdeal').map((d) => d.key)).toEqual(['enthalpy', 'internalEnergy', 'entropyStd', 'relativePressure', 'relativeVolume'])
    const transporte = ['density', 'specificHeat', 'conductivity', 'dynamicViscosity', 'kinematicViscosity', 'thermalDiffusivity', 'prandtl']
    expect(propertyDefsFor('transporte').map((d) => d.key)).toEqual(transporte)
    expect(propertyDefsFor().map((d) => d.key)).toEqual(transporte)
    expect(propertyDefsFor('gasIdeal').map((d) => d.symbol)).toEqual(['h', 'u', 's°', 'Pᵣ', 'vᵣ'])
  })
})
