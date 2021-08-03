const pollForApplications = require('../../server/controllers/pollForApplications');
const { checkForApplications, dbModels } = pollForApplications;

function assertWhenPromisesResolved(assertion) {
    setTimeout(assertion);
}

describe('pollForApplications eApp specific', () => {
    beforeEach(() => {
        sinon.spy(console, 'log');
    });

    afterEach(() => {
        sinon.restore();
    });

    it.only('should run electronic applicaiton process if serviceType is 4', () => {
        // when
        sinon.stub(dbModels.Application, 'findOne').resolves({
            dataValues: {
                application_id: 12345,
                submissionAttempts: 0,
                submitted: 'queued',
                serviceType: 4,
            },
        });

        sinon.stub(dbModels.ExportedEAppData, 'findOne').resolves({
            dataValues: {
                id: 1,
                application_id: 12345,
                applicationType: 'eApostille Service',
                first_name: 'John',
                last_name: 'Doe',
                telephone: '+1-202-555-0123',
                mobileNo: null,
                email: 'joe@example.com',
                doc_count: 1,
                user_ref: '',
                payment_reference: '8516279850170300',
                payment_amount: '30.00',
                feedback_consent: false,
                unique_app_id: 'A-D-21-0803-2027-A763',
                user_id: 123,
                company_name: 'N/A',
                createdAt: '2021-08-03',
            },
        });

        sinon.stub(dbModels.UploadedDocumentUrls, 'findAll').resolves([
            {
                dataValues: {
                    id: 1,
                    application_id: 12345,
                    filename: 'test.pdf',
                    uploaded_url: 'https://test.com/test.pdf',
                },
            },
        ]);

        sinon.stub(request, 'post').callsFake(() => null);

        checkForApplications();

        // then
        assertWhenPromisesResolved(
            () =>
                expect(console.log.calledWith('Processing electronic app')).to
                    .be.true
        );
    });
});
