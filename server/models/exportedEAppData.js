module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        'ExportedEAppData',
        {
            application_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
            },
            applicationType: {
                type: DataTypes.TEXT,
            },
            first_name: {
                type: DataTypes.STRING(255),
            },
            last_name: {
                type: DataTypes.STRING(255),
            },
            telephone: {
                type: DataTypes.STRING(12),
            },
            email: {
                type: DataTypes.STRING(255),
            },
            doc_count: {
                type: DataTypes.INTEGER,
            },
            user_ref: {
                type: DataTypes.TEXT,
            },
            payment_reference: {
                type: DataTypes.TEXT,
            },
            payment_amount: {
                type: DataTypes.DECIMAL,
            },
            feedback_consent: {
                type: DataTypes.BOOLEAN,
            },
            unique_app_id: {
                type: DataTypes.TEXT,
            },
            user_id: {
                type: DataTypes.INTEGER,
            },
            company_name: {
                type: DataTypes.TEXT,
            },
        },
        { tableName: 'ExportedEAppData' }
    );
};
