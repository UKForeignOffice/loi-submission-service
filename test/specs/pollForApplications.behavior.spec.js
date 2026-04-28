const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const { Op } = require('sequelize')

chai.use(sinonChai)
const { expect } = chai

const config = require('../../server/config/config')
const models = require('../../server/models')
const pollForApplicationsController = require('../../server/controllers/pollForApplications')

describe('pollForApplications behavior', () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('checkForEligibleApplications', () => {
    it('uses queued status and max retry threshold from config', async () => {
      const findOneStub = sinon.stub(models.Application, 'findOne').resolves(null)

      await pollForApplicationsController.checkForEligibleApplications()

      expect(findOneStub).to.have.been.calledOnceWith({
        where: {
          submitted: 'queued',
          submissionAttempts: {
            [Op.lt]: parseInt(config.maxRetryAttempts, 10),
          },
        },
        order: models.sequelize.random(),
      })
    })
  })

  describe('checkForApplications', () => {
    it('does nothing further when no eligible application exists', async () => {
      const findOneStub = sinon.stub(models.Application, 'findOne').resolves(null)
      const updateStub = sinon.stub(models.Application, 'update')

      await pollForApplicationsController.checkForApplications()

      expect(findOneStub).to.have.been.calledOnce
      expect(updateStub).to.not.have.been.called
    })

    it('marks an application as failed when exported app data is missing', async () => {
      sinon.stub(models.Application, 'findOne').resolves({
        application_id: 1001,
        submissionAttempts: 1,
        serviceType: 1,
      })
      const updateStub = sinon.stub(models.Application, 'update').resolves([1])
      sinon.stub(models.ExportedApplicationData, 'findOne').resolves(null)
      const postStub = sinon.stub(require('axios'), 'post')

      await pollForApplicationsController.checkForApplications()

      expect(updateStub.firstCall.args).to.deep.equal([
        { submitted: 'processing' },
        { where: { application_id: 1001 } },
      ])
      expect(updateStub.secondCall.args).to.deep.equal([{ submitted: 'failed' }, { where: { application_id: 1001 } }])
      expect(postStub).to.not.have.been.called
    })
  })

  describe('error handling', () => {
    it('updateApplicationAsProcessing logs and returns undefined on update error', async () => {
      sinon.stub(models.Application, 'update').rejects(new Error('db down'))
      const consoleErrorStub = sinon.stub(console, 'error')

      const result = await pollForApplicationsController.updateApplicationAsProcessing(123, true)

      expect(result).to.equal(undefined)
      expect(consoleErrorStub).to.have.been.calledOnceWith('updateApplicationAsProcessing: Error: db down')
    })

    it('placeBackInTheQueue logs and returns undefined on update error', async () => {
      sinon.stub(models.Application, 'update').rejects(new Error('db down'))
      const consoleErrorStub = sinon.stub(console, 'error')

      const result = await pollForApplicationsController.placeBackInTheQueue(123, 2)

      expect(result).to.equal(undefined)
      expect(consoleErrorStub).to.have.been.calledOnceWith('placeBackInTheQueue: Error: db down')
    })
  })
})
