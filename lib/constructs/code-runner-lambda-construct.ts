import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Duration } from 'aws-cdk-lib';
import { Architecture } from 'aws-cdk-lib/aws-lambda';

interface CodeRunnerLambdaConstructProps {
    readonly createUserForInvoke: boolean;
    readonly createAccessKeyForUser: boolean;
    readonly functionName: string;

     // if we should create a VPC and block outbound calls from lambda, defaults to true
    readonly limitInternetAccess?: boolean;
    // any options for the :live alias (like provisioned concurrency, etc)
    readonly aliasOptions?: lambda.AliasOptions;
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
            handler: 'main.lambda_handler',
            functionName: props.functionName,
            timeout: Duration.seconds(3),
            memorySize: 128, 
            architecture: Architecture.ARM_64,
            vpc: this.shouldLimitInternetAccess(props) ? new Vpc(this, 'CodeRunnerLambdaVpc') : undefined,
            allowAllOutbound: this.shouldLimitInternetAccess(props) ? false : undefined
          });

          const alias = lambdaResource.addAlias("live", props.aliasOptions);

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
    
    private shouldLimitInternetAccess(props: CodeRunnerLambdaConstructProps): boolean {
        return (props.limitInternetAccess || props.limitInternetAccess === undefined);
    }

    private computeLambdaHash(): string {
        const lambdaContents = readFileSync(resolve(__dirname, "../../lambda/main.py"), 'utf-8');
        return createHash('sha256')
            .update(lambdaContents)
            .digest('hex');
    }
}