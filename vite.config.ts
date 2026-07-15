import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'

type RegionalDateFormat = 'system' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'

function normalizeRegionalDateFormat(shortDate: string | undefined): RegionalDateFormat {
  const normalized = String(shortDate || '').trim().toLowerCase()
  const firstDayIndex = normalized.indexOf('d')
  const firstMonthIndex = normalized.indexOf('m')
  const firstYearIndex = normalized.indexOf('y')
  if (firstDayIndex === -1 || firstMonthIndex === -1 || firstYearIndex === -1) {
    return 'system'
  }
  if (firstYearIndex < firstMonthIndex && firstMonthIndex < firstDayIndex) {
    return 'YYYY-MM-DD'
  }
  if (firstDayIndex < firstMonthIndex && firstMonthIndex < firstYearIndex) {
    return 'DD/MM/YYYY'
  }
  if (firstMonthIndex < firstDayIndex && firstDayIndex < firstYearIndex) {
    return 'MM/DD/YYYY'
  }
  return 'system'
}

function resolveWindowsRegionalDateFormat(): RegionalDateFormat {
  if (process.platform !== 'win32') return 'system'
  try {
    const output = execFileSync('reg', ['query', 'HKCU\\Control Panel\\International', '/v', 'sShortDate'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 2000,
    })
    const match = output.match(/sShortDate\s+REG_SZ\s+([^\r\n]+)/i)
    return normalizeRegionalDateFormat(match?.[1])
  } catch {
    return 'system'
  }
}

function devRuntimeDateFormatPlugin() {
  return {
    name: 'delivery-erp-dev-runtime-date-format',
    transformIndexHtml(html: string) {
      const config = `<script>window.__DELIVERY_ERP_RUNTIME_CONFIG__=${JSON.stringify({
        regionalDateFormat: resolveWindowsRegionalDateFormat(),
      })};</script>`
      return html.includes('</head>') ? html.replace('</head>', `${config}</head>`) : `${config}${html}`
    },
  }
}

export default defineConfig(({ command }) => ({
  base: './',
  plugins: [react(), command === 'serve' ? devRuntimeDateFormatPlugin() : undefined].filter(Boolean),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
