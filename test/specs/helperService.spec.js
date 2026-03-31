const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const config = require('../../server/config/config');

chai.use(sinonChai);
const { expect } = chai;

function loadHelperService() {
    const modulePath = require.resolve('../../server/services/HelperService');
    delete require.cache[modulePath];
    return require('../../server/services/HelperService');
}

describe('HelperService.getEdmsAccessToken', () => {
    let axiosStub;
    let axiosModulePath;
    let originalAxiosExport;
    let originalConfig;

    beforeEach(() => {
        axiosModulePath = require.resolve('axios');
        require('axios');
        originalAxiosExport = require.cache[axiosModulePath].exports;
        axiosStub = sinon.stub();
        originalConfig = {
            edmsBearerToken: config.edmsBearerToken,
            edmsAuthHost: config.edmsAuthHost,
            edmsAuthScope: config.edmsAuthScope,
        };
        config.edmsBearerToken = {
            cognito_app_client_id: 'client-id',
            cognito_app_client_secret: 'client-secret',
        };
        config.edmsAuthHost = 'https://example.org/token';
        config.edmsAuthScope = 'submission:write';
    });

    afterEach(() => {
        sinon.restore();
        require.cache[axiosModulePath].exports = originalAxiosExport;
        config.edmsBearerToken = originalConfig.edmsBearerToken;
        config.edmsAuthHost = originalConfig.edmsAuthHost;
        config.edmsAuthScope = originalConfig.edmsAuthScope;
    });

    it('fetches token from EDMS then returns cached token on subsequent call', async () => {
        axiosStub.resolves({ data: { access_token: 'token-123' } });
        require.cache[axiosModulePath].exports = axiosStub;
        const helperService = loadHelperService();

        const first = await helperService.getEdmsAccessToken();
        const second = await helperService.getEdmsAccessToken();

        expect(first).to.equal('token-123');
        expect(second).to.equal('token-123');
        expect(axiosStub).to.have.been.calledOnce;
    });

    it('returns undefined and logs when EDMS request fails', async () => {
        axiosStub.rejects(new Error('network error'));
        const consoleErrorStub = sinon.stub(console, 'error');
        require.cache[axiosModulePath].exports = axiosStub;
        const helperService = loadHelperService();

        const token = await helperService.getEdmsAccessToken();

        expect(token).to.equal(undefined);
        expect(consoleErrorStub).to.have.been.calledOnce;
    });
});
