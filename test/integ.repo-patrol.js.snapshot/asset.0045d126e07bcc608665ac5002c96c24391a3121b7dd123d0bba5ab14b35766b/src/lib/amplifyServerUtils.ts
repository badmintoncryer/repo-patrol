import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

// At runtime on Lambda, fetch CloudFront domain from SSM Parameter Store.
// During build time, AMPLIFY_APP_ORIGIN_SSM_PARAMETER is not set,
// so we fall back to a placeholder origin that is overridden at runtime.
if (process.env.AMPLIFY_APP_ORIGIN_SSM_PARAMETER) {
  const ssm = new SSMClient({});
  try {
    const res = await ssm.send(new GetParameterCommand({ Name: process.env.AMPLIFY_APP_ORIGIN_SSM_PARAMETER }));
    process.env.AMPLIFY_APP_ORIGIN = res.Parameter?.Value;
  } catch (e) {
    console.log(e);
  }
}

// Build-time fallbacks: during `next build`, Lambda env vars are not available.
// These placeholders satisfy Amplify initialization; they are overridden at runtime.
if (!process.env.AMPLIFY_APP_ORIGIN) {
  process.env.AMPLIFY_APP_ORIGIN = 'http://localhost:3000';
}
if (!process.env.USER_POOL_ID) {
  process.env.USER_POOL_ID = 'build-placeholder';
}
if (!process.env.USER_POOL_CLIENT_ID) {
  process.env.USER_POOL_CLIENT_ID = 'build-placeholder';
}
if (!process.env.COGNITO_DOMAIN) {
  process.env.COGNITO_DOMAIN = 'placeholder.auth.us-east-1.amazoncognito.com';
}

export const { runWithAmplifyServerContext, createAuthRouteHandlers } = createServerRunner({
  config: {
    Auth: {
      Cognito: {
        userPoolId: process.env.USER_POOL_ID!,
        userPoolClientId: process.env.USER_POOL_CLIENT_ID!,
        loginWith: {
          oauth: {
            redirectSignIn: [`${process.env.AMPLIFY_APP_ORIGIN!}/api/auth/sign-in-callback`],
            redirectSignOut: [`${process.env.AMPLIFY_APP_ORIGIN!}/api/auth/sign-out-callback`],
            responseType: 'code',
            domain: process.env.COGNITO_DOMAIN!,
            scopes: ['profile', 'openid', 'email'],
          },
        },
      },
    },
  },
  runtimeOptions: {
    cookies: {
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
});
