export interface BuildInformation {
  application: string
  version: string
  gitCommit: string
  shortGitCommit: string
  buildDateUtc: string
  environment: 'Production' | 'Development'
}

const UNKNOWN_COMMIT = 'Unknown'

function releaseLabelFromPackageVersion(version: string): string {
  if (version === 'Unknown') return version

  const match = version.match(/^(\d+)\.(\d+)(?:\.0)?$/)
  if (!match) return version.startsWith('v') ? version : `v${version}`

  return `v${match[1]}.${match[2]}`
}

function resolveBuildInformation(): BuildInformation {
  const metadata = typeof __DELIVERY_ERP_BUILD_INFO__ === 'undefined'
    ? {
        application: 'Delivery ERP',
        version: 'Unknown',
        gitCommit: UNKNOWN_COMMIT,
        buildDateUtc: 'Unknown',
        environment: import.meta.env.DEV ? 'Development' as const : 'Production' as const,
      }
    : __DELIVERY_ERP_BUILD_INFO__

  return {
    ...metadata,
    version: releaseLabelFromPackageVersion(metadata.version),
    shortGitCommit: metadata.gitCommit === UNKNOWN_COMMIT ? UNKNOWN_COMMIT : metadata.gitCommit.slice(0, 7),
  }
}

export const buildInformation = resolveBuildInformation()

export function buildInformationClipboardText(info: BuildInformation = buildInformation): string {
  return [
    info.application,
    `Version: ${info.version}`,
    `Git Commit: ${info.shortGitCommit}`,
    `Build Date: ${info.buildDateUtc}`,
    `Environment: ${info.environment}`,
  ].join('\n')
}
