# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### AgentScheduler <a name="AgentScheduler" id="repo-patrol.AgentScheduler"></a>

Agent Scheduler construct.

Provides a Dispatcher Lambda and a Scheduler IAM Role.
EventBridge Schedules are NOT created statically here —
they are created dynamically per (repo × jobType) by the Registry API
when repositories are registered or updated.

NOTE: The caller must grant DynamoDB read access to dispatcherFunction
after the repos table is created (to break circular dependency).

#### Initializers <a name="Initializers" id="repo-patrol.AgentScheduler.Initializer"></a>

```typescript
import { AgentScheduler } from 'repo-patrol'

new AgentScheduler(scope: Construct, id: string, props: AgentSchedulerProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.AgentScheduler.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#repo-patrol.AgentScheduler.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#repo-patrol.AgentScheduler.Initializer.parameter.props">props</a></code> | <code><a href="#repo-patrol.AgentSchedulerProps">AgentSchedulerProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="repo-patrol.AgentScheduler.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="repo-patrol.AgentScheduler.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="repo-patrol.AgentScheduler.Initializer.parameter.props"></a>

- *Type:* <a href="#repo-patrol.AgentSchedulerProps">AgentSchedulerProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#repo-patrol.AgentScheduler.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="repo-patrol.AgentScheduler.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#repo-patrol.AgentScheduler.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="repo-patrol.AgentScheduler.isConstruct"></a>

```typescript
import { AgentScheduler } from 'repo-patrol'

AgentScheduler.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="repo-patrol.AgentScheduler.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.AgentScheduler.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#repo-patrol.AgentScheduler.property.dispatcherFunction">dispatcherFunction</a></code> | <code>aws-cdk-lib.aws_lambda_nodejs.NodejsFunction</code> | *No description.* |
| <code><a href="#repo-patrol.AgentScheduler.property.schedulerRole">schedulerRole</a></code> | <code>aws-cdk-lib.aws_iam.Role</code> | *No description.* |

---

##### `node`<sup>Required</sup> <a name="node" id="repo-patrol.AgentScheduler.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `dispatcherFunction`<sup>Required</sup> <a name="dispatcherFunction" id="repo-patrol.AgentScheduler.property.dispatcherFunction"></a>

```typescript
public readonly dispatcherFunction: NodejsFunction;
```

- *Type:* aws-cdk-lib.aws_lambda_nodejs.NodejsFunction

---

##### `schedulerRole`<sup>Required</sup> <a name="schedulerRole" id="repo-patrol.AgentScheduler.property.schedulerRole"></a>

```typescript
public readonly schedulerRole: Role;
```

- *Type:* aws-cdk-lib.aws_iam.Role

---


### RepoPatrol <a name="RepoPatrol" id="repo-patrol.RepoPatrol"></a>

#### Initializers <a name="Initializers" id="repo-patrol.RepoPatrol.Initializer"></a>

```typescript
import { RepoPatrol } from 'repo-patrol'

new RepoPatrol(scope: Construct, id: string, props: RepoPatrolProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.RepoPatrol.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#repo-patrol.RepoPatrol.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#repo-patrol.RepoPatrol.Initializer.parameter.props">props</a></code> | <code><a href="#repo-patrol.RepoPatrolProps">RepoPatrolProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="repo-patrol.RepoPatrol.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="repo-patrol.RepoPatrol.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="repo-patrol.RepoPatrol.Initializer.parameter.props"></a>

- *Type:* <a href="#repo-patrol.RepoPatrolProps">RepoPatrolProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#repo-patrol.RepoPatrol.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="repo-patrol.RepoPatrol.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#repo-patrol.RepoPatrol.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="repo-patrol.RepoPatrol.isConstruct"></a>

```typescript
import { RepoPatrol } from 'repo-patrol'

RepoPatrol.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="repo-patrol.RepoPatrol.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.RepoPatrol.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#repo-patrol.RepoPatrol.property.agentRuntime">agentRuntime</a></code> | <code><a href="#repo-patrol.StrandsAgentRuntime">StrandsAgentRuntime</a></code> | *No description.* |
| <code><a href="#repo-patrol.RepoPatrol.property.registry">registry</a></code> | <code><a href="#repo-patrol.RepoRegistry">RepoRegistry</a></code> | *No description.* |
| <code><a href="#repo-patrol.RepoPatrol.property.reportBucket">reportBucket</a></code> | <code>aws-cdk-lib.aws_s3.Bucket</code> | *No description.* |
| <code><a href="#repo-patrol.RepoPatrol.property.scheduler">scheduler</a></code> | <code><a href="#repo-patrol.AgentScheduler">AgentScheduler</a></code> | *No description.* |
| <code><a href="#repo-patrol.RepoPatrol.property.frontend">frontend</a></code> | <code><a href="#repo-patrol.ReportFrontend">ReportFrontend</a></code> | *No description.* |

