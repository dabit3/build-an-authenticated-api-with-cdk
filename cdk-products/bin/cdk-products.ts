#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkProductsStack } from '../lib/cdk-products-stack';

const app = new cdk.App();
new CdkProductsStack(app, 'CdkProductsStack');
