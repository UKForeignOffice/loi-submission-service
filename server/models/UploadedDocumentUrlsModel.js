export const UploadedDocumentUrlsModel = (sequelize, DataTypes) =>
  sequelize.define(
    'UploadedDocumentUrls',
    {
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      filename: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      uploaded_url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      presigned_url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    { tableName: 'UploadedDocumentUrls' },
  )
