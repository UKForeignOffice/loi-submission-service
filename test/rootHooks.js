// //Mocha root level hooks
// var cp = require('child_process');
// const server = require('../server/bin/www');
//
// before("Run Server", function (done) {
//     //restore database before each test
//     //windows will not set this NODE_ENV variable
//     //so those users must manually restore and remove the test database
//     //run this manuually before the tests:
//     //psql -U postgres -f tests/files/Drop_FCO_LOI_Service_Test.sql
//     //then
//     //psql -U postgres -f tests/files/FCO_LOI_Service_Test.sql
//     if (process.env.NODE_ENV === 'test') {
//         var psqlRestore = "PGPASSWORD=" + config.pgpassword + " psql -U postgres -f test/files/FCO_LOI_Service_Test.sql";
//         cp.exec(psqlRestore, function (err, stdout, stderr) {
//             if (stderr) {
//                 console.log(stderr);
//             }
//             //if (stdout) {
//             //    console.log(stdout);
//             //}
//             //delete server from require cache so that it really restarts beforeEach
//             delete require.cache[require.resolve('../server/bin/www')];
//             done();
//         });
//     }
//     else{
//         delete require.cache[require.resolve('../server/bin/www')];
//         done();
//     }
// });
//
// after("Close Server", function (done) {
//     server.close(done);
// });
//
// //drop the test database
// after(function (done) {
//     if (process.env.NODE_ENV === 'test') {
//         var psqlDrop = "PGPASSWORD=" + config.pgpassword + " psql -U postgres -f test/files/Drop_FCO_LOI_Service_Test.sql";
//         cp.exec(psqlDrop, function (err, stdout, stderr) {
//             if (stderr) {
//                 console.log(stderr);
//             }
//             done();
//         });
//     }
//     else{
//         done();
//     }
// });