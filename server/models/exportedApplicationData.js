module.exports = function(sequelize, DataTypes) {
    return sequelize.define('ExportedApplicationData',
        {
            application_id: {
                type: DataTypes.INTEGER,
                primaryKey: true
            },
            "applicationType": {
                type: DataTypes.TEXT
            },
            "first_name": {
                type: DataTypes.STRING(255)
            },
            "last_name": {
                type: DataTypes.STRING(255)
            },
            "telephone": {
                type: DataTypes.STRING(12)
            },
            "email": {
                type: DataTypes.STRING(255)
            },
            "doc_count": {
                type: DataTypes.INTEGER
            },
            "special_instructions": {
                type: DataTypes.TEXT
            },
            "user_ref": {
                type: DataTypes.TEXT
            },
            "payment_reference": {
                type: DataTypes.TEXT
            },
            "payment_amount": {
                type: DataTypes.DECIMAL
            },
            "postage_return_title": {
                type: DataTypes.TEXT
            },
            "postage_return_price": {
                type: DataTypes.DECIMAL
            },
            "postage_send_title": {
                type: DataTypes.TEXT
            },
            "postage_send_price": {
                type: DataTypes.DECIMAL
            },
            "main_house_name": {
                type: DataTypes.TEXT
            },
            "main_street": {
                type: DataTypes.TEXT
            },
            "main_town": {
                type: DataTypes.TEXT
            },
            "main_county": {
                type: DataTypes.TEXT
            },
            "main_country": {
                type: DataTypes.TEXT
            },
            "main_postcode": {
                type: DataTypes.TEXT
            },
            "main_full_name": {
                type: DataTypes.TEXT
            },
            "main_telephone": {
                type: DataTypes.TEXT
            },
            "main_email": {
                type: DataTypes.TEXT
            },
            "alt_house_name": {
                type: DataTypes.TEXT
            },
            "alt_street": {
                type: DataTypes.TEXT
            },
            "alt_town": {
                type: DataTypes.TEXT
            },
            "alt_county": {
                type: DataTypes.TEXT
            },
            "alt_country": {
                type: DataTypes.TEXT
            },
            "alt_postcode": {
                type: DataTypes.TEXT
            },
            "alt_full_name": {
                type: DataTypes.TEXT
            },
            "alt_telephone": {
                type: DataTypes.TEXT
            },
            "alt_email": {
                type: DataTypes.TEXT
            },
            "feedback_consent": {
                type: DataTypes.BOOLEAN
            },
            "total_docs_count_price": {
                type: DataTypes.DECIMAL
            },
            "unique_app_id": {
                type: DataTypes.TEXT
            },
            "submittedJSON": {
                type: DataTypes.JSON
            },
            "user_id":{
                type: DataTypes.INTEGER
            },
            "company_name":{
                type: DataTypes.TEXT
            },
            "main_organisation":{
                type: DataTypes.TEXT
            },
            "alt_organisation":{
                type: DataTypes.TEXT
            }
        },
        {tableName: 'ExportedApplicationData'}
    );
};
