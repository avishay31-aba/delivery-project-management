const childProcess = require('node:child_process')
const http = require('node:http')
const path = require('node:path')
const sea = require('node:sea')

const productName = 'Delivery ERP'
const host = '127.0.0.1'
const preferredPort = 47831
const maxPortAttempts = 50
const runtimeRegionalDateFormat = resolveWindowsRegionalDateFormat()

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

function normalizeRequestPath(url) {
  const parsed = new URL(url, `http://${host}`)
  let requestPath = decodeURIComponent(parsed.pathname)
  if (requestPath === '/') {
    requestPath = '/index.html'
  }

  return requestPath.replace(/^\/+/, '').replace(/\\/g, '/')
}

function getAssetPath(requestPath) {
  const key = `app/${requestPath}`
  if (sea.getAssetKeys().includes(key)) {
    return key
  }

  return 'app/index.html'
}

function normalizeRegionalDateFormat(shortDate) {
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

function resolveWindowsRegionalDateFormat() {
  if (process.platform !== 'win32') return 'system'
  try {
    const output = childProcess.execFileSync(
      'reg',
      ['query', 'HKCU\\Control Panel\\International', '/v', 'sShortDate'],
      { encoding: 'utf8', windowsHide: true, timeout: 2000 },
    )
    const match = output.match(/sShortDate\s+REG_SZ\s+([^\r\n]+)/i)
    return normalizeRegionalDateFormat(match?.[1])
  } catch {
    return 'system'
  }
}

function injectRuntimeConfig(html) {
  const config = `<script>window.__DELIVERY_ERP_RUNTIME_CONFIG__=${JSON.stringify({ regionalDateFormat: runtimeRegionalDateFormat })};</script>`
  if (html.includes('</head>')) {
    return html.replace('</head>', `${config}</head>`)
  }
  return `${config}${html}`
}

function serveAsset(request, response) {
  try {
    const requestPath = normalizeRequestPath(request.url || '/')
    const assetPath = getAssetPath(requestPath)
    const extension = path.extname(assetPath).toLowerCase()
    const rawBytes = Buffer.from(sea.getRawAsset(assetPath))
    const bytes = assetPath === 'app/index.html' ? Buffer.from(injectRuntimeConfig(rawBytes.toString('utf8'))) : rawBytes

    response.writeHead(200, {
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
      'Content-Length': bytes.length,
      'Cache-Control': 'no-cache',
    })
    response.end(bytes)
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end(`${productName} failed to serve the requested file.`)
  }
}

function openBrowser(port) {
  const url = `http://${host}:${port}/#/projects`
  childProcess.execFile('cmd', ['/c', 'start', '', url], { windowsHide: true })
}

function listenOnAvailablePort(port, attemptsRemaining) {
  const server = http.createServer(serveAsset)

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attemptsRemaining > 0) {
      listenOnAvailablePort(port + 1, attemptsRemaining - 1)
      return
    }

    console.error(`${productName} could not start a localhost server: ${error.message}`)
    process.exitCode = 1
  })

  server.listen(port, host, () => {
    openBrowser(port)
    console.log(`${productName} is running at http://${host}:${port}/`)
  })
}

if (!sea.isSea()) {
  console.error(`${productName} launcher must be packaged before distribution.`)
  process.exit(1)
}

listenOnAvailablePort(preferredPort, maxPortAttempts)
