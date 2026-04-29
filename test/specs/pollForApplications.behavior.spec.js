import chai from 'chai'
import { Op } from 'sequelize'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import { config } from '../../server/config/config.js'
import { logger } from '../../server/config/logs.js'
import {
  checkForApplications,
  checkForEligibleApplications,
  placeBackInTheQueue,
  updateApplicationAsProcessing,
} from '../../server/controllers/pollForApplicationsController.js'
import { Application, ExportedApplicationData, sequelize } from '../../server/models/index.js'

chai.use(sinonChai)
const { expect } = chai

let loggerErrorStub

describe('pollForApplications behavior', () => {
  beforeEach(() => {
    loggerErrorStub = sinon.stub(logger, 'error')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('checkForEligibleApplications', () => {
    it('uses queued status and max retry threshold from config', async () => {
      const findOneStub = sinon.stub(Application, 'findOne').resolves(null)

      await checkForEligibleApplications()

      expect(findOneStub).to.have.been.calledOnceWith({
        where: {
          submitted: 'queued',
          submissionAttempts: {
            [Op.lt]: parseInt(config.maxRetryAttempts, 10),
          },
        },
        order: sequelize.random(),
      })
    })
  })

  describe('checkForApplications', () => {
    it('does nothing further when no eligible application exists', async () => {
      const findOneStub = sinon.stub(Application, 'findOne').resolves(null)
      const updateStub = sinon.stub(Application, 'update')

      await checkForApplications()

      expect(findOneStub).to.have.been.calledOnce
      expect(updateStub).to.not.have.been.called
    })

    it('marks an application as failed when exported app data is missing', async () => {
      sinon.stub(Application, 'findOne').resolves({
        application_id: 1001,
        submissionAttempts: 1,
        serviceType: 1,
      })
      const updateStub = sinon.stub(Application, 'update').resolves([1])
      sinon.stub(ExportedApplicationData, 'findOne').resolves(null)

      await checkForApplications()

      expect(updateStub.firstCall.args).to.deep.equal([
        { submitted: 'processing' },
        { where: { application_id: 1001 } },
      ])
      expect(updateStub.secondCall.args).to.deep.equal([{ submitted: 'failed' }, { where: { application_id: 1001 } }])
    })
  })

  describe('error handling', () => {
    it('updateApplicationAsProcessing logs and returns undefined on update error', async () => {
      sinon.stub(Application, 'update').rejects(new Error('db down'))

      const result = await updateApplicationAsProcessing(123, true)

      expect(result).to.equal(undefined)
      expect(loggerErrorStub).to.have.been.calledOnceWith('updateApplicationAsProcessing: Error: db down')
    })

    it('placeBackInTheQueue logs and returns undefined on update error', async () => {
      sinon.stub(Application, 'update').rejects(new Error('db down'))

      const result = await placeBackInTheQueue(123, 2)

      expect(result).to.equal(undefined)
      expect(loggerErrorStub).to.have.been.calledOnceWith('placeBackInTheQueue: Error: db down')
    })
  })
})