---

##### `node`<sup>Required</sup> <a name="node" id="repo-patrol.RepoPatrol.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `agentRuntime`<sup>Required</sup> <a name="agentRuntime" id="repo-patrol.RepoPatrol.property.agentRuntime"></a>

```typescript
public readonly agentRuntime: StrandsAgentRuntime;
```

- *Type:* <a href="#repo-patrol.StrandsAgentRuntime">StrandsAgentRuntime</a>

---

##### `registry`<sup>Required</sup> <a name="registry" id="repo-patrol.RepoPatrol.property.registry"></a>

```typescript
public readonly registry: RepoRegistry;
```

- *Type:* <a href="#repo-patrol.RepoRegistry">RepoRegistry</a>

---

##### `reportBucket`<sup>Required</sup> <a name="reportBucket" id="repo-patrol.RepoPatrol.property.reportBucket"></a>

```typescript
public readonly reportBucket: Bucket;
```

- *Type:* aws-cdk-lib.aws_s3.Bucket

---

##### `scheduler`<sup>Required</sup> <a name="scheduler" id="repo-patrol.RepoPatrol.property.scheduler"></a>

```typescript
public readonly scheduler: AgentScheduler;
```

- *Type:* <a href="#repo-patrol.AgentScheduler">AgentScheduler</a>

---

##### `frontend`<sup>Optional</sup> <a name="frontend" id="repo-patrol.RepoPatrol.property.frontend"></a>

```typescript
public readonly frontend: ReportFrontend;
```

- *Type:* <a href="#repo-patrol.ReportFrontend">ReportFrontend</a>

---


### RepoRegistry <a name="RepoRegistry" id="repo-patrol.RepoRegistry"></a>

#### Initializers <a name="Initializers" id="repo-patrol.RepoRegistry.Initializer"></a>

```typescript
import { RepoRegistry } from 'repo-patrol'

new RepoRegistry(scope: Construct, id: string, props: RepoRegistryProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.RepoRegistry.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#repo-patrol.RepoRegistry.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#repo-patrol.RepoRegistry.Initializer.parameter.props">props</a></code> | <code><a href="#repo-patrol.RepoRegistryProps">RepoRegistryProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="repo-patrol.RepoRegistry.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="repo-patrol.RepoRegistry.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="repo-patrol.RepoRegistry.Initializer.parameter.props"></a>

- *Type:* <a href="#repo-patrol.RepoRegistryProps">RepoRegistryProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#repo-patrol.RepoRegistry.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="repo-patrol.RepoRegistry.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#repo-patrol.RepoRegistry.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="repo-patrol.RepoRegistry.isConstruct"></a>

```typescript
import { RepoRegistry } from 'repo-patrol'

RepoRegistry.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="repo-patrol.RepoRegistry.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.RepoRegistry.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#repo-patrol.RepoRegistry.property.jobHistoryTable">jobHistoryTable</a></code> | <code>aws-cdk-lib.aws_dynamodb.Table</code> | *No description.* |
| <code><a href="#repo-patrol.RepoRegistry.property.processedItemsTable">processedItemsTable</a></code> | <code>aws-cdk-lib.aws_dynamodb.Table</code> | *No description.* |
| <code><a href="#repo-patrol.RepoRegistry.property.registryFunction">registryFunction</a></code> | <code>aws-cdk-lib.aws_lambda_nodejs.NodejsFunction</code> | *No description.* |
| <code><a href="#repo-patrol.RepoRegistry.property.reposTable">reposTable</a></code> | <code>aws-cdk-lib.aws_dynamodb.Table</code> | *No description.* |

---

##### `node`<sup>Required</sup> <a name="node" id="repo-patrol.RepoRegistry.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `jobHistoryTable`<sup>Required</sup> <a name="jobHistoryTable" id="repo-patrol.RepoRegistry.property.jobHistoryTable"></a>

```typescript
public readonly jobHistoryTable: Table;
```

- *Type:* aws-cdk-lib.aws_dynamodb.Table

---

##### `processedItemsTable`<sup>Required</sup> <a name="processedItemsTable" id="repo-patrol.RepoRegistry.property.processedItemsTable"></a>

