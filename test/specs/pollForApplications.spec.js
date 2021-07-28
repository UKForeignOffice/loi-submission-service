var Sequelize = require('sequelize');
var sequelize = new Sequelize(config.db);
const Application = sequelize.import('../../server/models/application');

const pollForApplicationsController = require('../../server/controllers/pollForApplications');

function assertWhenPromisesResolved(assertion) {
    setTimeout(assertion, 100);
}

describe('pollForApplications eApp specific', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        sandbox.spy(console, 'log');
    });

    afterEach(() => {
        sandbox.restore();
    });

    it.only('should run electronic applicaiton process if serviceType is 4', () => {
        // when
        sandbox.stub(Application, 'findOne').returns(
            Promise.resolve({
                dataValues: {
                    application_id: 12345,
                    submissionAttempts: 0,
                    submitted: 'queued',
                    serviceType: 4,
                },
            })
        );
        pollForApplicationsController.checkForApplications();

        // then
        assertWhenPromisesResolved(
            () =>
                expect(console.log.calledWith('Processing electronic app')).to
                    .be.true
        );
    });
});
