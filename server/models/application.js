module.exports = function(sequelize, DataTypes) {
    return sequelize.define('Application',
        {
            application_id: {
                type: DataTypes.INTEGER,
                primaryKey: true
            },
            submitted: {
                type: DataTypes.STRING()
            },
            serviceType: {
                type: DataTypes.INTEGER()
            },
            unique_app_id: {
                type: DataTypes.STRING()
            },
            case_reference: {
                type: DataTypes.STRING()
            },
            submissionAttempts: {
                type: DataTypes.INTEGER()
            },
            submission_destination: {
                type: DataTypes.STRING()
            },
            application_reference: {
                type: DataTypes.STRING()
            },
        },
        {tableName: 'Application'}
    );
};
