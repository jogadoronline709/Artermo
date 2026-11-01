import { useEffect, useState } from 'react'
import { useFeedback } from '../components/feedback'
import { DEFAULT_SETTINGS, type ThemePref } from '../data/types'
import { useSettings } from '../hooks/settingsContext'
import { repo } from '../hooks/useData'
import { detectPlatform, useInstall } from '../hooks/usePlatform'

export function SettingsPage() {
  const { settings, update } = useSettings()
  const { confirm, toast } = useFeedback()
  const install = useInstall()
  const platform = detectPlatform()
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [usage, setUsage] = useState<string>('')

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted)
    void navigator.storage?.estimate?.().then((e) => {
      if (e.usage != null) setUsage(`${(e.usage / 1024).toFixed(0)} kB em uso`)
    })
  }, [])

  return (
    <div className="page">
      <header className="page-head">
        <h1>Configurações</h1>
      </header>

      <section className="panel">
        <h2>Aparência</h2>
        <div className="control">
          <span className="control-label">Tema</span>
          <div className="seg" role="radiogroup" aria-label="Tema">
            {(
              [
                ['system', 'Do sistema'],
                ['light', 'Claro'],
                ['dark', 'Escuro'],
              ] as [ThemePref, string][]
            ).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={settings.theme === v} className={settings.theme === v ? 'on' : ''} onClick={() => update({ theme: v })}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="control">
          <label className="control-label" htmlFor="sig">
            Algarismos significativos
          </label>
          <select id="sig" value={settings.sigDigits} onChange={(e) => update({ sigDigits: Number(e.target.value) })}>
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="panel">
        <h2>Cálculo</h2>
        <label className="check check-block">
          <input
            type="checkbox"
            checked={settings.allowExtrapolation}
            onChange={async (e) => {
              if (e.target.checked) {
                const ok = await confirm({
                  title: 'Ativar extrapolação?',
                  message:
                    'Fora da faixa da tabela, o app passará a estender a reta dos dois pontos extremos. Esses resultados são estimativas, sem respaldo da tabela, e aparecerão marcados como “Extrapolado”.',
                  confirmLabel: 'Ativar extrapolação',
                  danger: true,
                })
                if (ok) update({ allowExtrapolation: true })
              } else update({ allowExtrapolation: false })
            }}
          />
          <span>
            Permitir extrapolação além da faixa da tabela <span className="muted">(avançado, desativado por padrão)</span>
          </span>
        </label>
        <p className="muted small">O modo da média e a escolha entre ν, α e Pr publicados ou calculados ficam na aba Comparar / Média.</p>
      </section>

      <section className="panel">
        <h2>Instalar no celular ou computador</h2>
        {install.installed ? (
          <p className="ok-text">O ArTermo está rodando como app instalado.</p>
        ) : install.canPrompt ? (
          <button type="button" className="btn btn-primary" onClick={() => install.prompt()}>
            Instalar o ArTermo
          </button>
        ) : (
          <p className="muted">O botão de instalação aparece quando o navegador permite. Você também pode instalar pelo menu do navegador:</p>
        )}
        {!install.installed && (
          <ul className="install-list">
            <li className={platform === 'android' ? 'is-current' : ''}>
              <strong>Android (Chrome):</strong> menu ⋮ → “Instalar app” ou “Adicionar à tela inicial”.
            </li>
            <li className={platform === 'ios' ? 'is-current' : ''}>
              <strong>iPhone e iPad (Safari):</strong> botão Compartilhar → “Adicionar à Tela de Início”.
            </li>
            <li className={platform === 'desktop' ? 'is-current' : ''}>
              <strong>Computador (Chrome ou Edge):</strong> ícone de instalar na barra de endereço, ou menu → “Instalar ArTermo”.
            </li>
          </ul>
        )}
        <p className="muted small">Depois do primeiro carregamento, o app abre e calcula sem internet.</p>
      </section>

      <section className="panel">
        <h2>Armazenamento</h2>
        <p>
          As tabelas dos fluidos vêm com o app. Neste dispositivo (IndexedDB) ficam só as preferências, os favoritos e o histórico de consultas. Nada é enviado para servidores. {usage}
        </p>
        {persisted === false && (
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const ok = await navigator.storage?.persist?.()
              setPersisted(!!ok)
              toast(ok ? 'Armazenamento protegido contra limpeza automática' : 'O navegador não concedeu armazenamento persistente', ok ? 'ok' : 'error')
            }}
          >
            Pedir armazenamento persistente
          </button>
        )}
        {persisted && <p className="ok-text small">Armazenamento persistente concedido: o navegador não deve apagar suas preferências por falta de espaço.</p>}
      </section>

      <section className="panel danger-zone">
        <h2>Limpar histórico, favoritos e preferências</h2>
        <p>Apaga o histórico de consultas, as temperaturas favoritas e as preferências deste dispositivo. As tabelas dos fluidos vêm com o app e não são afetadas.</p>
        <button
          type="button"
          className="btn btn-danger-ghost"
          onClick={async () => {
            const ok = await confirm({
              title: 'Limpar histórico, favoritos e preferências?',
              message: 'Histórico, favoritos e preferências deste dispositivo serão apagados. As tabelas dos fluidos não são afetadas.',
              confirmLabel: 'Limpar',
              danger: true,
            })
            if (ok) {
              await repo.clearUserData()
              update({ ...DEFAULT_SETTINGS })
              toast('Histórico, favoritos e preferências apagados')
            }
          }}
        >
          Limpar histórico, favoritos e preferências
        </button>
      </section>

      <section className="panel about">
        <h2>Sobre</h2>
        <p>
          ArTermo {__APP_VERSION__}. Consulta, interpolação linear e média aritmética de propriedades termofísicas de gases e fluidos a partir de tabelas de referência embutidas.
          Sem login, sem servidor, sem rastreamento.
        </p>
      </section>
    </div>
  )
}
