import { useEffect, useState } from 'react'
import { useFeedback } from '../components/feedback'
import { MAX_BACKUP_BYTES, parseBackup, serializeBackup } from '../data/backup'
import type { ThemePref } from '../data/types'
import type { Source } from '../domain/types'
import { useSettings } from '../hooks/settingsContext'
import { repo } from '../hooks/useData'
import { detectPlatform, useInstall } from '../hooks/usePlatform'
import { dateStamp, downloadText, readTextFile } from '../lib/files'

const LAST_BACKUP_KEY = 'artermo-last-backup'

function lastBackupDate(): Date | null {
  try {
    const v = localStorage.getItem(LAST_BACKUP_KEY)
    return v ? new Date(v) : null
  } catch {
    return null
  }
}

export function SettingsPage({ sources }: { sources: Source[] }) {
  const { settings, update } = useSettings()
  const { confirm, toast } = useFeedback()
  const install = useInstall()
  const platform = detectPlatform()
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [usage, setUsage] = useState<string>('')
  const [lastBackup, setLastBackup] = useState<Date | null>(lastBackupDate)
  const hasDemo = sources.some((s) => s.isSimulated)

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted)
    void navigator.storage?.estimate?.().then((e) => {
      if (e.usage != null) setUsage(`${(e.usage / 1024).toFixed(0)} kB em uso`)
    })
  }, [])

  async function exportBackup() {
    const b = await repo.exportBackup()
    downloadText(`artermo-backup-${dateStamp()}.json`, serializeBackup(b), 'application/json')
    const now = new Date()
    try {
      localStorage.setItem(LAST_BACKUP_KEY, now.toISOString())
    } catch {
      /* ignora */
    }
    setLastBackup(now)
    toast('Backup exportado')
  }

  async function restore(file: File) {
    let text: string
    try {
      text = await readTextFile(file, MAX_BACKUP_BYTES)
    } catch (e) {
      toast((e as Error).message, 'error')
      return
    }
    const r = parseBackup(text)
    if (!r.ok) {
      toast(`Backup recusado: ${r.errors.slice(0, 3).join(' ')}`, 'error')
      return
    }
    const ok = await confirm({
      title: 'Restaurar backup?',
      message: `Todas as referências, tabelas e favoritos atuais serão substituídos por ${r.data.sources.length} referências e ${r.data.rows.length} linhas do arquivo${r.data.exportedAt ? ` (exportado em ${new Date(r.data.exportedAt).toLocaleString('pt-BR')})` : ''}.`,
      confirmLabel: 'Restaurar backup',
      danger: true,
    })
    if (!ok) return
    await repo.restoreBackup(r.data)
    toast('Backup restaurado')
  }

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
        <h2>Backup</h2>
        <p>
          O arquivo JSON guarda todas as referências, tabelas e favoritos. Guarde-o fora do navegador — apagar os dados do site ou desinstalar o app remove tudo deste dispositivo.
        </p>
        <p className={lastBackup ? 'muted small' : 'warn-text small'}>{lastBackup ? `Último backup exportado neste dispositivo: ${lastBackup.toLocaleString('pt-BR')}.` : 'Nenhum backup exportado ainda neste dispositivo.'}</p>
        <div className="button-row">
          <button type="button" className="btn btn-primary" onClick={exportBackup}>
            Exportar backup JSON
          </button>
          <label className="btn file-btn">
            Restaurar backup JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void restore(f)
              }}
            />
          </label>
        </div>
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
          Os dados ficam só neste dispositivo (IndexedDB). Nada é enviado para servidores. {usage}
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
        {persisted && <p className="ok-text small">Armazenamento persistente concedido: o navegador não deve apagar os dados por falta de espaço.</p>}
      </section>

      <section className="panel">
        <h2>Dados de demonstração</h2>
        <p>
          Cria três referências fictícias (Demo A, B e C) para experimentar a interface. São <strong>SIMULADOS — NÃO USAR EM CÁLCULOS REAIS</strong>, ficam marcadas em todas as telas e não entram
          na comparação a menos que você as selecione.
        </p>
        <div className="button-row">
          <button type="button" className="btn" onClick={async () => (await repo.loadDemo(), toast('Dados simulados criados'))}>
            {hasDemo ? 'Recriar dados simulados' : 'Criar dados simulados'}
          </button>
          {hasDemo && (
            <button type="button" className="btn btn-danger-ghost" onClick={async () => (await repo.removeDemo(), toast('Dados simulados removidos'))}>
              Remover dados simulados
            </button>
          )}
        </div>
      </section>

      <section className="panel danger-zone">
        <h2>Apagar tudo</h2>
        <p>Remove todas as referências, tabelas, favoritos e histórico e volta às três referências vazias.</p>
        <button
          type="button"
          className="btn btn-danger-ghost"
          onClick={async () => {
            const ok = await confirm({
              title: 'Apagar todos os dados?',
              message: 'Tudo o que foi cadastrado neste dispositivo será apagado. Esta ação não pode ser desfeita sem um backup.',
              confirmLabel: 'Apagar tudo',
              danger: true,
            })
            if (ok) {
              await repo.resetAll()
              toast('Dados apagados')
            }
          }}
        >
          Apagar todos os dados
        </button>
      </section>

      <section className="panel about">
        <h2>Sobre</h2>
        <p>
          ArTermo {__APP_VERSION__}. Consulta, interpolação linear e média aritmética de propriedades do ar a partir das tabelas que você cadastra. Sem login, sem servidor, sem
          rastreamento.
        </p>
      </section>
    </div>
  )
}
