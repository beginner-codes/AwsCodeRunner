import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as AwsCodeRunner from '../lib/aws-code-runner-stack';

test('CodeRunnerStack matches snapshot', () => {
  const app = new cdk.App();
  const stack = new AwsCodeRunner.AwsCodeRunnerStack(app, 'MyTestStack');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot()
});
