#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SalesIntelligenceStack } from '../../src/stacks/SalesIntelligenceStack';

const app = new cdk.App();
new SalesIntelligenceStack(app, 'SalesIntelligenceStack', {}); 