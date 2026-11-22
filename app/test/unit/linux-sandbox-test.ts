import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as Fs from 'fs'
import { isLinuxSandboxUnavailable } from '../../src/main-process/linux-sandbox'

function reader(returnValue: string | null) {
  return ((path: Fs.PathLike) => {
    if (returnValue === null) {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    }

    return returnValue
  }) as typeof Fs.readFileSync
}

describe('isLinuxSandboxUnavailable', () => {
  it('returns false on non-Linux platforms', () => {
    assert.equal(isLinuxSandboxUnavailable('darwin', reader('1\n')), false)
    assert.equal(isLinuxSandboxUnavailable('win32', reader('1\n')), false)
  })

  it('returns true when unprivileged user namespaces are restricted', () => {
    assert.equal(isLinuxSandboxUnavailable('linux', reader('1\n')), true)
  })

  it('returns false when unprivileged user namespaces are allowed', () => {
    assert.equal(isLinuxSandboxUnavailable('linux', reader('0\n')), false)
  })

  it('returns false when the sysctl is not available', () => {
    assert.equal(isLinuxSandboxUnavailable('linux', reader(null)), false)
  })
})
