const {Sequelize, DataTypes} = require('sequelize');

// get environment specific config
const commonConfig = require('../config/config.js');

// database options
const opts = {
    logging: false,
    define: {
        //prevent sequelize from pluralizing table names
        freezeTableName: true
    }
};

// initialise Sequelize
const sequelize = new Sequelize(commonConfig.db, opts);

module.exports.sequelize = sequelize;
module.exports.Application = require('./application')(sequelize,DataTypes)
module.exports.ExportedApplicationData = require('./exportedApplicationData')(sequelize,DataTypes)
module.exports.SubmissionAttempts = require('./submissionAttempts')(sequelize,DataTypes)
module.exports.AdditionalPaymentDetails = require('./AdditionalPaymentDetails')(sequelize,DataTypes)
module.exports.ExportedEAppData = require('./exportedEAppData')(sequelize,DataTypes)
module.exports.UploadedDocumentUrls = require('./uploadedDocumentUrls')(sequelize,DataTypes)