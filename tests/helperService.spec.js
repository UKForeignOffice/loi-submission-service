import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { config } from '../server/config/config.js'

describe('HelperService.getEdmsAccessToken', () => {
  let HelperService
  let axiosStub
  let originalConfig
  let loggerErrorStub

  beforeEach(async () => {
    vi.resetModules()
    axiosStub = vi.fn()
    HelperService = (await import('../server/services/HelperService.js')).HelperService

    // Re-import logger after resetModules so we spy on the same instance HelperService uses
    const { logger } = await import('../server/config/logs.js')
    loggerErrorStub = vi.spyOn(logger, 'error').mockImplementation(() => {})

    originalConfig = {
      edmsBearerToken: config.edmsBearerToken,
      edmsAuthHost: config.edmsAuthHost,
      edmsAuthScope: config.edmsAuthScope,
    }
    config.edmsBearerToken = {
      cognito_app_client_id: 'client-id',
      cognito_app_client_secret: 'client-secret',
    }
    config.edmsAuthHost = 'https://example.org/token'
    config.edmsAuthScope = 'submission:write'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    config.edmsBearerToken = originalConfig.edmsBearerToken
    config.edmsAuthHost = originalConfig.edmsAuthHost
    config.edmsAuthScope = originalConfig.edmsAuthScope
  })

  it('fetches token from EDMS then returns cached token on subsequent call', async () => {
    axiosStub.mockResolvedValue({ data: { access_token: 'token-123' } })

    const first = await HelperService.getEdmsAccessToken({ axiosInstance: axiosStub })
    const second = await HelperService.getEdmsAccessToken({ axiosInstance: axiosStub })

    expect(first).toBe('token-12333243')
    expect(second).toBe('token-123')
  })

  it('returns undefined and logs when EDMS request fails', async () => {
    axiosStub.mockRejectedValue(new Error('network error'))

    const token = await HelperService.getEdmsAccessToken({ axiosInstance: axiosStub })

    expect(token).toBeUndefined()
    expect(loggerErrorStub).toHaveBeenCalledOnce()
  })

  it('returns undefined and logs when EDMS request fails without axiosInstance', async () => {
    axiosStub.mockRejectedValue(new Error('network error'))

    const token = await HelperService.getEdmsAccessToken()

    expect(token).toBeUndefined()
    expect(loggerErrorStub).toHaveBeenCalledOnce()
  })
})
