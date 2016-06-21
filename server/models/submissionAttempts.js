module.exports = function(sequelize, DataTypes) {
    return sequelize.define('SubmissionAttempts',
        {
            submission_id:  {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            application_id: {
                type: DataTypes.INTEGER
            },
            retry_number: {
                type: DataTypes.INTEGER
            },
            timestamp: {
                type: DataTypes.DATE
            },
            submitted_json: {
                type: DataTypes.JSON
            },
            status: {
                type: DataTypes.STRING()
            },
            response_status_code: {
                type: DataTypes.STRING()
            },
            response_body: {
                type: DataTypes.STRING()
            }
        },
        {tableName: 'SubmissionAttempts'}
    );
};