```typescript
public readonly processedItemsTable: Table;
```

- *Type:* aws-cdk-lib.aws_dynamodb.Table

---

##### `registryFunction`<sup>Required</sup> <a name="registryFunction" id="repo-patrol.RepoRegistry.property.registryFunction"></a>

```typescript
public readonly registryFunction: NodejsFunction;
```

- *Type:* aws-cdk-lib.aws_lambda_nodejs.NodejsFunction

---

##### `reposTable`<sup>Required</sup> <a name="reposTable" id="repo-patrol.RepoRegistry.property.reposTable"></a>

```typescript
public readonly reposTable: Table;
```

- *Type:* aws-cdk-lib.aws_dynamodb.Table

---


### ReportFrontend <a name="ReportFrontend" id="repo-patrol.ReportFrontend"></a>

#### Initializers <a name="Initializers" id="repo-patrol.ReportFrontend.Initializer"></a>

```typescript
import { ReportFrontend } from 'repo-patrol'

new ReportFrontend(scope: Construct, id: string, props: ReportFrontendProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.ReportFrontend.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#repo-patrol.ReportFrontend.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#repo-patrol.ReportFrontend.Initializer.parameter.props">props</a></code> | <code><a href="#repo-patrol.ReportFrontendProps">ReportFrontendProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="repo-patrol.ReportFrontend.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="repo-patrol.ReportFrontend.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="repo-patrol.ReportFrontend.Initializer.parameter.props"></a>

- *Type:* <a href="#repo-patrol.ReportFrontendProps">ReportFrontendProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#repo-patrol.ReportFrontend.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="repo-patrol.ReportFrontend.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#repo-patrol.ReportFrontend.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="repo-patrol.ReportFrontend.isConstruct"></a>

```typescript
import { ReportFrontend } from 'repo-patrol'

ReportFrontend.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="repo-patrol.ReportFrontend.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.ReportFrontend.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#repo-patrol.ReportFrontend.property.distribution">distribution</a></code> | <code>aws-cdk-lib.aws_cloudfront.Distribution</code> | *No description.* |
| <code><a href="#repo-patrol.ReportFrontend.property.userPool">userPool</a></code> | <code>aws-cdk-lib.aws_cognito.UserPool</code> | *No description.* |
| <code><a href="#repo-patrol.ReportFrontend.property.userPoolClient">userPoolClient</a></code> | <code>aws-cdk-lib.aws_cognito.UserPoolClient</code> | *No description.* |

---

##### `node`<sup>Required</sup> <a name="node" id="repo-patrol.ReportFrontend.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `distribution`<sup>Required</sup> <a name="distribution" id="repo-patrol.ReportFrontend.property.distribution"></a>

```typescript
public readonly distribution: Distribution;
```

- *Type:* aws-cdk-lib.aws_cloudfront.Distribution

---

##### `userPool`<sup>Required</sup> <a name="userPool" id="repo-patrol.ReportFrontend.property.userPool"></a>

```typescript
public readonly userPool: UserPool;
```

- *Type:* aws-cdk-lib.aws_cognito.UserPool

---

##### `userPoolClient`<sup>Required</sup> <a name="userPoolClient" id="repo-patrol.ReportFrontend.property.userPoolClient"></a>

```typescript
public readonly userPoolClient: UserPoolClient;
```

- *Type:* aws-cdk-lib.aws_cognito.UserPoolClient

---


### StrandsAgentRuntime <a name="StrandsAgentRuntime" id="repo-patrol.StrandsAgentRuntime"></a>

#### Initializers <a name="Initializers" id="repo-patrol.StrandsAgentRuntime.Initializer"></a>

```typescript
import { StrandsAgentRuntime } from 'repo-patrol'

new StrandsAgentRuntime(scope: Construct, id: string, props: StrandsAgentRuntimeProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.StrandsAgentRuntime.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#repo-patrol.StrandsAgentRuntime.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#repo-patrol.StrandsAgentRuntime.Initializer.parameter.props">props</a></code> | <code><a href="#repo-patrol.StrandsAgentRuntimeProps">StrandsAgentRuntimeProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="repo-patrol.StrandsAgentRuntime.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="repo-patrol.StrandsAgentRuntime.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="repo-patrol.StrandsAgentRuntime.Initializer.parameter.props"></a>

- *Type:* <a href="#repo-patrol.StrandsAgentRuntimeProps">StrandsAgentRuntimeProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#repo-patrol.StrandsAgentRuntime.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="repo-patrol.StrandsAgentRuntime.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#repo-patrol.StrandsAgentRuntime.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="repo-patrol.StrandsAgentRuntime.isConstruct"></a>

```typescript
import { StrandsAgentRuntime } from 'repo-patrol'

