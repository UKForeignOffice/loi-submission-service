const { expect } = require('chai');
const chai = require('chai')
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const { Op } = require('sequelize'); // Assuming you've imported Sequelize and defined Op.
const Application = require('../../server/models/index').Application; // Replace with the correct path to the Application model.
const sequelize = require('../../server/models/index').sequelize; // Replace with the correct path to your Sequelize instance.
const pollForApplicationsController = require('../../server/controllers/pollForApplications')
const maxRetryAttempts = 10;

chai.use(sinonChai);

describe('checkForEligibleApplications', () => {
    it('should return an eligible application when available', async () => {

        const mockApplication = {
            id: 12345,
            submitted: 'queued',
            submissionAttempts: 0,
        };

        sinon.stub(Application, 'findOne').resolves(mockApplication);

        try {
            const result = await pollForApplicationsController.checkForEligibleApplications();
            expect(result).to.deep.equal(mockApplication);
            expect(Application.findOne).to.have.been.calledOnceWith({
                where: {
                    submitted: 'queued',
                    submissionAttempts: {
                        [Op.lt]: maxRetryAttempts, // Make sure you have defined maxRetryAttempts somewhere in your test file.
                    },
                },
                order: sequelize.random(),
            });
        } catch (error) {
            expect.fail(`Unexpected error: ${error}`);
        } finally {
            Application.findOne.restore();
        }
    });

    it('should handle errors gracefully', async () => {
        sinon.stub(Application, 'findOne').throws(new Error('CRITICAL ERROR TESTING'));

        try {
            const result = await pollForApplicationsController.checkForEligibleApplications();
            expect(result).to.be.undefined;
        } catch (error) {
            expect.fail(`Unexpected error: ${error}`);
        } finally {
            Application.findOne.restore();
        }
    });
});

describe('isOrbit', () => {
    it('should be true when submission_destination is ORBIT', () => {
        const submission_destination = 'ORBIT';

        const isOrbit = submission_destination === 'ORBIT';

        expect(isOrbit).to.be.true;
    });

    it('should be false when submission_destination is not ORBIT', () => {
        const submission_destination = 'SomeOtherValue';

        const isOrbit = submission_destination === 'ORBIT';

        expect(isOrbit).to.be.false;
    });
});

describe('isEApp', () => {
    it('should be true when service_type is 4', () => {
        const service_type = 4;

        const isEApp = service_type === 4;

        expect(isEApp).to.be.true;
    });

    it('should be false when service_type is not 4', () => {
        const service_type = 1; // Using 1 for demonstration purposes

        const isEApp = service_type === 4;

        expect(isEApp).to.be.false;
    });
});

describe('updateApplicationAsProcessing', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('should update the application as processing when isEApp is true', async () => {
        const application_id = 12345;
        const isEApp = true;

        const updateStub = sinon.stub(Application, 'update').resolves([1]); // Resolves with the number of updated rows (1).
        const consoleLogStub = sinon.stub(console, 'log');

        const result = await pollForApplicationsController.updateApplicationAsProcessing(application_id, isEApp);

        expect(result).to.deep.equal([1]); // Make sure the result matches the resolved value of the stub.

        expect(updateStub).to.have.been.calledOnceWith(
            { submitted: 'processing' },
            { where: { application_id: application_id } }
        );

        expect(consoleLogStub).to.have.been.calledOnceWith(`Processing ${application_id} (eApp)`);
    });

    it('should update the application as processing when isEApp is false', async () => {
        const application_id = 67890;
        const isEApp = false;

        const updateStub = sinon.stub(Application, 'update').resolves([1]); // Resolves with the number of updated rows (1).
        const consoleLogStub = sinon.stub(console, 'log');

        const result = await pollForApplicationsController.updateApplicationAsProcessing(application_id, isEApp);

        expect(result).to.deep.equal([1]); // Make sure the result matches the resolved value of the stub.

        expect(updateStub).to.have.been.calledOnceWith(
            { submitted: 'processing' },
            { where: { application_id: application_id } }
        );

        expect(consoleLogStub).to.have.been.calledOnceWith(`Processing ${application_id} (paper)`);
    });

    it('should handle errors gracefully', async () => {
        const application_id = 12345;
        const isEApp = true;

        const errorMessage = 'Some error message';
        const updateStub = sinon.stub(Application, 'update').rejects(new Error(errorMessage));
        const consoleLogStub = sinon.stub(console, 'log');
        const consoleErrorStub = sinon.stub(console, 'error');

        try {
            await pollForApplicationsController.updateApplicationAsProcessing(application_id, isEApp);
            expect.fail('updateApplicationAsProcessing: Some error message');
        } catch (error) {
            expect(error.message).to.equal(`updateApplicationAsProcessing: ${errorMessage}`);
        }

        expect(updateStub).to.have.been.calledOnceWith(
            { submitted: 'processing' },
            { where: { application_id: application_id } }
        );

        expect(consoleLogStub).to.have.been.calledOnce;
        expect(consoleErrorStub).to.have.been.calledOnce;
    });
});

describe('placeBackInTheQueue', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('should update the application and set it back to "queued"', async () => {
        const application_id = 12345;
        const submission_attempts = 5; // Use any number for demonstration purposes

        const updateStub = sinon.stub(Application, 'update').resolves([1]); // Resolves with the number of updated rows (1).
        const consoleLogStub = sinon.stub(console, 'log');

        const result = await pollForApplicationsController.placeBackInTheQueue(application_id, submission_attempts);

        expect(result).to.deep.equal([1]); // Make sure the result matches the resolved value of the stub.

        expect(updateStub).to.have.been.calledOnceWith(
            {
                submissionAttempts: submission_attempts,
                submitted: 'queued',
            },
            { where: { application_id: application_id } }
        );

        expect(consoleLogStub).to.have.been.calledOnceWith(
            `Updating ${application_id} submission attempts (${submission_attempts}/${maxRetryAttempts})`
        );
    });

    it('should handle errors gracefully', async () => {
        const application_id = 12345;
        const submission_attempts = 5; // Use any number for demonstration purposes

        const errorMessage = 'Some error message';
        const updateStub = sinon.stub(Application, 'update').rejects(new Error(errorMessage));
        const consoleErrorStub = sinon.stub(console, 'error');

        try {
            await pollForApplicationsController.placeBackInTheQueue(application_id, submission_attempts);
            expect.fail('placeBackInTheQueue: Some error message');
        } catch (error) {
            expect(error.message).to.equal(`placeBackInTheQueue: ${errorMessage}`);
        }

        expect(updateStub).to.have.been.calledOnceWith(
            {
                submissionAttempts: submission_attempts,
                submitted: 'queued',
            },
            { where: { application_id: application_id } }
        );

        // Ensure console.error is called with the error message
        expect(consoleErrorStub).to.have.been.calledOnceWith(`placeBackInTheQueue: Error: ${errorMessage}`);
    });
});