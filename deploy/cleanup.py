import os
import boto3
from botocore.exceptions import ClientError
from pathlib import Path
import yaml
import json
import shutil


root = Path(__file__).absolute().parent
config = yaml.load(
    (root / './config.yaml').read_text(),
    Loader=yaml.FullLoader
)

print('Disabling & Removing all Generated Services & Files...')
print('------------------------------------------------------')

print('removing generated files...', end='')
dist = root / 'dist'
Path.mkdir(dist, exist_ok=True)
shutil.rmtree(dist)
print('done.')


print('removing CloudWatch Event Rule...', end='')
try:
    boto3.client('events').delete_rule(Name='LeetCode-Bot-Trigger')
except:
    pass
print('done.')

print('removing Lambda Function...', end='')
try:
    boto3.client('lambda').delete_function(
        FunctionName=config['AWS']['Lambda']['functionName']
    )
except:
    pass
print('done.')

print('removing IAM Policy & Role...', end='')
try:
    iam = boto3.client('iam')
    roleName = 'LeetCode-Bot-Role'
    policyArn = None
    for policy in iam.list_attached_role_policies(RoleName=roleName)['AttachedPolicies']:
        if policy['PolicyName'] == 'LeetCode-Bot-Policy':
            policyArn = policy['PolicyArn']
        iam.detach_role_policy(
            RoleName=roleName,
            PolicyArn=policy['PolicyArn']
        )
    iam.delete_role(RoleName='LeetCode-Bot-Role')
    iam.delete_policy(PolicyArn=policyArn)
except:
    pass
print('done.')

print('removing S3 Bucket...', end='')
try:
    bucket = boto3.resource('s3').Bucket(config['AWS']['S3']['bucketName'])
    bucket.objects.all().delete()
    bucket.delete()
except:
    pass
print('done.')

print('------------------------------------------------------')
