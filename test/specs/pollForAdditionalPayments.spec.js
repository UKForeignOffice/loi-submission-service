import chai from 'chai'
import { Op } from 'sequelize'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import { config } from '../../server/config/config.js'
import { logger } from '../../server/config/logs.js'
import { checkForAdditionalPaymentsController } from '../../server/controllers/pollForAdditionalPaymentsController.js'
import { AdditionalPaymentDetails, sequelize } from '../../server/models/index.js'

chai.use(sinonChai)
const { expect } = chai
const { checkForAdditionalPayments } = checkForAdditionalPaymentsController

describe('pollForAdditionalPaymentsController.checkForAdditionalPayments', () => {
  let loggerErrorStub

  beforeEach(() => {
    loggerErrorStub = sinon.stub(logger, 'error')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('queries for queued records and exits when none found', async () => {
    const findOneStub = sinon.stub(AdditionalPaymentDetails, 'findOne').resolves(null)
    const updateStub = sinon.stub(AdditionalPaymentDetails, 'update')

    await checkForAdditionalPayments()

    expect(findOneStub).to.have.been.calledOnceWith({
      where: {
        submitted: 'queued',
        submission_attempts: {
          [Op.lte]: config.maxRetryAttempts,
        },
      },
      order: sequelize.random(),
    })
    expect(updateStub).to.not.have.been.called
  })

  it('handles errors in eligibility lookup without throwing', async () => {
    const expectedError = new Error('database unavailable')
    sinon.stub(AdditionalPaymentDetails, 'findOne').rejects(expectedError)

    await checkForAdditionalPayments()

    expect(loggerErrorStub).to.have.been.calledOnceWith(expectedError)
  })
})
