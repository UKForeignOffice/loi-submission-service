const {Sequelize, DataTypes} = require('sequelize');

// get environment specific config
const commonConfig = require('../config/config.js');

// database options
const opts = {
    define: {
        //prevent sequelize from pluralizing table names
        freezeTableName: true
    },
    retry: {
        base: 1000,
        multiplier: 2,
        max: 5000,
    },
    logging: process.env.NODE_ENV !== 'development' ? false : console.log,
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