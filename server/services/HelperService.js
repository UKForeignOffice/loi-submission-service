const config = require("../config/config");
const axios = require("axios")
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3000 });

const HelperService = {

    getEdmsAccessToken: async function getEdmsAccessToken() {
        const cacheKey = 'access_token';
        const cachedToken = cache.get(cacheKey);

        if (cachedToken) {
            console.log('Returning access token from cache');
            // TODO: REMOVE THIS AFTER UAT
            console.log(cachedToken);
            return cachedToken;
        }

        try {
            const cognito_app_client_id = config.edmsBearerToken['cognito_app_client_id'];
            const cognito_app_client_secret = config.edmsBearerToken['cognito_app_client_secret'];
            const token = Buffer.from(`${cognito_app_client_id}:${cognito_app_client_secret}`).toString('base64');

            const response = await axios({
                method: 'POST',
                url: config.edmsAuthHost,
                headers: {
                    'Authorization': `Basic ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: `grant_type=client_credentials&scope=${config.edmsAuthScope}`
            });

            const { access_token } = response.data;
            cache.set(cacheKey, access_token);
            console.log('Returning access token from EDMS');
            // TODO: REMOVE THIS AFTER UAT
            console.log(access_token);
            return access_token;
        } catch (error) {
            console.error('Error fetching access token from EDMS:', error);
        }
    },

};

module.exports = HelperService;