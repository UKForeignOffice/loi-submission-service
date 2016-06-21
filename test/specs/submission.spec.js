//set node environment variables

var rabbit = require('amqplib/callback_api');
var Sequelize = require('sequelize');
var sequelize = new Sequelize(config.db);
var Application = sequelize.import("../../server/models/application");
var SubmissionAttempts = sequelize.import("../../server/models/submissionAttempts");
var queueLocation = config.rabbitMQ.queueLocation;
var cp = require('child_process');
var appId = '2482';
describe('Work with Successful Submissions', function () {
    before(function (done) {
        var responseBody = {
            "applicationReference": 509196451,
            "caseReference": "BPkiDPb"
        };

        var resp = {
            "statusCode": 200
        };
        sinon
            .stub(request, 'post')
            .yields(null, resp, responseBody);
        done();
    });

    after(function (done) {
        request.post.restore();
        done();
    });
    it('processes an application when correct key put on rabbitMQ', function (done) {

        rabbit.connect(queueLocation, function (err, conn) {
            if (err) return done(err);
            conn.createChannel(function (err, ch) {
                var exchangeName = config.rabbitMQ.exchangeName;
                var queueName = config.rabbitMQ.queueName;
                ch.assertQueue(queueName, {
                    durable: true
                }, function (err, ok) {
                    ch.publish(exchangeName, queueName, new Buffer(appId));
                    //give some time for the queue to be processed
                    setTimeout(function () {

                        //expect status to be submitted
                        Application.findOne(
                            {
                                where: {
                                    application_id: appId
                                }
                            }
                        ).then(function (results) {
                            expect(results.dataValues.submitted).to.equal('submitted');
                            expect(results.dataValues.application_reference).to.equal('509196451');
                            expect(results.dataValues.case_reference).to.equal('BPkiDPb');
                            done();
                        }).catch(function (error) {
                            done(error);
                        });

                    }, 5000);
                });
            });
        });
    });


});
describe('Work with Failed Submissions', function () {
    before(function (done) {
        var psqlRestore = "PGPASSWORD=" + config.pgpassword + " psql -U postgres -f test/files/FCO_LOI_Service_Test.sql";
        cp.exec(psqlRestore, function (err, stdout, stderr) {
            if (stderr) {
                console.log(stderr);
            }
            //simulate server error
            var resp = {
                "statusCode": 500
            };
            sinon
                .stub(request, 'post')
                .yields(null, resp, null);
            done();
        });

    });

    after(function (done) {
        request.post.restore();
        done();
    });

    it('records failure and drops from the queue after max retry attempts', function (done) {

        rabbit.connect(queueLocation, function (err, conn) {
            if (err) return done(err);
            conn.createChannel(function (err, ch) {
                var exchangeName = config.rabbitMQ.exchangeName;
                var queueName = config.rabbitMQ.queueName;
                ch.assertQueue(queueName, {
                    durable: true
                }, function (err, ok) {
                    ch.publish(exchangeName, queueName, new Buffer(appId));
                    //give some time for the queue to be processed
                    setTimeout(function () {

                        //expect status to be submitted
                        Application.findOne(
                            {
                                where: {
                                    application_id: appId
                                }
                            }
                        ).then(function (results) {
                            expect(results.dataValues.submitted).to.equal('queued');
                            expect(results.dataValues.application_reference).to.equal(null);
                            expect(results.dataValues.case_reference).to.equal(null);
                            SubmissionAttempts.findAndCountAll(
                                {
                                    where: {
                                        application_id: appId
                                    }
                                }
                            ).then(function (results) {
                                expect(results.count).to.equal(config.rabbitMQ.maxRetryAttempts + 1);
                                done();
                            }).catch(function (error) {
                                done(error);
                            });
                        }).catch(function (error) {
                            done(error);
                        });

                    }, 5000);
                });
            });
        });
    });
});

describe('Behaves correctly after recovering from Failed Submissions', function () {
    before(function (done) {
        var responseBody = {
            "applicationReference": 509196451,
            "caseReference": "BPkiDPb"
        };

        var resp = {
            "statusCode": 200
        };
        sinon
            .stub(request, 'post')
            .yields(null, resp, responseBody);
        done();
    });

    after(function (done) {
        request.post.restore();
        done();
    });

    it('sends to service and stops processing', function (done) {

        rabbit.connect(queueLocation, function (err, conn) {
            if (err) return done(err);
            conn.createChannel(function (err, ch) {
                var exchangeName = config.rabbitMQ.exchangeName;
                var queueName = config.rabbitMQ.queueName;
                ch.assertQueue(queueName, {
                    durable: true
                }, function (err, ok) {
                    ch.publish(exchangeName, queueName, new Buffer(appId));
                    //give some time for the queue to be processed
                    setTimeout(function () {

                        //expect status to be submitted
                        Application.findOne(
                            {
                                where: {
                                    application_id: appId
                                }
                            }
                        ).then(function (results) {
                            expect(results.dataValues.submitted).to.equal('submitted');
                            expect(results.dataValues.application_reference).to.equal('509196451');
                            expect(results.dataValues.case_reference).to.equal('BPkiDPb');
                            SubmissionAttempts.findAndCountAll(
                                {
                                    where: {
                                        application_id: appId
                                    }
                                }
                            ).then(function (results) {
                                expect(results.count).to.equal(config.rabbitMQ.maxRetryAttempts + 2);
                                done();
                            }).catch(function (error) {
                                done(error);
                            });
                        }).catch(function (error) {
                            done(error);
                        });

                    }, 5000);
                });
            });
        });
    });
});

