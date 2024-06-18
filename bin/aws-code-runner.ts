#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsCodeRunnerStack } from '../lib/aws-code-runner-stack';

const app = new cdk.App();
new AwsCodeRunnerStack(app, 'AwsCodeRunnerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});