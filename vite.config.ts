import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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

function resolvePackageVersion(): string {
  try {
    const packageJson = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8')) as { version?: string }
    return packageJson.version || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

function resolveGitCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 2000,
    }).trim() || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

function formatUtcBuildDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hour = String(date.getUTCHours()).padStart(2, '0')
  const minute = String(date.getUTCMinutes()).padStart(2, '0')
  const second = String(date.getUTCSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second} UTC`
}

export default defineConfig(({ command, mode }) => ({
  base: './',
  plugins: [react(), command === 'serve' ? devRuntimeDateFormatPlugin() : undefined].filter(Boolean),
  define: {
    __DELIVERY_ERP_BUILD_INFO__: JSON.stringify({
      application: 'Delivery ERP',
      version: resolvePackageVersion(),
      gitCommit: resolveGitCommit(),
      buildDateUtc: formatUtcBuildDate(new Date()),
      environment: mode === 'production' ? 'Production' : 'Development',
    }),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
