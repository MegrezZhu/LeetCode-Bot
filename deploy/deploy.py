import os
import boto3
from botocore.exceptions import ClientError
from pathlib import Path
import yaml
import json
from random import choice
from string import ascii_uppercase


root = Path(__file__).absolute().parent
config = yaml.load(
    (root / './config.yaml').read_text(),
    Loader=yaml.FullLoader
)

region = config['AWS']['region']
bucketName = config['AWS']['S3']['bucketName']

s3 = boto3.client('s3')
lm = boto3.client('lambda')
Path.mkdir(root / 'dist', exist_ok=True)

newKey = False

interval = 10  # in minutes


def prepareBucket():
    s3.create_bucket(
        Bucket=bucketName,
        ACL='private',
        CreateBucketConfiguration={
            'LocationConstraint': region
        }
    )
    s3.put_public_access_block(
        Bucket=bucketName,
        PublicAccessBlockConfiguration={
            'BlockPublicAcls': True,
            'IgnorePublicAcls': True,
            'BlockPublicPolicy': True,
            'RestrictPublicBuckets': True
        }
    )

    keyPath = root / 'dist/id_rsa_git'
    if not keyPath.exists():
        os.system(f'ssh-keygen -t rsa -b 4096 -N \'\' -f {keyPath} -C noname')
        newKey = True
    with open(keyPath, 'rb') as f:
        s3.put_object(
            Bucket=bucketName,
            Key='id_rsa_git',
            Body=f
        )


def prepareIAM():
    policy = json.loads(Path(root / 'policy.json').read_text())
    policy['Statement'][0]['Resource'].append(f'arn:aws:s3:::{bucketName}')
    policy['Statement'][0]['Resource'].append(f'arn:aws:s3:::{bucketName}/*')

    iam = boto3.client('iam')
    policyArn = iam.create_policy(
        PolicyName='LeetCode-Bot-Policy',
        PolicyDocument=json.dumps(policy),
        Description='Grants the permission for LeetCode-Bot Lambda'
    )['Policy']['Arn']
    res = iam.create_role(
        RoleName='LeetCode-Bot-Role',
        AssumeRolePolicyDocument='{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Principal": { "Service": "lambda.amazonaws.com" }, "Action": "sts:AssumeRole" } ] }',
        Description='Grants the permission for LeetCode-Bot Lambda'
    )
    roleArn = res['Role']['Arn']
    iam.attach_role_policy(
        RoleName='LeetCode-Bot-Role',
        PolicyArn=policyArn
    )

    return roleArn


def prepareLambda(roleArn):
    os.chdir(root)
    os.system('./pack.sh')
    packPath = root / 'dist/lambda.zip'

    print('     uploading function package...', end='')
    with open(packPath, 'rb') as f:
        s3.put_object(
            Bucket=bucketName,
            Key='lambda.zip',
            Body=f
        )
    print('done.')

    funcArn = lm.create_function(
        FunctionName=config['AWS']['Lambda']['functionName'],
        Runtime='nodejs12.x',
        Role=roleArn,
        Handler='index.run',
        Code={
            'S3Bucket': bucketName,
            'S3Key': 'lambda.zip',
        },
        Description='Lambda of LeetCode-Bot',
        Timeout=60,
        MemorySize=256,
        Environment={
            'Variables': {
                'MODE': 'AWS',
                'GIT_SSH_COMMAND': 'ssh -o UserKnownHostsFile=/tmp/leetcode-bot/.ssh/known_hosts -i /tmp/leetcode-bot/.ssh/id_rsa_git -o StrictHostKeyChecking=no',
                'CONFIG': json.dumps(config),
                'LEETCODE_SESSION': config['leetcodeSession']
            }
        },
        Layers=[
            # https://github.com/lambci/git-lambda-layer
            f'arn:aws:lambda:{region}:553035198032:layer:git-lambda2:4',
        ]
    )['FunctionArn']

    return funcArn


def prepareTrigger(funcArn):
    ev = boto3.client('events')

    ruleArn = ev.put_rule(
        Name='LeetCode-Bot-Trigger',
        ScheduleExpression=f'rate({interval} minutes)',
        State='ENABLED',
        Description='Automatically invoke LeetCode-Bot at a fixed rate.',
    )['RuleArn']

    ev.put_targets(
        Rule='LeetCode-Bot-Trigger',
        Targets=[{
            'Id': '1',
            'Arn': funcArn,
        }]
    )

    lm.add_permission(
        FunctionName=config['AWS']['Lambda']['functionName'],
        StatementId=''.join(choice(ascii_uppercase) for _ in range(12)),
        Action='lambda:InvokeFunction',
        Principal='events.amazonaws.com',
        SourceArn=ruleArn
    )


print('Building & Deploying...')
print('------------------------------------------------------')
try:
    print('Preparing S3 bucket...', end='')
    prepareBucket()
    print('done.')

    print('Preparing IAM policy & role...', end='')
    roleArn = prepareIAM()
    print('done.')

    print('Preparing Lambda function...')
    funcArn = prepareLambda(roleArn)
    print('done.')

    print('Preparing CloudWatch event trigger...', end='')
    prepareTrigger(funcArn)
    print('done.')

    print('------------------------------------------------------')

    if newKey:
        print('New SSH key generated.')
        print(f"Don't forget to add the generated public key as a Deploy Key of your repo!")
        print(f'Key location: {root / "dist/id_rsa_git.pub"}')
        print(f'Key Value:')
        print('------------------------------------------------------')
        print((root / 'dist/id_rsa_git.pub').read_text())
        print('------------------------------------------------------')

except ClientError as e:
    print('Error:', e)
