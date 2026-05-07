import axios from 'axios'
import NodeCache from 'node-cache'
import { config } from '../config/config.js'
import { logger } from '../config/logs.js'

const cache = new NodeCache({ stdTTL: 3000 })

export const HelperService = {
  /**
   * Get EDMS access token, with optional injected axios instance for testability.
   * @param {object} [opts]
   * @param {Function} [opts.axiosInstance] - Optional axios instance to use (for testing)
   */
  async getEdmsAccessToken(opts = {}) {
    const axiosToUse = opts.axiosInstance || axios
    const cacheKey = 'access_token'
    const cachedToken = cache.get(cacheKey)

    if (cachedToken) {
      logger.info('Returning access token from cache')
      return cachedToken
    }

    try {
      const cognito_app_client_id = config.edmsBearerToken.cognito_app_client_id
      const cognito_app_client_secret = config.edmsBearerToken.cognito_app_client_secret
      const token = Buffer.from(`${cognito_app_client_id}:${cognito_app_client_secret}`).toString('base64')

      const response = await axiosToUse({
        method: 'POST',
        url: config.edmsAuthHost,
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: `grant_type=client_credentials&scope=${config.edmsAuthScope}`,
      })

      const { access_token } = response.data
      cache.set(cacheKey, access_token)
      logger.info('Returning access token from EDMS')
      return access_token
    } catch (error) {
      logger.error('Error fetching access token from EDMS:', error)
    }
  },
}
