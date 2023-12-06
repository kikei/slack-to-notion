# slack-to-notion

Slack webhook to post messages to a Notion database.

This application works on Amazon Web Service.
By deploying with CDK, Amazon Lambda Function will be created on your AWS.

## How to deploy

Use Amazon CDK.

```console
$ npm clean-install
$ npm run cdk deploy
```

You have to configure AWS CLI before deploying.

When the deployment was finished successfully, you will obtain a URL
(Lambda Endpoint URL) to simply kick the Lambda function.
It is for Slack webhook.

## (Optional) Deploy with Docker

You can use docker container.

### Configure AWS CLI

```console
$ cp data/aws/config.example /data/aws/config
$ vi /data/aws/config

$ cp data/aws/credentials.example /data/aws/credentials
$ vi /data/aws/credentials
```

### Start docker container and login

```console
$ cd docker && docker.sh -b
```

## Set Slack Webhook

Create your webhook and set the created URL.

## Put Notion settings

Notion credentials and database id is stored in Amazon Parameter Store.
You need put them manually.

```console
$ aws ssm put-parameter --name Slack2Notion --value '{
  "notion": {
    "database_id": "<Notion Database ID>",
    "token": "<Notion API Secret>"
  }
}"
```

NOTE You can change the keyword "Slack2Notion" that is defined in cdk.json.
