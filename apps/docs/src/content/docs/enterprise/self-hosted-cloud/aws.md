---
title: AWS
description: Deploy Voquill Enterprise on Amazon Web Services.
---

This guide walks you through deploying Voquill Enterprise on AWS using ECS with Fargate.

## Prerequisites

- An AWS account with permissions to create ECS clusters, task definitions, load balancers, and RDS instances.
- The [AWS CLI](https://aws.amazon.com/cli/) installed and configured.
- Your Voquill Enterprise license key.

## 1. Create a VPC and Networking

If you don't already have a VPC configured, create one with public and private subnets. The gateway and admin services will run in private subnets behind a load balancer, and the RDS instance should only be accessible from within the VPC.

```bash
aws ec2 create-vpc --cidr-block 10.0.0.0/16
```

Create at least two subnets across different availability zones for high availability.

## 2. Provision a PostgreSQL Database

Create an RDS PostgreSQL instance within your VPC:

```bash
aws rds create-db-instance \
  --db-instance-identifier voquill-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16 \
  --master-username postgres \
  --master-user-password your-db-password \
  --allocated-storage 20 \
  --vpc-security-group-ids your-sg-id \
  --db-subnet-group-name your-subnet-group \
  --no-publicly-accessible
```

Note the endpoint once the instance is available. You'll use it as the `DATABASE_URL` for the gateway.

## 3. Create an ECS Cluster

```bash
aws ecs create-cluster --cluster-name voquill
```

## 4. Register Task Definitions

Create a task definition for the gateway service. Save this as `gateway-task.json`:

```json
{
  "family": "voquill-gateway",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "gateway",
      "image": "ghcr.io/josiahsrc/voquill/enterprise-gateway:latest",
      "portMappings": [{ "containerPort": 4630 }],
      "environment": [
        { "name": "DATABASE_URL", "value": "postgres://postgres:your-db-password@your-rds-endpoint:5432/voquill" },
        { "name": "JWT_SECRET", "value": "your-jwt-secret" },
        { "name": "ENCRYPTION_SECRET", "value": "your-encryption-secret" },
        { "name": "LICENSE_KEY", "value": "your-license-key" }
      ]
    }
  ]
}
```

Create a similar task definition for the admin portal:

```json
{
  "family": "voquill-admin",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "admin",
      "image": "ghcr.io/josiahsrc/voquill/enterprise-admin:latest",
      "portMappings": [{ "containerPort": 5173 }]
    }
  ]
}
```

Register both:

```bash
aws ecs register-task-definition --cli-input-json file://gateway-task.json
aws ecs register-task-definition --cli-input-json file://admin-task.json
```

For production deployments, store secrets like `JWT_SECRET`, `ENCRYPTION_SECRET`, and `LICENSE_KEY` in AWS Secrets Manager and reference them using the `secrets` field instead of `environment`.

## 5. Create an Application Load Balancer

Create an ALB with target groups for both the gateway (port 4630) and admin portal (port 5173). Route traffic using host-based or path-based rules depending on your DNS setup.

```bash
aws elbv2 create-load-balancer \
  --name voquill-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx
```

Create target groups and listeners for each service.

## 6. Create ECS Services

```bash
aws ecs create-service \
  --cluster voquill \
  --service-name gateway \
  --task-definition voquill-gateway \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:...,containerName=gateway,containerPort=4630"
```

Repeat for the admin service.

## Updating

To deploy a new version, pull the latest image and update the ECS service to force a new deployment:

```bash
aws ecs update-service \
  --cluster voquill \
  --service gateway \
  --force-new-deployment
```

ECS will pull the latest image and perform a rolling update with zero downtime. Repeat for the admin service.
