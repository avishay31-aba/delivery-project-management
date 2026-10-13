import { expect, test, type BrowserContext, type Page } from '@playwright/test'

declare global {
  interface Window {
    __dpmSyncMetrics?: {
      appStateWrites: number
      notificationWrites: number
      storageEvents: number
      broadcastPosts: number
      broadcastMessages: number
    }
  }
}

const NOTIFICATION_STORAGE_KEY = 'delivery-erp-state-sync-notification'
const APP_STATE_STORAGE_KEY = 'dpm-mvp-v1'

async function installSyncMetrics(context: BrowserContext) {
  await context.addInitScript(({ notificationKey, appStateKey }) => {
    const metrics = () => {
      window.__dpmSyncMetrics ??= {
        appStateWrites: 0,
        notificationWrites: 0,
        storageEvents: 0,
        broadcastPosts: 0,
        broadcastMessages: 0,
      }
      return window.__dpmSyncMetrics
    }

    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function setItemWithDpmMetrics(key: string, value: string) {
      if (key === appStateKey) metrics().appStateWrites += 1
      if (key === notificationKey) metrics().notificationWrites += 1
      return originalSetItem.call(this, key, value)
    }

    window.addEventListener('storage', (event) => {
      if (event.key === appStateKey || event.key === notificationKey) metrics().storageEvents += 1
    })

    const NativeBroadcastChannel = window.BroadcastChannel
    window.BroadcastChannel = class InstrumentedBroadcastChannel extends NativeBroadcastChannel {
      set onmessage(handler: ((this: BroadcastChannel, ev: MessageEvent) => unknown) | null) {
        super.onmessage = handler
          ? (event: MessageEvent) => {
              metrics().broadcastMessages += 1
              return handler.call(this, event)
            }
          : null
      }

      get onmessage() {
        return super.onmessage
      }

      postMessage(message: unknown) {
        metrics().broadcastPosts += 1
        return super.postMessage(message)
      }
    }
  }, { notificationKey: NOTIFICATION_STORAGE_KEY, appStateKey: APP_STATE_STORAGE_KEY })
}

async function resetMetrics(page: Page) {
  await page.evaluate(() => {
    window.__dpmSyncMetrics = {
      appStateWrites: 0,
      notificationWrites: 0,
      storageEvents: 0,
      broadcastPosts: 0,
      broadcastMessages: 0,
    }
  })
}

async function waitForStartupSyncWindow(page: Page) {
  await page.waitForTimeout(1_250)
}

async function metrics(page: Page) {
  return page.evaluate(() => window.__dpmSyncMetrics)
}

async function openProject(page: Page, pid = 'P000390') {
  await page.goto(`/#/projects/${pid}?mode=edit`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.body.textContent?.includes('Project') && !document.body.textContent?.includes('Loading...'))
}

async function updateProjectComment(page: Page, pid: string, comment: string) {
  return page.evaluate(async ({ targetPid, nextComment }) => {
    const { useAppStore } = await import('/src/store/useAppStore.ts')
    const project = useAppStore.getState().projects.find((candidate) => candidate.pid === targetPid)
    if (!project) throw new Error(`Project ${targetPid} not found.`)
    const saved = useAppStore.getState().updateProject(project.id, { projectComments: nextComment })
    return {
      pid: saved.pid,
      projectComments: saved.projectComments,
      lastPersistedAt: useAppStore.getState().lastPersistedAt,
    }
  }, { targetPid: pid, nextComment: comment })
}

async function projectComment(page: Page, pid: string) {
  return page.evaluate(async (targetPid) => {
    const { useAppStore } = await import('/src/store/useAppStore.ts')
    return useAppStore.getState().projects.find((candidate) => candidate.pid === targetPid)?.projectComments ?? ''
  }, pid)
}

for (const tabCount of [1, 5, 10, 15]) {
  test(`Stage A cross-tab save notification converges without echo writes across ${tabCount} tab(s)`, async ({ context }) => {
    await installSyncMetrics(context)

    const pages = await Promise.all(Array.from({ length: tabCount }, async () => {
      const page = await context.newPage()
      await openProject(page)
      return page
    }))

    await Promise.all(pages.map(waitForStartupSyncWindow))
    await Promise.all(pages.map(resetMetrics))

    const comment = `<p>Stage A cross-tab ${tabCount} tabs ${Date.now()}</p>`
    const startedAt = performance.now()
    const saveResult = await updateProjectComment(pages[0], 'P000390', comment)
    const saveLatencyMs = Number((performance.now() - startedAt).toFixed(2))
    expect(saveResult.lastPersistedAt).toBeTruthy()

    await Promise.all(pages.slice(1).map((page) =>
      expect.poll(() => projectComment(page, 'P000390'), { timeout: 20_000 }).toBe(comment),
    ))

    const allMetrics = await Promise.all(pages.map(metrics))
    const source = allMetrics[0]!
    const followers = allMetrics.slice(1).map((entry) => entry!)

    expect(source.appStateWrites).toBe(1)
    expect(source.notificationWrites).toBe(1)
    expect(source.broadcastPosts).toBe(1)
    for (const follower of followers) {
      expect(follower.appStateWrites).toBe(0)
      expect(follower.notificationWrites).toBe(0)
      expect(follower.broadcastPosts).toBe(0)
      expect(follower.broadcastMessages).toBeLessThanOrEqual(1)
      expect(follower.storageEvents).toBeLessThanOrEqual(2)
    }

    console.log(JSON.stringify({ tabCount, saveLatencyMs, saveResult, metrics: allMetrics }, null, 2))
    await Promise.all(pages.map((page) => page.close()))
  })
}
