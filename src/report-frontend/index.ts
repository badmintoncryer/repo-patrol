import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface ReportFrontendProps {
  readonly reportBucket: s3.IBucket;
  readonly reposTable: dynamodb.ITable;
  readonly jobHistoryTable: dynamodb.ITable;
  /** Registry Lambda function for managing repos and EventBridge schedules */
  readonly registryFunction: lambda.IFunction;

  /** Secrets Manager secret containing GitHub App credentials for installation_id auto-resolution */
  readonly githubAppSecret: secretsmanager.ISecret;

  /**
   * Whether to require MFA (TOTP) for dashboard login.
   * @default true
   */
  readonly mfaRequired?: boolean;

  /**
   * Email addresses for admin users to create in the Cognito User Pool.
   * Each user receives an invitation email from Cognito with a temporary password.
   * @default - No admin users are created
   */
  readonly adminEmails?: string[];
}

export class ReportFrontend extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: ReportFrontendProps) {
    super(scope, id);

    const mfaRequired = props.mfaRequired ?? true;

    // Cognito User Pool for dashboard authentication
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      mfa: mfaRequired ? cognito.Mfa.REQUIRED : cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      featurePlan: cognito.FeaturePlan.ESSENTIALS,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // User Pool Domain with Managed Login (replaces legacy Hosted UI)
    const domainPrefix = `repo-patrol-${cdk.Aws.ACCOUNT_ID}`;
    const userPoolDomain = this.userPool.addDomain('Domain', {
      cognitoDomain: { domainPrefix },
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });

