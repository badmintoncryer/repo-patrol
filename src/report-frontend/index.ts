import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface ReportFrontendProps {
  readonly reportBucket: s3.IBucket;
  readonly reposTable: dynamodb.ITable;
  readonly jobHistoryTable: dynamodb.ITable;
  readonly registryFunctionUrl?: string;

  /**
   * Whether to require MFA (TOTP) for dashboard login.
   * @default true
   */
  readonly mfaRequired?: boolean;
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
      userPoolName: 'repo-patrol-users',
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
      advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // User Pool Domain for hosted UI
    const userPoolDomain = this.userPool.addDomain('Domain', {
      cognitoDomain: {
        domainPrefix: `repo-patrol-${cdk.Aws.ACCOUNT_ID}`,
      },
    });

    // Next.js Docker Lambda
    const webappFunction = new lambda.DockerImageFunction(
      this,
      'WebappFunction',
      {
        functionName: 'repo-patrol-webapp',
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
          COGNITO_USER_POOL_ID: this.userPool.userPoolId,
          COGNITO_ISSUER: `https://cognito-idp.${cdk.Aws.REGION}.amazonaws.com/${this.userPool.userPoolId}`,
          AWS_LWA_INVOKE_MODE: 'response_stream',
        },
      },
    );

    // Grant permissions
    props.reportBucket.grantRead(webappFunction);
    props.reposTable.grantReadWriteData(webappFunction);
    props.jobHistoryTable.grantReadData(webappFunction);

    // Function URL
    const functionUrl = webappFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    // User Pool Client (created after we know the CloudFront URL)
    this.userPoolClient = this.userPool.addClient('WebappClient', {
      userPoolClientName: 'repo-patrol-webapp',
      generateSecret: true,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        // Callback URLs will be updated after CloudFront distribution is created
        callbackUrls: ['http://localhost:3000/api/auth/callback/cognito'],
        logoutUrls: ['http://localhost:3000'],
      },
    });

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.FunctionUrlOrigin(functionUrl),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
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
  }
}
