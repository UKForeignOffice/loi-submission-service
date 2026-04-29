import { DataTypes, Sequelize } from 'sequelize'

// get environment specific config
import { config } from '../config/config.js'
import { AdditionalPaymentDetailsModel } from './AdditionalPaymentDetailsModel.js'
import { ApplicationModel } from './ApplicationModel.js'
import { ExportedApplicationDataModel } from './ExportedApplicationDataModel.js'
import { ExportedEAppDataModel } from './ExportedEAppDataModel.js'
import { SubmissionAttemptsModel } from './SubmissionAttemptsModel.js'
import { UploadedDocumentUrlsModel } from './UploadedDocumentUrlsModel.js'

// database options
const opts = {
  define: {
    //prevent sequelize from pluralizing table names
    freezeTableName: true,
  },
  retry: {
    base: 1000,
    multiplier: 2,
    max: 5000,
  },
  logging: false,
}

// initialise Sequelize
export const sequelize = new Sequelize(config.db, opts)

export const sequelizeInstance = sequelize
export const Application = ApplicationModel(sequelize, DataTypes)
export const ExportedApplicationData = ExportedApplicationDataModel(sequelize, DataTypes)
export const SubmissionAttempts = SubmissionAttemptsModel(sequelize, DataTypes)
export const AdditionalPaymentDetails = AdditionalPaymentDetailsModel(sequelize, DataTypes)
export const ExportedEAppData = ExportedEAppDataModel(sequelize, DataTypes)
export const UploadedDocumentUrls = UploadedDocumentUrlsModel(sequelize, DataTypes)
