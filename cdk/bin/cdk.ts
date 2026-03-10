#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { RepoPatrolStack } from "../lib/repo-patrol-stack";

const app = new cdk.App();
new RepoPatrolStack(app, "RepoPatrolStack", {
  env: { region: "us-west-2" },
});
