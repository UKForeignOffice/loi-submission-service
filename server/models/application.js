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
            application_reference: {
                type: DataTypes.STRING()
            },
            case_reference: {
                type: DataTypes.STRING()
            }
        },
        {tableName: 'Application'}
    );
};
