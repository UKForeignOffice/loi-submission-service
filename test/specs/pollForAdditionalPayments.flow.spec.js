const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const axios = require('axios');

const models = require('../../server/models');

chai.use(sinonChai);
const { expect } = chai;

const controllerPath = require.resolve('../../server/controllers/pollForAdditionalPayments');
const helperPath = require.resolve('../../server/services/HelperService');

function loadControllerWithTokenStub(getEdmsAccessToken) {
    const originalHelperExport = require(helperPath);
    require.cache[helperPath].exports = { getEdmsAccessToken };
    delete require.cache[controllerPath];
    const controller = require(controllerPath);
    return {
        controller,
        restore: () => {
            delete require.cache[controllerPath];
            require.cache[helperPath].exports = originalHelperExport;
        },
    };
}

describe('pollForAdditionalPayments flow', () => {
    afterEach(() => {
        sinon.restore();
        delete require.cache[controllerPath];
    });

    it('submits a queued additional payment successfully and marks it submitted', async () => {
        const paymentRecord = {
            application_id: 'APP-42',
            payment_reference: 'PAY-1',
            payment_amount: 55.5,
            submission_attempts: 2,
            submission_request: null,
        };

        const findOneStub = sinon.stub(models.AdditionalPaymentDetails, 'findOne');
        findOneStub.onFirstCall().resolves({ dataValues: paymentRecord });
        findOneStub.onSecondCall().resolves({ submission_request: { payment: { reference: 'PAY-1' } } });
        const updateStub = sinon.stub(models.AdditionalPaymentDetails, 'update').resolves([1]);
        const postStub = sinon.stub(axios, 'post').resolves({ status: 200 });
        const tokenStub = sinon.stub().resolves('token-123');
        const { controller, restore } = loadControllerWithTokenStub(tokenStub);

        try {
            await controller.checkForAdditionalPayments();
        } finally {
            restore();
        }

        expect(postStub).to.have.been.calledOnce;
        expect(updateStub).to.have.been.calledTwice;
        expect(updateStub.firstCall.args[0]).to.include.keys('submission_request', 'updated_at');
        expect(updateStub.secondCall.args[0]).to.deep.include({
            submitted: 'submitted',
            submission_attempts: 3,
            submission_response_code: 200,
        });
    });
});
