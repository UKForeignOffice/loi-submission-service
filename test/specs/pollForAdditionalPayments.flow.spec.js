import axios from 'axios'
import chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import { checkForAdditionalPaymentsController } from '../../server/controllers/pollForAdditionalPaymentsController.js'
import { AdditionalPaymentDetails } from '../../server/models/index.js'

chai.use(sinonChai)
const { expect } = chai

describe('pollForAdditionalPayments flow', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('submits a queued additional payment successfully and marks it submitted', async () => {
    const paymentRecord = {
      application_id: 'APP-42',
      payment_reference: 'PAY-1',
      payment_amount: 55.5,
      submission_attempts: 2,
      submission_request: null,
    }

    const findOneStub = sinon.stub(AdditionalPaymentDetails, 'findOne')
    findOneStub.onFirstCall().resolves({ dataValues: paymentRecord })
    findOneStub.onSecondCall().resolves({ submission_request: { payment: { reference: 'PAY-1' } } })
    const updateStub = sinon.stub(AdditionalPaymentDetails, 'update').resolves([1])
    const postStub = sinon.stub(axios, 'post').resolves({ status: 200 })

    await checkForAdditionalPaymentsController.checkForAdditionalPayments()

    expect(postStub).to.have.been.calledOnce
    expect(updateStub).to.have.been.calledTwice
    expect(updateStub.firstCall.args[0]).to.include.keys('submission_request', 'updated_at')
    expect(updateStub.secondCall.args[0]).to.deep.include({
      submitted: 'submitted',
      submission_attempts: 3,
      submission_response_code: 200,
    })
  })
})
