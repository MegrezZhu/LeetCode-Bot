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
bucketName = config['AWS']['S3']['bucketName']

s3 = boto3.client('s3')
lm = boto3.client('lambda')
Path.mkdir(root / 'dist', exist_ok=True)


print('Rebuilding packages & Updating Lambda Function...')
print('------------------------------------------------------')

try:
    os.chdir(root)
    os.system('./pack.sh')
    packPath = root / 'dist/lambda.zip'

    with open(packPath, 'rb') as f:
        s3.put_object(
            Bucket=bucketName,
            Key='lambda.zip',
            Body=f
        )

    lm.update_function_code(
        FunctionName=config['AWS']['Lambda']['functionName'],
        S3Bucket=bucketName,
        S3Key='lambda.zip',
    )

    print('------------------------------------------------------')
    print('Success!')
except ClientError as e:
    print('Error:', e)