StrandsAgentRuntime.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="repo-patrol.StrandsAgentRuntime.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.StrandsAgentRuntime.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#repo-patrol.StrandsAgentRuntime.property.runtime">runtime</a></code> | <code>@aws-cdk/aws-bedrock-agentcore-alpha.Runtime</code> | *No description.* |

---

##### `node`<sup>Required</sup> <a name="node" id="repo-patrol.StrandsAgentRuntime.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `runtime`<sup>Required</sup> <a name="runtime" id="repo-patrol.StrandsAgentRuntime.property.runtime"></a>

```typescript
public readonly runtime: Runtime;
```

- *Type:* @aws-cdk/aws-bedrock-agentcore-alpha.Runtime

---


## Structs <a name="Structs" id="Structs"></a>

### AgentSchedulerProps <a name="AgentSchedulerProps" id="repo-patrol.AgentSchedulerProps"></a>

#### Initializer <a name="Initializer" id="repo-patrol.AgentSchedulerProps.Initializer"></a>

```typescript
import { AgentSchedulerProps } from 'repo-patrol'

const agentSchedulerProps: AgentSchedulerProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.AgentSchedulerProps.property.agentRuntime">agentRuntime</a></code> | <code>@aws-cdk/aws-bedrock-agentcore-alpha.Runtime</code> | *No description.* |
| <code><a href="#repo-patrol.AgentSchedulerProps.property.reposTableName">reposTableName</a></code> | <code>string</code> | Repos table name (string to avoid circular dependency with RepoRegistry). |

---

##### `agentRuntime`<sup>Required</sup> <a name="agentRuntime" id="repo-patrol.AgentSchedulerProps.property.agentRuntime"></a>

```typescript
public readonly agentRuntime: Runtime;
```

- *Type:* @aws-cdk/aws-bedrock-agentcore-alpha.Runtime

---

##### `reposTableName`<sup>Required</sup> <a name="reposTableName" id="repo-patrol.AgentSchedulerProps.property.reposTableName"></a>

```typescript
public readonly reposTableName: string;
```

- *Type:* string

Repos table name (string to avoid circular dependency with RepoRegistry).

---

### JobConfig <a name="JobConfig" id="repo-patrol.JobConfig"></a>

Per-job configuration within a repository.

#### Initializer <a name="Initializer" id="repo-patrol.JobConfig.Initializer"></a>

```typescript
import { JobConfig } from 'repo-patrol'

const jobConfig: JobConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.JobConfig.property.enabled">enabled</a></code> | <code>boolean</code> | Whether this job is enabled. |
| <code><a href="#repo-patrol.JobConfig.property.modelId">modelId</a></code> | <code>string</code> | Override the Bedrock model ID for this specific job. |
| <code><a href="#repo-patrol.JobConfig.property.schedule">schedule</a></code> | <code>aws-cdk-lib.aws_scheduler.ScheduleExpression</code> | Schedule for this job. |

---

##### `enabled`<sup>Optional</sup> <a name="enabled" id="repo-patrol.JobConfig.property.enabled"></a>

```typescript
public readonly enabled: boolean;
```

- *Type:* boolean
- *Default:* true

Whether this job is enabled.

---

##### `modelId`<sup>Optional</sup> <a name="modelId" id="repo-patrol.JobConfig.property.modelId"></a>

```typescript
public readonly modelId: string;
```

- *Type:* string
- *Default:* Uses the repository-level or construct-level model ID

Override the Bedrock model ID for this specific job.

---

##### `schedule`<sup>Optional</sup> <a name="schedule" id="repo-patrol.JobConfig.property.schedule"></a>

```typescript
public readonly schedule: ScheduleExpression;
```

- *Type:* aws-cdk-lib.aws_scheduler.ScheduleExpression
- *Default:* Daily at UTC 00:00 (cron(0 0 * * ? *))

Schedule for this job.

---

### RepoPatrolProps <a name="RepoPatrolProps" id="repo-patrol.RepoPatrolProps"></a>

#### Initializer <a name="Initializer" id="repo-patrol.RepoPatrolProps.Initializer"></a>

