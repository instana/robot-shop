'use strict'

const process = require('process');
const opentelemetry = require('@opentelemetry/sdk-node');
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { ExpressInstrumentation, ExpressRequestInfo } = require('@opentelemetry/instrumentation-express');

const traceExporter = new OTLPTraceExporter()

const sdk = new opentelemetry.NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'cart',
  }),
  traceExporter: traceExporter,
  instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()]
});

// initialize the SDK and register with the OpenTelemetry API
// this enables the API to record telemetry
sdk.start()
  .then(() => console.log('Tracing initialized'))
  .catch((error) => console.log('Error initializing tracing', error));

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});