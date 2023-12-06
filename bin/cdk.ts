#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {Slack2NotionStack} from '../lib/slack2notion-stack';

const app = new cdk.App();
new Slack2NotionStack(app, 'Slack2NotionStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