```typescript
import { RepoPatrolProps } from 'repo-patrol'

const repoPatrolProps: RepoPatrolProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.RepoPatrolProps.property.githubAppSecret">githubAppSecret</a></code> | <code>aws-cdk-lib.aws_secretsmanager.ISecret</code> | Secrets Manager secret containing GitHub App credentials (app_id, private_key). |
| <code><a href="#repo-patrol.RepoPatrolProps.property.adminEmails">adminEmails</a></code> | <code>string[]</code> | Email addresses for admin users to create in the Cognito User Pool. |
| <code><a href="#repo-patrol.RepoPatrolProps.property.dryRun">dryRun</a></code> | <code>boolean</code> | Run in dry-run mode (no GitHub write operations). |
| <code><a href="#repo-patrol.RepoPatrolProps.property.enableDashboard">enableDashboard</a></code> | <code>boolean</code> | Enable the Next.js dashboard with Cognito authentication. |
| <code><a href="#repo-patrol.RepoPatrolProps.property.maxToolCalls">maxToolCalls</a></code> | <code>number</code> | Maximum tool calls per agent invocation. |
| <code><a href="#repo-patrol.RepoPatrolProps.property.mfaRequired">mfaRequired</a></code> | <code>boolean</code> | Whether to require MFA (TOTP) for dashboard login. |
| <code><a href="#repo-patrol.RepoPatrolProps.property.modelId">modelId</a></code> | <code>string</code> | Default Bedrock model ID. |
| <code><a href="#repo-patrol.RepoPatrolProps.property.repositories">repositories</a></code> | <code><a href="#repo-patrol.RepositoryConfig">RepositoryConfig</a>[]</code> | Repositories to monitor. |

---

##### `githubAppSecret`<sup>Required</sup> <a name="githubAppSecret" id="repo-patrol.RepoPatrolProps.property.githubAppSecret"></a>

```typescript
public readonly githubAppSecret: ISecret;
```

- *Type:* aws-cdk-lib.aws_secretsmanager.ISecret

Secrets Manager secret containing GitHub App credentials (app_id, private_key).

---

##### `adminEmails`<sup>Optional</sup> <a name="adminEmails" id="repo-patrol.RepoPatrolProps.property.adminEmails"></a>

```typescript
public readonly adminEmails: string[];
```

- *Type:* string[]
- *Default:* No admin users are created

Email addresses for admin users to create in the Cognito User Pool.

Each user receives an invitation email from Cognito with a temporary password.
Requires enableDashboard to be true (default).

---

##### `dryRun`<sup>Optional</sup> <a name="dryRun" id="repo-patrol.RepoPatrolProps.property.dryRun"></a>

```typescript
public readonly dryRun: boolean;
```

- *Type:* boolean

Run in dry-run mode (no GitHub write operations).

---

##### `enableDashboard`<sup>Optional</sup> <a name="enableDashboard" id="repo-patrol.RepoPatrolProps.property.enableDashboard"></a>

```typescript
public readonly enableDashboard: boolean;
```

- *Type:* boolean

Enable the Next.js dashboard with Cognito authentication.

---

##### `maxToolCalls`<sup>Optional</sup> <a name="maxToolCalls" id="repo-patrol.RepoPatrolProps.property.maxToolCalls"></a>

```typescript
public readonly maxToolCalls: number;
```

- *Type:* number

Maximum tool calls per agent invocation.

---

##### `mfaRequired`<sup>Optional</sup> <a name="mfaRequired" id="repo-patrol.RepoPatrolProps.property.mfaRequired"></a>

```typescript
public readonly mfaRequired: boolean;
```

- *Type:* boolean
- *Default:* true

Whether to require MFA (TOTP) for dashboard login.

---

##### `modelId`<sup>Optional</sup> <a name="modelId" id="repo-patrol.RepoPatrolProps.property.modelId"></a>

```typescript
public readonly modelId: string;
```

- *Type:* string

Default Bedrock model ID.

---

##### `repositories`<sup>Optional</sup> <a name="repositories" id="repo-patrol.RepoPatrolProps.property.repositories"></a>

```typescript
public readonly repositories: RepositoryConfig[];
```

- *Type:* <a href="#repo-patrol.RepositoryConfig">RepositoryConfig</a>[]

Repositories to monitor.

Each repository gets independent EventBridge Schedules per job type.
Additional repositories can be added dynamically via the Registry API.

---

### RepoRegistryProps <a name="RepoRegistryProps" id="repo-patrol.RepoRegistryProps"></a>

#### Initializer <a name="Initializer" id="repo-patrol.RepoRegistryProps.Initializer"></a>

```typescript
import { RepoRegistryProps } from 'repo-patrol'

