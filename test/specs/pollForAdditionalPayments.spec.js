const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const { Op } = require('sequelize')

const config = require('../../server/config/config')
const models = require('../../server/models')
const pollForAdditionalPaymentsController = require('../../server/controllers/pollForAdditionalPayments')

chai.use(sinonChai)
const { expect } = chai

describe('pollForAdditionalPayments.checkForAdditionalPayments', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('queries for queued records and exits when none found', async () => {
    const findOneStub = sinon.stub(models.AdditionalPaymentDetails, 'findOne').resolves(null)
    const updateStub = sinon.stub(models.AdditionalPaymentDetails, 'update')

    await pollForAdditionalPaymentsController.checkForAdditionalPayments()

    expect(findOneStub).to.have.been.calledOnceWith({
      where: {
        submitted: 'queued',
        submission_attempts: {
          [Op.lte]: config.maxRetryAttempts,
        },
      },
      order: models.sequelize.random(),
    })
    expect(updateStub).to.not.have.been.called
  })

  it('handles errors in eligibility lookup without throwing', async () => {
    const expectedError = new Error('database unavailable')
    sinon.stub(models.AdditionalPaymentDetails, 'findOne').rejects(expectedError)
    const consoleErrorStub = sinon.stub(console, 'error')

    await pollForAdditionalPaymentsController.checkForAdditionalPayments()

    expect(consoleErrorStub).to.have.been.calledOnceWith(expectedError)
  })
})
