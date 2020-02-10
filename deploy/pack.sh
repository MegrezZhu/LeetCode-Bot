#!/bin/bash
SCRIPT_PATH=$(dirname `which $0`)
cd $SCRIPT_PATH

npm run build;
mkdir -p dist/lambda;
cp -r ../dist/* ./dist/lambda/;
cp ../package.json ./dist/lambda/;
cd dist/lambda;
npm i --prod;
zip -rq ../lambda.zip *;
cd ..; # at dist