const repoRegistryProps: RepoRegistryProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.RepoRegistryProps.property.fallbackSchedule">fallbackSchedule</a></code> | <code>string</code> | Fallback schedule expression when no schedule is configured. |

---

##### `fallbackSchedule`<sup>Required</sup> <a name="fallbackSchedule" id="repo-patrol.RepoRegistryProps.property.fallbackSchedule"></a>

```typescript
public readonly fallbackSchedule: string;
```

- *Type:* string

Fallback schedule expression when no schedule is configured.

---

### ReportFrontendProps <a name="ReportFrontendProps" id="repo-patrol.ReportFrontendProps"></a>

#### Initializer <a name="Initializer" id="repo-patrol.ReportFrontendProps.Initializer"></a>

```typescript
import { ReportFrontendProps } from 'repo-patrol'

const reportFrontendProps: ReportFrontendProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.ReportFrontendProps.property.githubAppSecret">githubAppSecret</a></code> | <code>aws-cdk-lib.aws_secretsmanager.ISecret</code> | Secrets Manager secret containing GitHub App credentials for installation_id auto-resolution. |
| <code><a href="#repo-patrol.ReportFrontendProps.property.jobHistoryTable">jobHistoryTable</a></code> | <code>aws-cdk-lib.aws_dynamodb.ITable</code> | *No description.* |
| <code><a href="#repo-patrol.ReportFrontendProps.property.reportBucket">reportBucket</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | *No description.* |
| <code><a href="#repo-patrol.ReportFrontendProps.property.reposTable">reposTable</a></code> | <code>aws-cdk-lib.aws_dynamodb.ITable</code> | *No description.* |
| <code><a href="#repo-patrol.ReportFrontendProps.property.adminEmails">adminEmails</a></code> | <code>string[]</code> | Email addresses for admin users to create in the Cognito User Pool. |
| <code><a href="#repo-patrol.ReportFrontendProps.property.mfaRequired">mfaRequired</a></code> | <code>boolean</code> | Whether to require MFA (TOTP) for dashboard login. |
| <code><a href="#repo-patrol.ReportFrontendProps.property.registryFunctionUrl">registryFunctionUrl</a></code> | <code>string</code> | *No description.* |

---

##### `githubAppSecret`<sup>Required</sup> <a name="githubAppSecret" id="repo-patrol.ReportFrontendProps.property.githubAppSecret"></a>

```typescript
public readonly githubAppSecret: ISecret;
```

- *Type:* aws-cdk-lib.aws_secretsmanager.ISecret

Secrets Manager secret containing GitHub App credentials for installation_id auto-resolution.

---

##### `jobHistoryTable`<sup>Required</sup> <a name="jobHistoryTable" id="repo-patrol.ReportFrontendProps.property.jobHistoryTable"></a>

```typescript
public readonly jobHistoryTable: ITable;
```

- *Type:* aws-cdk-lib.aws_dynamodb.ITable

---

##### `reportBucket`<sup>Required</sup> <a name="reportBucket" id="repo-patrol.ReportFrontendProps.property.reportBucket"></a>

```typescript
public readonly reportBucket: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

---

##### `reposTable`<sup>Required</sup> <a name="reposTable" id="repo-patrol.ReportFrontendProps.property.reposTable"></a>

```typescript
public readonly reposTable: ITable;
```

- *Type:* aws-cdk-lib.aws_dynamodb.ITable

---

##### `adminEmails`<sup>Optional</sup> <a name="adminEmails" id="repo-patrol.ReportFrontendProps.property.adminEmails"></a>

```typescript
public readonly adminEmails: string[];
```

- *Type:* string[]
- *Default:* No admin users are created

Email addresses for admin users to create in the Cognito User Pool.

Each user receives an invitation email from Cognito with a temporary password.

---

##### `mfaRequired`<sup>Optional</sup> <a name="mfaRequired" id="repo-patrol.ReportFrontendProps.property.mfaRequired"></a>

```typescript
public readonly mfaRequired: boolean;
```

- *Type:* boolean
- *Default:* true

Whether to require MFA (TOTP) for dashboard login.

---

##### `registryFunctionUrl`<sup>Optional</sup> <a name="registryFunctionUrl" id="repo-patrol.ReportFrontendProps.property.registryFunctionUrl"></a>

```typescript
public readonly registryFunctionUrl: string;
```

- *Type:* string

---

### RepositoryConfig <a name="RepositoryConfig" id="repo-patrol.RepositoryConfig"></a>

