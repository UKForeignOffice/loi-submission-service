const sinon = require('sinon');
const request = require('request');
const { expect } = require('chai');
const pollForApplications = require('../../server/controllers/pollForApplications');
const { checkForApplications, createEAppDataObject, dbModels} =
    pollForApplications;

function assertWhenPromisesResolved(assertion) {
    setTimeout(assertion);
}

describe('pollForApplications eApp specific', () => {
    const eAppData = {
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
    };
    const documentData = [
        {
            dataValues: {
                id: 1,
                application_id: 12345,
                filename: 'test.pdf',
                uploaded_url: 'https://test.com/test.pdf',
            },
        },
    ];

    describe('processElectronicApplication', () => {
        let findOneExportedData;
        let findAllUploadedDocuments;

        beforeEach(() => {
            sinon.stub(dbModels.Application, 'findOne').resolves({
                dataValues: {
                    application_id: 12345,
                    submissionAttempts: 0,
                    submitted: 'queued',
                    serviceType: 4,
                },
            });

            findOneExportedData = sinon
                .stub(dbModels.ExportedEAppData, 'findOne')
                .resolves(eAppData);

            findAllUploadedDocuments = sinon
                .stub(dbModels.UploadedDocumentUrls, 'findAll')
                .resolves(documentData);

            sinon.stub(request, 'post').callsFake(() => null);
            sinon.spy(console, 'log');
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should run electronic applicaiton process if serviceType is 4', () => {
            // when
            checkForApplications();

            // then
            assertWhenPromisesResolved(
                () =>
                    expect(console.log.calledWith('Processing electronic app'))
                        .to.be.true
            );
        });

        it('should fetch all the uploaded doc urls related to an application', () => {
            // when
            checkForApplications();

            // then
            assertWhenPromisesResolved(
                () =>
                    expect(
                        findOneExportedData.calledWith({
                            where: {
                                application_id: 12345,
                            },
                        })
                    ).to.be.true
            );
            assertWhenPromisesResolved(
                () =>
                    expect(
                        findAllUploadedDocuments.calledWith({
                            where: {
                                application_id: 12345,
                            },
                        })
                    ).to.be.true
            );
        });
    });

    describe('createEAppDataObject', () => {
        it('should fetch all the uploaded doc urls related to an application', () => {
            // when
            sinon.useFakeTimers(1628606911103);
            const dataObject = createEAppDataObject(
                eAppData.dataValues,
                documentData
            );

            // then
            const expectedResult = {
                legalisationApplication: {
                    userId: 'legalisation',
                    caseType: 'eApostille Service',
                    timestamp: '1628606911103',
                    applicant: {
                        forenames: 'John',
                        surname: 'Doe',
                        primaryTelephone: '+1-202-555-0123',
                        mobileTelephone: '',
                        eveningTelephone: '',
                        email: 'joe@example.com',
                    },
                    fields: {
                        applicationReference: 'A-D-21-0803-2027-A763',
                        documentCount: 1,
                        paymentReference: '8516279850170300',
                        paymentGateway: 'GOV_PAY',
                        paymentAmount: '30.00',
                        customerInternalReference: '',
                        feedbackConsent: false,
                        companyName: 'N/A',
                        companyRegistrationNumber: '',
                        portalCustomerId: 123,
                        additionalInformation: '',
                    },
                    documents: [
                        {
                            name: 'test.pdf',
                            downloadUrl: 'https://test.com/test.pdf',
                        },
                    ],
                },
            };

            expect(dataObject).to.deep.equal(expectedResult);
        });
    });

});
