import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import {getEnvironment} from '../src/environment';

export class Slack2NotionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const contextEnv = this.node.tryGetContext('environments');
    const env = getEnvironment(contextEnv);

    const parameter = ssm.StringParameter.fromStringParameterName(
      this, 'Parameter', env.get('SLACK2NOTION_PARAMETER_STORE_ID')
    );

    const fun = new lambdaNodeJs.NodejsFunction(this, 'PostToNotionFunction', {
      entry: './src/index.ts',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        target: 'es2020',
        logLevel: lambdaNodeJs.LogLevel.INFO,
        minify: true,
        sourceMap: false,
        sourcesContent: false,
        externalModules: ['@aws-sdk/*'],
        preCompilation: false,
      },
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: env.clean()
    });

    const invokeFun = new lambdaNodeJs.NodejsFunction(this, 'InvokeOnlyFunction', {
      entry: './src/invoke.ts',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      bundling: {
        target: 'es2020',
        logLevel: lambdaNodeJs.LogLevel.INFO,
        minify: true,
        sourceMap: false,
        sourcesContent: false,
        externalModules: ['*'],
        preCompilation: false,
      },
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        TARGET_FUNCTION_NAME: fun.functionName
      }
    });

    // Enable access to ParameterStore
    parameter.grantRead(fun);

    // Enable to invoke Lambda
    fun.grantInvoke(invokeFun);

    // Enable Lambda Function URL
    invokeFun.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.BUFFERED,
    });
  }
}
