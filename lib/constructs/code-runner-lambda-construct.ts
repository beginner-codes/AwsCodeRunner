import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

interface CodeRunnerLambdaConstructProps {
    readonly createUserForInvoke: boolean;
    readonly createAccessKeyForUser: boolean;
    readonly functionName: string;
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
            functionName: props.functionName
          });

        if (props.createUserForInvoke) {
            const invokeUser = new iam.User(this, "InvocationUser");
            lambdaResource.grantInvoke(invokeUser);

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