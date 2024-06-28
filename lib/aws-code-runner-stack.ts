import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodeRunnerLambdaConstruct } from './constructs/code-runner-lambda-construct';

export class AwsCodeRunnerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const codeRunnerLambda = new CodeRunnerLambdaConstruct(this, 'CodeRunnerLambdaConstruct', {
      createUserForInvoke: true,
      createAccessKeyForUser: true,
      functionName: "CodeRunnerLambda",
      limitInternetAccess: true,
      aliasOptions: undefined,
    });
  }
}