Configuration for a monitored GitHub repository.

#### Initializer <a name="Initializer" id="repo-patrol.RepositoryConfig.Initializer"></a>

```typescript
import { RepositoryConfig } from 'repo-patrol'

const repositoryConfig: RepositoryConfig = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.RepositoryConfig.property.githubAppInstallationId">githubAppInstallationId</a></code> | <code>number</code> | GitHub App installation ID for this repository. |
| <code><a href="#repo-patrol.RepositoryConfig.property.owner">owner</a></code> | <code>string</code> | GitHub repository owner (user or organization). |
| <code><a href="#repo-patrol.RepositoryConfig.property.repo">repo</a></code> | <code>string</code> | GitHub repository name. |
| <code><a href="#repo-patrol.RepositoryConfig.property.jobs">jobs</a></code> | <code>{[ key: string ]: <a href="#repo-patrol.JobConfig">JobConfig</a>}</code> | Per-job-type configuration. |
| <code><a href="#repo-patrol.RepositoryConfig.property.modelId">modelId</a></code> | <code>string</code> | Override the Bedrock model ID for this repository. |

---

##### `githubAppInstallationId`<sup>Required</sup> <a name="githubAppInstallationId" id="repo-patrol.RepositoryConfig.property.githubAppInstallationId"></a>

```typescript
public readonly githubAppInstallationId: number;
```

- *Type:* number

GitHub App installation ID for this repository.

---

##### `owner`<sup>Required</sup> <a name="owner" id="repo-patrol.RepositoryConfig.property.owner"></a>

```typescript
public readonly owner: string;
```

- *Type:* string

GitHub repository owner (user or organization).

---

##### `repo`<sup>Required</sup> <a name="repo" id="repo-patrol.RepositoryConfig.property.repo"></a>

```typescript
public readonly repo: string;
```

- *Type:* string

GitHub repository name.

---

##### `jobs`<sup>Optional</sup> <a name="jobs" id="repo-patrol.RepositoryConfig.property.jobs"></a>

```typescript
public readonly jobs: {[ key: string ]: JobConfig};
```

- *Type:* {[ key: string ]: <a href="#repo-patrol.JobConfig">JobConfig</a>}

Per-job-type configuration.

Keys are JobType enum values (e.g. 'review_pull_requests').
Omitted job types use the default schedule and are enabled.

---

##### `modelId`<sup>Optional</sup> <a name="modelId" id="repo-patrol.RepositoryConfig.property.modelId"></a>

```typescript
public readonly modelId: string;
```

- *Type:* string
- *Default:* Uses the construct-level model ID

Override the Bedrock model ID for this repository.

---

### StrandsAgentRuntimeProps <a name="StrandsAgentRuntimeProps" id="repo-patrol.StrandsAgentRuntimeProps"></a>

#### Initializer <a name="Initializer" id="repo-patrol.StrandsAgentRuntimeProps.Initializer"></a>

```typescript
import { StrandsAgentRuntimeProps } from 'repo-patrol'

const strandsAgentRuntimeProps: StrandsAgentRuntimeProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#repo-patrol.StrandsAgentRuntimeProps.property.githubAppSecret">githubAppSecret</a></code> | <code>aws-cdk-lib.aws_secretsmanager.ISecret</code> | *No description.* |
| <code><a href="#repo-patrol.StrandsAgentRuntimeProps.property.jobHistoryTableName">jobHistoryTableName</a></code> | <code>string</code> | *No description.* |
| <code><a href="#repo-patrol.StrandsAgentRuntimeProps.property.processedItemsTableName">processedItemsTableName</a></code> | <code>string</code> | *No description.* |
| <code><a href="#repo-patrol.StrandsAgentRuntimeProps.property.reportBucket">reportBucket</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | *No description.* |
| <code><a href="#repo-patrol.StrandsAgentRuntimeProps.property.reposTableName">reposTableName</a></code> | <code>string</code> | *No description.* |
| <code><a href="#repo-patrol.StrandsAgentRuntimeProps.property.dryRun">dryRun</a></code> | <code>boolean</code> | *No description.* |
| <code><a href="#repo-patrol.StrandsAgentRuntimeProps.property.maxToolCalls">maxToolCalls</a></code> | <code>number</code> | *No description.* |
| <code><a href="#repo-patrol.StrandsAgentRuntimeProps.property.modelId">modelId</a></code> | <code>string</code> | *No description.* |

---

