import bodyParser from 'body-parser'
import express from 'express'
import { config } from './config/config.js'
import pollForAdditionalPaymentsController from './controllers/pollForAdditionalPaymentsController.js'
import pollForApplicationsController from './controllers/pollForApplicationsController.js'

// Create our Express application
const app = express()

app.set('showStackError', true)

app.use(bodyParser.json({ limit: '50mb' }))
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
)

setInterval(() => pollForApplicationsController.checkForApplications(), config.pollInterval)
setInterval(() => pollForAdditionalPaymentsController.checkForAdditionalPayments(), config.pollInterval)

export { app }
