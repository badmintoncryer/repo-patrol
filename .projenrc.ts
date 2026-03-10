import { awscdk, javascript } from 'projen';

const project = new awscdk.AwsCdkConstructLibrary({
  name: 'repo-patrol',
  description: 'AI-powered OSS repository maintenance patrol agent as a CDK L3 Construct',
  repositoryUrl: 'https://github.com/badmintoncryer/repo-patrol.git',
  author: 'Kazuho Cryer-Shinozuka',
  authorAddress: 'malaysia.cryer@gmail.com',
  cdkVersion: '2.233.0',
  constructsVersion: '10.4.4',
  defaultReleaseBranch: 'main',
  projenrcTs: true,
  packageManager: javascript.NodePackageManager.PNPM,
  pnpmVersion: '9',
  jsiiVersion: '~5.9.0',

  stability: 'experimental',
  npmAccess: javascript.NpmAccess.PUBLIC,
  license: 'Apache-2.0',

  // Alpha CDK module — exposed to consumers as peer dependency
  peerDeps: [
    '@aws-cdk/aws-bedrock-agentcore-alpha@^2.224.0-alpha.0',
  ],

  // Lambda handler type-checking only (bundled by esbuild via NodejsFunction at deploy time)
  devDeps: [
    '@aws-cdk/integ-runner@latest',
    '@aws-cdk/integ-tests-alpha@2.233.0-alpha.0',
    '@aws-sdk/client-bedrock-agentcore',
    '@aws-sdk/client-cognito-identity-provider',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-scheduler',
    '@aws-sdk/util-dynamodb',
    'esbuild',
  ],

  sampleCode: false,
  githubOptions: {
    mergify: false,
  },

  gitignore: [
    'cdk.out/',
    '.env',
    '.env.local',
    'cdk.context.json',
    '!test/*.snapshot/**/*',
    'src/**/*.js',
    'src/**/*.d.ts',
    'test/**/*.js',
    'test/**/*.d.ts',
    '.projenrc.js',
    '.projenrc.d.ts',
  ],

  excludeTypescript: [
    'test/*.snapshot/**/*',
  ],
});

// Exclude snapshot assets from tsconfig.dev.json and ESLint
project.tsconfigDev.addExclude('test/*.snapshot/**/*');
project.eslint?.addIgnorePattern('test/*.snapshot/**/*');

// Integration tests with integ-runner
project.projectBuild.testTask.exec(
  'pnpm tsc -p tsconfig.dev.json && pnpm integ-runner',
);

// Include Docker assets and handler .ts sources in npm package
project.addPackageIgnore('!/agent/');
project.addPackageIgnore('!/webapp/');

// Copy handler .ts files to lib/ so NodejsFunction can find them at CDK synth time
project.postCompileTask.exec(
  'find src -name "*.ts" -path "*/handlers/*" | while read f; do dest="lib/${f#src/}"; mkdir -p "$(dirname "$dest")"; cp "$f" "$dest"; done',
);

// Allow handler files to import from devDependencies (they're bundled by esbuild at deploy time)
project.eslint?.addOverride({
  files: ['src/**/handlers/**/*.ts'],
  rules: {
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: true,
    }],
  },
});

project.synth();
