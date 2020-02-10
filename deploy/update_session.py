# update codes only...
import os
import boto3
from botocore.exceptions import ClientError
from pathlib import Path
import yaml
import json


root = Path(__file__).absolute().parent
config = yaml.load(
    (root / './config.yaml').read_text(),
    Loader=yaml.FullLoader
)

region = config['AWS']['region']

print('Uploading new LeetCode session...', end='')
try:
    boto3.client('lambda').update_function_configuration(
        FunctionName=config['AWS']['Lambda']['functionName'],
        Environment={
            'Variables': {
                'MODE': 'AWS',
                'GIT_SSH_COMMAND': 'ssh -o UserKnownHostsFile=/tmp/leetcode-bot/.ssh/known_hosts -i /tmp/leetcode-bot/.ssh/id_rsa_git -o StrictHostKeyChecking=no',
                'CONFIG': json.dumps(config),
                'LEETCODE_SESSION': config['leetcodeSession']
            }
        },
    )
    print('done')
except ClientError as e:
    print('')
    print('Error:', e)
