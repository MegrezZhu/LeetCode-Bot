<!-- omit in toc -->
# LeetCode-Bot

Get tired of manually committing your code to a Git repository everytime you have ACed a LeetCode problem?

LeetCode-Bot automatically monitors, fetches and commits your accepted LeetCode submissions to your specified Git repository. 

Supports deploying as [AWS Lambda](https://aws.amazon.com/lambda) function, or running on any machine with Node.js environment.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Prerequisites](#prerequisites)
- [Deployment](#deployment)
  - [AWS Serverless](#aws-serverless)
  - [Local Deployment](#local-deployment)
- [Configuration](#configuration)
- [Design Details](#design-details)
  - [Why LeetCode Session](#why-leetcode-session)
  - [AWS Services](#aws-services)
  - [Is It Free?](#is-it-free)
  - [Why One Iteration At A Time](#why-one-iteration-at-a-time)
- [License](#license)

## Prerequisites

* [Node.js](https://nodejs.org/) >= 12.x.
* To deploy on AWS:
  * An AWS Account (of course)
  * [Python](https://www.python.org/) >= 3.6

## Deployment

For whichever mode, AWS or Local, you need to compile the source TypeScript code first: 

* Install dependencies by `yarn install` or `npm install`
* Compile by `npm run build`

### AWS Serverless

LeetCode-Bot uses [boto3](https://github.com/boto/boto3) for access to AWS service APIs. Make sure proper **AWS Authentication Credentials** (Access Key Id & Secret Access Key) and **region** to deploy is specified in `~/.aws/credentials`, see [This Tutorial](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html#configuration). The provided AWS authentication credentials should at least have the permission to create **S3 Bucket, Lambda Function, CloudWatch Events and IAM Policy & Roles**.

We provide scripts for deploying, updating and deleting LeetCode-Bot in the AWS under `./deploy`, whose correspoding dependencies are listed in `./deploy/requirements.txt` or `./deploy/Pipfile`.

* `cd deploy`
* Install dependencies by `pip3 install -r requirements.txt` or `pipenv install`
* Edit `config.yaml` for your desired settings and credentials necessary for both AWS and Git, details listed in [Configuration](#configuration).
* Run `deploy.py` to deploy, `cleanup.py` to delete all deployed services, `patch.py` to rebuild and update LeetCode-Bot (if any), and `update_session.py` to upload new LeetCode session information ([Why?](#why-leetcode-session)). 

### Local Deployment

Local deployment is much simpler but it requires a host machine. After running `npm run build`, use `LEETCODE_SESSION=<Cookie_Value> npm start -- --config=<path_to_config>` to start LeetCode-Bot. An example of the configuration file is `./local-config-example.json`, details explained in [Configuration](#configuration).

Note: 
* `LEETCODE_SESSION` is an environment variable required by LeetCode-Bot ([Details Here](#why-leetcode-session)). It can be provided in command-line, or by creating a `.env` file at the root of this project with the content `LEETCODE_SESSION=...`.
* LeetCode-Bot only runs **One Iteration** for each `npm start ...`, which fetches and processes only the oldest unfetched few (~100) submissions. This is in order to limit the frequency of LeetCode API calls. You can use tools like `cron` to create a scheduled LeetCode-Bot.

## Configuration

* `git.username` & `git.email`: username and emails recorded in the git commits.
* `git.relCodeDir`: the relative path to the directory where code files will be committed in the repository.

## Design Details

### Why LeetCode Session

Since LeetCode uses Recaptcha to prevent from bots, we need to use the `LEETCODE_SESSION` cookie that is set when you sign in from the browser, to avoid the signin process.

### AWS Services

In general, we use [AWS Lambda](https://aws.amazon.com/lambda/) triggered periodically by [CloudWatch](https://aws.amazon.com/cloudwatch/) events, and [S3](https://aws.amazon.com/s3/) buckets to store Bot history.

### Is It Free?

Well, these services have free tiers and in normal cases it should be fine.

### Why One Iteration At A Time

This is to avoid long running time as AWS Lambda [charges based on the running time and memory usage](https://aws.amazon.com/lambda/pricing/).


## License

Distributed under the MIT License. See LICENSE for more information.

---

TODOs:
- [ ] Telegram Notification
- [ ] DynamoDB instead of S3