    // User Pool Client — Amplify uses public client (no secret)
    // Dummy callback URLs are used initially to avoid circular dependency with CloudFront.
    // They are updated after deployment via AwsCustomResource.
    this.userPoolClient = this.userPool.addClient('WebappClient', {
      generateSecret: false,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: ['http://localhost/dummy'],
        logoutUrls: ['http://localhost/dummy'],
      },
    });

    // Managed Login branding (default Cognito-provided style)
    new cognito.CfnManagedLoginBranding(this, 'ManagedLoginBranding', {
      userPoolId: this.userPool.userPoolId,
      clientId: this.userPoolClient.userPoolClientId,
      useCognitoProvidedValues: true,
    });

    // Next.js Docker Lambda
    const cognitoDomain = `${domainPrefix}.auth.${cdk.Aws.REGION}.amazoncognito.com`;
    const webappFunction = new lambda.DockerImageFunction(
      this,
      'WebappFunction',
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, '../../webapp'),
          { platform: Platform.LINUX_ARM64 },
        ),
        architecture: lambda.Architecture.ARM_64,
        memorySize: 512,
        timeout: cdk.Duration.seconds(30),
        environment: {
          REPORT_BUCKET_NAME: props.reportBucket.bucketName,
          REPOS_TABLE_NAME: props.reposTable.tableName,
          JOB_HISTORY_TABLE_NAME: props.jobHistoryTable.tableName,
          USER_POOL_ID: this.userPool.userPoolId,
          USER_POOL_CLIENT_ID: this.userPoolClient.userPoolClientId,
          COGNITO_DOMAIN: cognitoDomain,
          GITHUB_APP_SECRET_NAME: props.githubAppSecret.secretName,
          REGISTRY_FUNCTION_NAME: props.registryFunction.functionName,
          AWS_LWA_INVOKE_MODE: 'response_stream',
        },
      },
    );

    // Grant permissions
    props.reportBucket.grantRead(webappFunction);
    props.reposTable.grantReadData(webappFunction);
    props.jobHistoryTable.grantReadData(webappFunction);

    // Secrets Manager read for GitHub App installation auto-resolution
    props.githubAppSecret.grantRead(webappFunction);

    // Grant invoke on Registry Lambda for schedule management
    props.registryFunction.grantInvoke(webappFunction);

    // Function URL with IAM authentication.
    // CloudFront OAC signs requests with SigV4, and Lambda@Edge adds
    // x-amz-content-sha256 header for POST body verification.
    const functionUrl = webappFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    // Lambda@Edge for SHA-256 payload signing.
    // Required for POST requests through CloudFront OAC to Lambda Function URL.
    // Without this, SigV4 signature mismatch occurs for requests with a body.
    const signPayloadFn = new cloudfront.experimental.EdgeFunction(this, 'SignPayloadFn', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline([
        "const crypto = require('crypto');",
        'exports.handler = async (event) => {',
        '  const request = event.Records[0].cf.request;',
        "  const body = request.body?.data ?? '';",
        "  request.headers['x-amz-content-sha256'] = [{",
        "    key: 'x-amz-content-sha256',",
        "    value: crypto.createHash('sha256').update(Buffer.from(body, 'base64')).digest('hex')",
        '  }];',
        '  return request;',
        '};',
      ].join('\n')),
    });

    // CloudFront Distribution with OAC + Lambda@Edge
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.FunctionUrlOrigin.withOriginAccessControl(functionUrl),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        edgeLambdas: [
          {
            functionVersion: signPayloadFn.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            includeBody: true,
          },
        ],
      },
    });

    const cloudFrontUrl = `https://${this.distribution.distributionDomainName}`;

    // SSM Parameter to store CloudFront domain for Amplify origin resolution.
    // Lambda reads this at runtime to construct OAuth callback URLs.
    const originSourceParameter = new ssm.StringParameter(this, 'OriginSourceParameter', {
      stringValue: 'dummy',
    });
    originSourceParameter.grantRead(webappFunction);
    webappFunction.addEnvironment('AMPLIFY_APP_ORIGIN_SSM_PARAMETER', originSourceParameter.parameterName);

    // Update SSM parameter with actual CloudFront URL after deployment
    new cr.AwsCustomResource(this, 'UpdateOriginSourceParameter', {
      onUpdate: {
        service: 'ssm',
        action: 'putParameter',
        parameters: {
          Name: originSourceParameter.parameterName,
          Value: cloudFrontUrl,
          Overwrite: true,
        },
        physicalResourceId: cr.PhysicalResourceId.of(originSourceParameter.parameterName),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [originSourceParameter.parameterArn],
      }),
    });

    // Update Cognito callback URLs with actual CloudFront domain after deployment.
    // This resolves the circular dependency: CloudFront → Lambda → needs CloudFront URL.
    new cr.AwsCustomResource(this, 'UpdateCallbackUrls', {
      onUpdate: {
        service: '@aws-sdk/client-cognito-identity-provider',
        action: 'updateUserPoolClient',
        parameters: {
          ClientId: this.userPoolClient.userPoolClientId,
          UserPoolId: this.userPool.userPoolId,
          AllowedOAuthFlows: ['code'],
          AllowedOAuthFlowsUserPoolClient: true,
          AllowedOAuthScopes: ['profile', 'email', 'openid'],
          ExplicitAuthFlows: ['ALLOW_USER_SRP_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
          CallbackURLs: [`${cloudFrontUrl}/api/auth/sign-in-callback`],
          LogoutURLs: [`${cloudFrontUrl}/api/auth/sign-out-callback`],
          SupportedIdentityProviders: ['COGNITO'],
        },
        physicalResourceId: cr.PhysicalResourceId.of(this.userPool.userPoolId),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [this.userPool.userPoolArn],
      }),
    });

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: cloudFrontUrl,
      description: 'Dashboard URL',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: `https://${userPoolDomain.domainName}.auth.${cdk.Aws.REGION}.amazoncognito.com`,
      description: 'Cognito Domain URL',
    });

    // Seed admin users via Custom Resource
    if (props.adminEmails && props.adminEmails.length > 0) {
      const sortedEmails = [...props.adminEmails].sort();

      const adminUserSeederFn = new nodejs.NodejsFunction(
        this,
        'AdminUserSeederFunction',
        {
          runtime: lambda.Runtime.NODEJS_22_X,
          architecture: lambda.Architecture.ARM_64,
          handler: 'handler',
          entry: path.join(__dirname, '../handlers/admin-user-seeder.ts'),
          timeout: cdk.Duration.minutes(2),
          memorySize: 256,
          bundling: {
            minify: true,
            sourceMap: true,
          },
        },
      );

      adminUserSeederFn.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            'cognito-idp:AdminCreateUser',
            'cognito-idp:AdminDeleteUser',
          ],
          resources: [this.userPool.userPoolArn],
        }),
      );

      const adminUserProvider = new cr.Provider(
        this,
        'AdminUserSeederProvider',
        { onEventHandler: adminUserSeederFn },
      );

      new cdk.CustomResource(this, 'AdminUserSeeder', {
        serviceToken: adminUserProvider.serviceToken,
        properties: {
          UserPoolId: this.userPool.userPoolId,
          Emails: JSON.stringify(sortedEmails),
        },
      });

      new cdk.CfnOutput(this, 'AdminEmails', {
        value: sortedEmails.join(', '),
        description: 'Admin user email addresses',
      });
    }
  }
}