##### `githubAppSecret`<sup>Required</sup> <a name="githubAppSecret" id="repo-patrol.StrandsAgentRuntimeProps.property.githubAppSecret"></a>

```typescript
public readonly githubAppSecret: ISecret;
```

- *Type:* aws-cdk-lib.aws_secretsmanager.ISecret

---

##### `jobHistoryTableName`<sup>Required</sup> <a name="jobHistoryTableName" id="repo-patrol.StrandsAgentRuntimeProps.property.jobHistoryTableName"></a>

```typescript
public readonly jobHistoryTableName: string;
```

- *Type:* string

---

##### `processedItemsTableName`<sup>Required</sup> <a name="processedItemsTableName" id="repo-patrol.StrandsAgentRuntimeProps.property.processedItemsTableName"></a>

```typescript
public readonly processedItemsTableName: string;
```

- *Type:* string

---

##### `reportBucket`<sup>Required</sup> <a name="reportBucket" id="repo-patrol.StrandsAgentRuntimeProps.property.reportBucket"></a>

```typescript
public readonly reportBucket: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

---

##### `reposTableName`<sup>Required</sup> <a name="reposTableName" id="repo-patrol.StrandsAgentRuntimeProps.property.reposTableName"></a>

```typescript
public readonly reposTableName: string;
```

- *Type:* string

---

##### `dryRun`<sup>Optional</sup> <a name="dryRun" id="repo-patrol.StrandsAgentRuntimeProps.property.dryRun"></a>

```typescript
public readonly dryRun: boolean;
```

- *Type:* boolean

---

##### `maxToolCalls`<sup>Optional</sup> <a name="maxToolCalls" id="repo-patrol.StrandsAgentRuntimeProps.property.maxToolCalls"></a>

```typescript
public readonly maxToolCalls: number;
```

- *Type:* number

---

##### `modelId`<sup>Optional</sup> <a name="modelId" id="repo-patrol.StrandsAgentRuntimeProps.property.modelId"></a>

```typescript
public readonly modelId: string;
```

- *Type:* string

---



## Enums <a name="Enums" id="Enums"></a>

### JobType <a name="JobType" id="repo-patrol.JobType"></a>

Supported patrol job types.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#repo-patrol.JobType.REVIEW_PULL_REQUESTS">REVIEW_PULL_REQUESTS</a></code> | Review open pull requests and post comments. |
| <code><a href="#repo-patrol.JobType.TRIAGE_ISSUES">TRIAGE_ISSUES</a></code> | Triage issues with labels and comments. |
| <code><a href="#repo-patrol.JobType.HANDLE_DEPENDABOT">HANDLE_DEPENDABOT</a></code> | Handle Dependabot PRs (auto-approve/merge). |
| <code><a href="#repo-patrol.JobType.ANALYZE_CI_FAILURES">ANALYZE_CI_FAILURES</a></code> | Analyze CI failure logs and suggest fixes. |
| <code><a href="#repo-patrol.JobType.CHECK_DEPENDENCIES">CHECK_DEPENDENCIES</a></code> | Check dependency updates. |
| <code><a href="#repo-patrol.JobType.REPO_HEALTH_CHECK">REPO_HEALTH_CHECK</a></code> | Repository health check (README, LICENSE, CI config). |

---

##### `REVIEW_PULL_REQUESTS` <a name="REVIEW_PULL_REQUESTS" id="repo-patrol.JobType.REVIEW_PULL_REQUESTS"></a>

Review open pull requests and post comments.

---


##### `TRIAGE_ISSUES` <a name="TRIAGE_ISSUES" id="repo-patrol.JobType.TRIAGE_ISSUES"></a>

Triage issues with labels and comments.

---


##### `HANDLE_DEPENDABOT` <a name="HANDLE_DEPENDABOT" id="repo-patrol.JobType.HANDLE_DEPENDABOT"></a>

Handle Dependabot PRs (auto-approve/merge).

---


##### `ANALYZE_CI_FAILURES` <a name="ANALYZE_CI_FAILURES" id="repo-patrol.JobType.ANALYZE_CI_FAILURES"></a>

Analyze CI failure logs and suggest fixes.

---


##### `CHECK_DEPENDENCIES` <a name="CHECK_DEPENDENCIES" id="repo-patrol.JobType.CHECK_DEPENDENCIES"></a>

Check dependency updates.

---


##### `REPO_HEALTH_CHECK` <a name="REPO_HEALTH_CHECK" id="repo-patrol.JobType.REPO_HEALTH_CHECK"></a>

Repository health check (README, LICENSE, CI config).

---

