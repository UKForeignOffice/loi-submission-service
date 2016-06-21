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
            }
            //"createdAt": {
            //    type: DataTypes.DATE,
            //    field: "created_at"
            //},
            //"updatedAt": {
            //    type: DataTypes.DATE,
            //    field: "updated_at"
            //}
        },
        {tableName: 'ExportedApplicationData'}
    );
};

/*
module.exports = {
    modelName: "public.exportedApplicationData",
    options: {
        tableName: "ExportedApplicationData",
        schema: "public",
        timestamps: false
    },
    attributes: {
        "applicationId": {
            type: Seq.INTEGER,
            field: "application_id"
        },
        "applicationType": {
            type: Seq.TEXT,
            field: "applicationType"
        },
        "firstName": {
            type: Seq.STRING(255),
            field: "first_name"
        },
        "lastName": {
            type: Seq.STRING(255),
            field: "last_name"
        },
        "telephone": {
            type: Seq.STRING(12),
            field: "telephone",
            comment: "\n"
        },
        "email": {
            type: Seq.STRING(255),
            field: "email"
        },
        "docCount": {
            type: Seq.INTEGER,
            field: "doc_count"
        },
        "specialInstructions": {
            type: Seq.TEXT,
            field: "special_instructions"
        },
        "userRef": {
            type: Seq.TEXT,
            field: "user_ref"
        },
        "postageReturnTitle": {
            type: Seq.TEXT,
            field: "postage_return_title"
        },
        "postageReturnPrice": {
            type: Seq.DECIMAL,
            field: "postage_return_price"
        },
        "postageSendTitle": {
            type: Seq.TEXT,
            field: "postage_send_title"
        },
        "postageSendPrice": {
            type: Seq.DECIMAL,
            field: "postage_send_price"
        },
        "mainAddressLine1": {
            type: Seq.TEXT,
            field: "main_address_line1"
        },
        "mainAddressLine2": {
            type: Seq.TEXT,
            field: "main_address_line2"
        },
        "mainAddressLine3": {
            type: Seq.TEXT,
            field: "main_address_line3"
        },
        "mainTown": {
            type: Seq.TEXT,
            field: "main_town"
        },
        "mainCounty": {
            type: Seq.TEXT,
            field: "main_county"
        },
        "mainCountry": {
            type: Seq.TEXT,
            field: "main_country"
        },
        "mainFullName": {
            type: Seq.TEXT,
            field: "main_full_name"
        },
        "altAddressLine1": {
            type: Seq.TEXT,
            field: "alt_address_line1"
        },
        "altAddressLine2": {
            type: Seq.TEXT,
            field: "alt_address_line2"
        },
        "altAddressLine3": {
            type: Seq.TEXT,
            field: "alt_address_line3"
        },
        "altTown": {
            type: Seq.TEXT,
            field: "alt_town"
        },
        "altCounty": {
            type: Seq.TEXT,
            field: "alt_county"
        },
        "altCountry": {
            type: Seq.TEXT,
            field: "alt_country"
        },
        "altFullName": {
            type: Seq.TEXT,
            field: "alt_full_name"
        },
        "feedbackConsent": {
            type: Seq.BOOLEAN,
            field: "feedback_consent"
        },
        "totalDocsCountPrice": {
            type: Seq.DECIMAL,
            field: "total_docs_count_price"
        }
    },
    relations: []
};
*/