#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SalesIntelligenceStack } from '../../src/stacks/sales-intelligence-stack';

const app = new cdk.App();

new SalesIntelligenceStack(app, 'SalesIntelligenceStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
}); 