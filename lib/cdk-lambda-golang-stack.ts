import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';

export class CdkLambdaGolangStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const dynamoTable = new dynamodb.Table(this, 'userTable', {
      tableName: 'User',
      partitionKey: {
        name: 'UserID',
        type: dynamodb.AttributeType.STRING
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const makeLambdaResource = (functionID: string) => {
      return new lambda.Function(this, functionID, {
        functionName: functionID,
        code: new lambda.AssetCode(`lambda/${functionID}/bin`),
        handler: functionID,
        runtime: lambda.Runtime.GO_1_X,
        environment: {
          TABLE_NAME: dynamoTable.tableName,
          REGION: "ap-northeast-1"
        }
      });
    }
    const getLambda = makeLambdaResource("getFunction")
    const fetchLambda = makeLambdaResource("fetchFunction")
    const putLambda = makeLambdaResource("putFunction")
    const deleteLambda = makeLambdaResource("deleteFunction")

    dynamoTable.grantReadWriteData(getLambda);
    dynamoTable.grantReadWriteData(fetchLambda);
    dynamoTable.grantReadWriteData(putLambda);
    dynamoTable.grantReadWriteData(deleteLambda);
    const api = new apigateway.RestApi(this, 'golangRestApi', {});

    // path: /users
    const users = api.root.addResource('users');
    const fetchIntegration = new apigateway.LambdaIntegration(fetchLambda);
    users.addMethod('GET', fetchIntegration);
    addCorsOptions(users);

    // path: /user
    const user = api.root.addResource('user');
    const putIntegration = new apigateway.LambdaIntegration(putLambda);
    user.addMethod('POST', putIntegration);
    addCorsOptions(user);

    // path: /user/{userID}
    const userByID = user.addResource('{userID}');
    const getIntegration = new apigateway.LambdaIntegration(getLambda);
    userByID.addMethod('GET', getIntegration);
    const deleteIntegration = new apigateway.LambdaIntegration(deleteLambda);
    userByID.addMethod('DELETE', deleteIntegration);
    addCorsOptions(userByID);
  }
}

export function addCorsOptions(apiResource: apigateway.IResource) {
  apiResource.addMethod('OPTIONS', new apigateway.MockIntegration({
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Credentials': "'false'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,POST,DELETE'",
      },
    }],
    passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
    requestTemplates: {
      "application/json": "{\"statusCode\": 200}"
    },
  }), {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Credentials': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      },
    }]
  })
}
