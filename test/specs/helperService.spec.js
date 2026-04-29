import chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import * as td from 'testdouble'
import { config } from '../../server/config/config.js'
import { logger } from '../../server/config/logs.js'

chai.use(sinonChai)
const { expect } = chai

describe('HelperService.getEdmsAccessToken', () => {
  let HelperService
  let axiosStub
  let originalConfig

  let loggerErrorStub

  beforeEach(async () => {
    axiosStub = td.function()
    HelperService = (await import(`../../server/services/HelperService.js?update=${Date.now()}`)).HelperService

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

    loggerErrorStub = sinon.stub(logger, 'error')
  })

  afterEach(() => {
    td.reset()
    sinon.restore()
    config.edmsBearerToken = originalConfig.edmsBearerToken
    config.edmsAuthHost = originalConfig.edmsAuthHost
    config.edmsAuthScope = originalConfig.edmsAuthScope
  })

  it('fetches token from EDMS then returns cached token on subsequent call', async () => {
    td.when(axiosStub(td.matchers.anything())).thenResolve({ data: { access_token: 'token-123' } })

    const first = await HelperService.getEdmsAccessToken({ axiosInstance: axiosStub })
    const second = await HelperService.getEdmsAccessToken({ axiosInstance: axiosStub })

    expect(first).to.equal('token-123')
    expect(second).to.equal('token-123')
    // Optionally check call count with testdouble if needed
  })

  it('returns undefined and logs when EDMS request fails', async () => {
    td.when(axiosStub(td.matchers.anything())).thenReject(new Error('network error'))

    const token = await HelperService.getEdmsAccessToken({ axiosInstance: axiosStub })

    expect(token).to.equal(undefined)
    expect(loggerErrorStub).to.have.been.calledOnce
  })

  it('returns undefined and logs when EDMS request fails', async () => {
    td.when(axiosStub(td.matchers.anything())).thenReject(new Error('network error'))

    const token = await HelperService.getEdmsAccessToken()

    expect(token).to.equal(undefined)
    expect(loggerErrorStub).to.have.been.calledOnce
  })
})
