const childProcess = require('node:child_process')
const http = require('node:http')
const path = require('node:path')
const sea = require('node:sea')

const productName = 'Delivery ERP'
const host = '127.0.0.1'
const preferredPort = 47831
const maxPortAttempts = 50

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

function serveAsset(request, response) {
  try {
    const requestPath = normalizeRequestPath(request.url || '/')
    const assetPath = getAssetPath(requestPath)
    const bytes = Buffer.from(sea.getRawAsset(assetPath))
    const extension = path.extname(assetPath).toLowerCase()

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
