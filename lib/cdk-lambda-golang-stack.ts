import { Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function, Runtime, AssetCode } from 'aws-cdk-lib/aws-lambda';
import { MockIntegration, RestApi, EndpointType, LambdaIntegration, IResource, PassthroughBehavior } from 'aws-cdk-lib/aws-apigateway';

export class CdkLambdaGolangStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const dynamoTable = new Table(this, 'userTable', {
      tableName: 'User',
      partitionKey: {
        name: 'UserID',
        type: AttributeType.STRING
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const makeLambdaResource = (functionID: string) => {
      return new Function(this, functionID, {
        functionName: functionID,
        code: new AssetCode(`lambda/${functionID}/bin`),
        handler: functionID,
        runtime: Runtime.GO_1_X,
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
    const api = new RestApi(this, 'golangRestApi', {});

    // path: /users
    const users = api.root.addResource('users');
    const fetchIntegration = new LambdaIntegration(fetchLambda);
    users.addMethod('GET', fetchIntegration);
    addCorsOptions(users);

    // path: /user
    const user = api.root.addResource('user');
    const putIntegration = new LambdaIntegration(putLambda);
    user.addMethod('POST', putIntegration);
    addCorsOptions(user);

    // path: /user/{userID}
    const userByID = user.addResource('{userID}');
    const getIntegration = new LambdaIntegration(getLambda);
    userByID.addMethod('GET', getIntegration);
    const deleteIntegration = new LambdaIntegration(deleteLambda);
    userByID.addMethod('DELETE', deleteIntegration);
    addCorsOptions(userByID);

  }
}

export function addCorsOptions(apiResource: IResource) {
  apiResource.addMethod('OPTIONS', new MockIntegration({
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Credentials': "'false'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,POST,DELETE'",
      },
    }],
    passthroughBehavior: PassthroughBehavior.NEVER,
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
