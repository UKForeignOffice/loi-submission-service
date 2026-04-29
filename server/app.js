import bodyParser from 'body-parser'
import express from 'express'
import { config } from './config/config.js'
import { checkForApplications } from './controllers/pollForAdditionalPaymentsController.js'
import { checkForAdditionalPayments } from './controllers/pollForApplicationsController.js'

// Create our Express application
const app = express()

app.set('showStackError', true)

app.use(bodyParser.json({ limit: '50mb' }))
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
)

setInterval(() => checkForApplications(), config.pollInterval)
setInterval(() => checkForAdditionalPayments(), config.pollInterval)

export { app }
