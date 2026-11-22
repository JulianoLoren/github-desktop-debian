import * as Fs from 'fs'

/**
 * The sysctl Ubuntu (and other distributions that ship AppArmor's
 * unprivileged user namespace restriction) use to block unprivileged
 * processes from creating user namespaces.
 *
 * @see https://documentation.ubuntu.com/security/security-features/privilege-restrictions/apparmor-user-namespace-restriction/
 */
export const RESTRICTED_USERNS_SYSCTL =
  '/proc/sys/kernel/apparmor_restrict_unprivileged_userns'

type ReadFile = typeof Fs.readFileSync

/**
 * Reads a system value synchronously.
 *
 * This is intentionally synchronous: the check has to run before Electron
 * spins up any child process, and it is a single tiny read from /proc. Kept
 * apart from `isLinuxSandboxUnavailable` so the lint exception stays as
 * narrow as possible.
 */
/* eslint-disable-next-line no-sync */
const readFileSync: ReadFile = Fs.readFileSync

/**
 * Determine whether Electron's sandbox can function on this machine.
 *
 * Chromium (and therefore Electron) uses user namespaces to build its
 * sandbox. Recent Ubuntu releases restrict unprivileged user namespace
 * creation via AppArmor unless the executable has a security profile, which
 * packaged apps do and locally built apps do not. When that happens every
 * child process (GPU, renderer, utility) fails to start and the app aborts.
 *
 * The sysctl only exists when the restriction feature is available, so a
 * missing file means the sandbox can be used as normal.
 */
export function isLinuxSandboxUnavailable(
  platform: NodeJS.Platform = process.platform,
  readFile: ReadFile = readFileSync
) {
  if (platform !== 'linux') {
    return false
  }

  try {
    const value = readFile(RESTRICTED_USERNS_SYSCTL, 'utf8')
    return value.trim() === '1'
  } catch {
    // Not all kernels have this sysctl, in which case unprivileged user
    // namespaces are not restricted, or at least not by AppArmor.
    return false
  }
}
