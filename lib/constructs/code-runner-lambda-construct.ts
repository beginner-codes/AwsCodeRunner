import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Duration } from 'aws-cdk-lib';

interface CodeRunnerLambdaConstructProps {
    readonly createUserForInvoke: boolean;
    readonly createAccessKeyForUser: boolean;
    readonly functionName: string;

     // if we should create a VPC and block outbound calls from lambda, defaults to true
    readonly limitInternetAccess?: boolean;
}

export class CodeRunnerLambdaConstruct extends Construct {
    constructor(scope: Construct, id: string, props: CodeRunnerLambdaConstructProps) {
        super(scope, id);

        const lambdaResource = new lambda.Function(this, 'CodeRunnerLambda', {
            runtime: lambda.Runtime.PYTHON_3_12, 
            code: lambda.Code.fromAsset('lambda'),
            // set description as code hash to force changeset diff and 
            //  lambda deploy when code has changed
            description: this.computeLambdaHash(),
            handler: 'main.run',
            functionName: props.functionName,
            timeout: Duration.seconds(3),
            memorySize: 128, 
            vpc: (props.limitInternetAccess || props.limitInternetAccess === undefined) ? new Vpc(this, 'CodeRunnerLambdaVpc') : undefined
          });

          const alias = lambdaResource.addAlias("live", {
            provisionedConcurrentExecutions: 1
          });
          

        if (props.createUserForInvoke) {
            const invokeUser = new iam.User(this, "InvocationUser");
            alias.grantInvoke(invokeUser);

            if (props.createAccessKeyForUser) {
                const accessKey = new iam.AccessKey(this, `${props.functionName}AccessKey`, { 
                    user: invokeUser 
                });

                const accessKeySecret = new secretsmanager.Secret(this, 'AccessKeySecret', {
                    secretName: `CodeRunnerInvocationAccessKeyId${accessKey.accessKeyId}`,
                    secretStringValue: accessKey.secretAccessKey,
                });
            }
        }
    }

    private computeLambdaHash(): string {
        const lambdaContents = readFileSync(resolve(__dirname, "../../lambda/main.py"), 'utf-8');
        return createHash('sha256')
            .update(lambdaContents)
            .digest('hex');
    }
}