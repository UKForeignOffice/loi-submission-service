import { config as dotenv } from 'dotenv'
import { bearerToken } from './edms.js'

dotenv()

const additionalPaymentApiUrl = process.env.ADDITIONALPAYMENTAPIURL
const dbConn = process.env.DBCONN || 'postgres://postgres:password@localhost:5432/FCO-LOI-Service'
const edmsAuthHost = process.env.EDMS_AUTH_HOST
const edmsAuthScope = process.env.EDMS_AUTH_SCOPE
const edmsBearerToken = {
  ...bearerToken,
  ...(process.env.EDMS_BEARER_TOKEN ? JSON.parse(process.env.EDMS_BEARER_TOKEN) : {}),
}
const edmsHost = process.env.EDMS_HOST
const maxRetryAttempts = process.env.MAXRETRYATTEMPTS || 10
const pollInterval = process.env.POLLINTERVAL
const submissionApiUrl = process.env.SUBMISSIONAPIURL
const nodeEnv = process.env.NODE_ENV || 'production'
const s3Bucket = process.env.S3_BUCKET

export const config = {
  additionalPaymentApiUrl,
  db: dbConn,
  edmsBearerToken,
  edmsHost,
  edmsAuthHost,
  edmsAuthScope,
  maxRetryAttempts,
  pollInterval,
  submissionApiUrl,
  nodeEnv,
  s3Bucket,
}
