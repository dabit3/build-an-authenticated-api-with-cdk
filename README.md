## Build an Authenticated GraphQL API on AWS with CDK

In this workshop you'll learn how to build and deploy an authenticated GraphQL API on AWS with Amazon Cognito, AWS AppSync, AWS Lambda, and Amazon DynamoDB.

The API will implement a combination of private and public access to build out a basic Product API for an E Commerce back end.

The API will also be implementing group authorization, enabling only users of an "Admin" group to be able to perform create, update, or delete mutations and everyone to be able to query for products by ID, a list of products, or products by category by utilizing a DynamoDB GSI (Global Secondary Index).

### Overview

When you think of many types of applications like Instagram, Twitter, or Facebook, they consist of a combination of public and private access. For example, all users can view a product, but only an `Admin` can update or delete a product.

The app we will be building will implement a similar API where items (products), by default, are publicly viewable but only `Admins` can create, update, or delete items (products).

We'll start from scratch, creating the CDK project. We'll then build out and configure our cloud infrastructure to build out an authenticated Product API on AWS AppSync with Amazon Cognito.

Next, we'll create a Lambda data source to map the GraphQL operations into, setting up configuration like the memory size as well as the API name.

Finally we'll add the DynamoDB table with a global secondary index to enable an additional data access pattern.

This workshop should take you anywhere between 1 to 3 hours to complete.

### Environment & prerequisites

Before we begin, make sure you have the following:

- Node.js v10.3.0 or later  installed
- A valid and confirmed AWS account
- You must provide IAM credentials and an AWS Region to use AWS CDK, if you have not already done so. If you have the AWS CLI installed, the easiest way to satisfy this requirement is to [install the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) and issue the following command:

```sh
aws configure
```

> When configuring the IAM user, be sure to give them Administrator Access Privileges

![IAM Permissions](privileges.png)

We will be working from a terminal using a [Bash shell](https://en.wikipedia.org/wiki/Bash_(Unix_shell)) to run CDK CLI commands to provision infrastructure and also to run a local version of the Next.js app and test it in a web browser.

> To view the CDK pre-requisite docs, click [here](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)

### Background needed / level

This workshop is intended for intermediate to advanced JavaScript developers wanting to learn more about full stack serverless development.

While some level of React and GraphQL is helpful, because all front end code provided is copy and paste-able, this workshop requires zero previous knowledge about React or GraphQL.

### Topics we'll be covering:

- CDK
- GraphQL API with AWS AppSync
- Authentication with Amazon Cognito
- Authorization in AWS Lambda
- Data persistence with DynamoDB
- Business logic running in AWS Lambda
- Deleting the resources

## Getting Started

To get started, we first need to create a base folder for the app. Create a folder called __cdk-next__ and change into it.

### Installing the CLI & Initializing a new CDK Project

Now we'll install the CDK CLI:

```sh
npm install -g aws-cdk
```

### Initializing A New Project

```sh
mkdir cdk-products
cd cdk-products
cdk init --language=typescript
```

The CDK CLI has initialized a new project.

To build the project at any time, you can run the build command:

```sh
npm run build
```

To view the resources to be deployed or changes in infrastructure at any time, you can run the CDK diff command:

```sh
cdk diff
```

Next, install the CDK dependencies we'll be using using either npm or yarn:

```sh
npm install @aws-cdk/aws-cognito @aws-cdk/aws-appsync @aws-cdk/aws-lambda @aws-cdk/aws-dynamodb
```

## Creating the authentication service with CDK

When working with CDK, the code for the main stack lives in the __lib__ directory. When we created the project, the CLI created a file named __lib/cdk-products-stack.ts__ where our stack code is written.

Open the file and let's first import the constructs and classes we'll need for our project:

```typescript
// lib/cdk-products-stack.ts
import * as cdk from '@aws-cdk/core'
import * as cognito from '@aws-cdk/aws-cognito'
import * as appsync from '@aws-cdk/aws-appsync'
import * as ddb from '@aws-cdk/aws-dynamodb'
import * as lambda from '@aws-cdk/aws-lambda'
```

Next, update the class with the following code to create the Amazon Cognito authentication service:

```ts
// lib/cdk-products-stack.ts
export class CdkProductsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new cognito.UserPool(this, 'cdk-products-user-pool', {
      selfSignUpEnabled: true,
      accountRecovery: cognito.AccountRecovery.PHONE_AND_EMAIL,
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE
      },
      autoVerify: {
        email: true
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true
        }
      }
    })

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool
    })

  }
}
```

This code will create a Cognito User Pool that will enable the user to sign in with a username, email address, and password.

A `userPoolClient` will also be created enabling client applications, in our case the Next.js app, to interact with the service.

## Adding the AWS AppSync GraphQL API with CDK

Next, we'll need to create the AppSync GraphQL API.

To create the API, add the following code below the User Pool definition in __lib/cdk-products-stack.ts__.

```typescript
const api = new appsync.GraphqlApi(this, 'cdk-product-app', {
  name: "cdk-product-api",
  logConfig: {
    fieldLogLevel: appsync.FieldLogLevel.ALL,
  },
  schema: appsync.Schema.fromAsset('./graphql/schema.graphql'),
  authorizationConfig: {
    defaultAuthorization: {
      authorizationType: appsync.AuthorizationType.API_KEY,
      apiKeyConfig: {
        expires: cdk.Expiration.after(cdk.Duration.days(365))
      }
    },
    additionalAuthorizationModes: [{
      authorizationType: appsync.AuthorizationType.USER_POOL,
      userPoolConfig: {
        userPool,
      }
    }]
  },
})
```

This code will create an AppSync GraphQL API with two types of authentication: API Key (public access) and Amazon Cognito User Pool (private, authenticated access).

Our app will be using a combination of public and private access to achieve a common real world use case that combines the two types of access.

For example, we want all users to be able to query for products whether they are signed in or not, but if a user is signed in and part of an __Admin__ group, we want to give them the correct access so that they can create, update or delete products.

## Adding the GraphQL schema

In the code where we defined the GraphQL API, we set the GraphQL schema directory as __./graphql/schema.graphql__, but we have not yet created the schema, so let's do that now.

In the root of the CDK project, create a folder called __graphql__ and a file in that folder named __schema.graphql__. In that file, add the following code:

```graphql
# graphql/schema.graphql
type Product @aws_api_key @aws_cognito_user_pools {
  id: ID!
  name: String!
  description: String!
  price: Float!
  category: String!
  sku: String
  inventory: Int
}

input ProductInput {
  id: ID
  name: String!
  description: String!
  price: Float!
  category: String!
  sku: String
  inventory: Int
}

input UpdateProductInput {
  id: ID!
  name: String
  description: String
  price: Float
  category: String
  sku: String
  inventory: Int
}

type Query {
  getProductById(productId: ID!): Product
    @aws_api_key @aws_cognito_user_pools
  listProducts: [Product]
    @aws_api_key @aws_cognito_user_pools
  productsByCategory(category: String!): [Product]
    @aws_api_key @aws_cognito_user_pools
}

type Mutation {
  createProduct(product: ProductInput!): Product
    @aws_cognito_user_pools
  deleteProduct(productId: ID!): ID
    @aws_cognito_user_pools
  updateProduct(product: UpdateProductInput!): Product
    @aws_cognito_user_pools
}

type Subscription {
  onCreateProduct: Product
    @aws_subscribe(mutations: ["createProduct"])
}
```

This schema defines the `Product` type that we'll be needing along with all of the input types and operations for creating, updating, and reading `Product`s.

There are also authorization rules set in place by using `@aws_api_key` and `@aws_cognito_user_pools`.

`@aws_api_key` enables public access.

`@aws_cognito_user_pools` configures private access for signed in users.

You will notice that some of the queries enable both public and private access, while the mutations only allow private access. That is because we only want to enable signed in users to be able to create or update `Product`s, and we will even be implementing businness logic that only allows users to update `Product`s if they are in an `Admin` group.

## Adding and configuring a Lambda function data source

Next, we'll create a Lambda function. The Lambda function will be the main datasource for the API, meaning we will map all of the GraphQL operations (mutations and subscriptions) into the function.

The function will then call the DynamoDB database to execute of the operations we will be needing for creating, reading, updating, and deleting items in the database.

To create the Lambda function, add the following code below the API definition in __lib/cdk-products-stack.ts__.

```typescript
// lib/cdk-products-stack.ts

// Create the function
const productLambda = new lambda.Function(this, 'AppSyncProductHandler', {
  runtime: lambda.Runtime.NODEJS_12_X,
  handler: 'main.handler',
  code: lambda.Code.fromAsset('lambda-fns'),
  memorySize: 1024
})

// Set the new Lambda function as a data source for the AppSync API
const lambdaDs = api.addLambdaDataSource('lambdaDatasource', productLambda)
```

## Adding the GraphQL resolvers

Now we will create the GraphQL resolver definitions that will map the requests coming into the API into the Lambda function.

To create the resolvers, add the following code below the Lambda function definition in __lib/cdk-products-stack.ts__.

```typescript
// lib/cdk-products-stack.ts
lambdaDs.createResolver({
  typeName: "Query",
  fieldName: "getProductById"
})

lambdaDs.createResolver({
  typeName: "Query",
  fieldName: "listProducts"
})

lambdaDs.createResolver({
  typeName: "Query",
  fieldName: "productsByCategory"
})

lambdaDs.createResolver({
  typeName: "Mutation",
  fieldName: "createProduct"
})

lambdaDs.createResolver({
  typeName: "Mutation",
  fieldName: "deleteProduct"
})

lambdaDs.createResolver({
  typeName: "Mutation",
  fieldName: "updateProduct"
})
```

## Creating the database

Next, we'll create the DynamoDB table that our API will be using to store data.

To create the database, add the following code below the GraphQL resolver definitions in __lib/cdk-products-stack.ts__.

```typescript
// lib/cdk-products-stack.ts
const productTable = new ddb.Table(this, 'CDKProductTable', {
  billingMode: ddb.BillingMode.PAY_PER_REQUEST,
  partitionKey: {
    name: 'id',
    type: ddb.AttributeType.STRING,
  },
})

// Add a global secondary index to enable another data access pattern
productTable.addGlobalSecondaryIndex({
  indexName: "productsByCategory",
  partitionKey: {
    name: "category",
    type: ddb.AttributeType.STRING,
  }
})

// Enable the Lambda function to access the DynamoDB table (using IAM)
productTable.grantFullAccess(productLambda)

// Create an environment variable that we will use in the function code
productLambda.addEnvironment('PRODUCT_TABLE', productTable.tableName)
```

## Printing out resource values for client-side configuration

If we’d like to consume the API from a client application we’ll need the values of the API key, GraphQL URL, Cognito User Pool ID, Cognito User Pool Client ID, and project region to configure our app.

We could go inside the AWS console for each service and find these values, but CDK enables us to print these out to our terminal upon deployment as well as map these values to an output file that we can later import in our web or mobile application and use with AWS Amplify.

To create these output values, add the following code below the DynamoDB table definition in __lib/cdk-products-stack.ts__.

```typescript
// lib/cdk-products-stack.ts

new cdk.CfnOutput(this, "GraphQLAPIURL", {
  value: api.graphqlUrl
})

new cdk.CfnOutput(this, 'AppSyncAPIKey', {
  value: api.apiKey || ''
})

new cdk.CfnOutput(this, 'ProjectRegion', {
  value: this.region
})

new cdk.CfnOutput(this, "UserPoolId", {
  value: userPool.userPoolId
})

new cdk.CfnOutput(this, "UserPoolClientId", {
  value: userPoolClient.userPoolClientId
})
```

## Adding the Lambda function code

The last thing we need to do is write the code for the Lambda function. The Lambda function will map the GraphQL operations coming in via the event into a call to the DynamoDB database. We will have functions for all of the operations defined in the GraphQL schema. The Lambda handler will read the GraphQL operation from the event object and call the appropriate function.

Create a folder named __lambda-fns__ in the root directory of the CDK project. Next, change into this directory and initialize a new __package.json__ file and install the uuid library:

```sh
cd lambda-fns
npm init --y
npm install uuid
```

In the __lambda-fns__ folder, create the following files:

- Product.ts
- main.ts
- createProduct.ts
- listProducts.ts
- getProductById.ts
- deleteProduct.ts
- updateProduct.ts
- productsByCategory.ts

### Product.ts

```typescript
type Product = {
  id: string,
  name: string,
  description: string,
  price: number,
  category: string,
  inventory: number
}

export default Product
```

The Product type should match the GraphQL Product type and will be used in a couple of our files.

### main.ts

```typescript
import getProductById from './getProductById'
import createProduct from './createProduct'
import listProducts from './listProducts'
import deleteProduct from './deleteProduct'
import updateProduct from './updateProduct'
import productsByCategory from './productsByCategory'
import Product from './Product'

type AppSyncEvent = {
  info: {
    fieldName: string
  },
  arguments: {
    productId: string,
    category: string
    product: Product,
  },
  identity: {
    username: string,
    claims: {
      [key: string]: string[]
    }
  }
}

exports.handler = async (event:AppSyncEvent) => {
  switch (event.info.fieldName) {
    case "getProductById": {
      return await getProductById(event.arguments.productId)
    }
    case "createProduct": {
      if (!checkForGroup(event, "Admin")) throw new Error('unauthorized')
      return await createProduct(event.arguments.product)
    }
    case "listProducts": {
      return await listProducts()
    }
    case "deleteProduct": {
      if (!checkForGroup(event, "Admin")) throw new Error('unauthorized')
      return await deleteProduct(event.arguments.productId)
    }
    case "updateProduct": {
      if (!checkForGroup(event, "Admin")) throw new Error('unauthorized')
      return await updateProduct(event.arguments.product)
    }
    case "productsByCategory": {
      return await productsByCategory(event.arguments.category)
    }
    default:
      return null
  }
}

function checkForGroup(event:AppSyncEvent, groupName:string) {
  if (event.identity) {
    if (event.identity.claims['cognito:groups']) {
      if (event.identity.claims['cognito:groups'].includes(groupName)) {
        return true
      }
    }
  }
  return false
}
```

The handler function will use the GraphQL operation available in the `event.info.fieldname` to call the various functions that will interact with the DynamoDB database.

The function will also be passed an `identity` object if the request has been authenticated by AppSync. If the event is coming from an authenticated request, then the `identity` object will be null.

The `checkForGroup` function checks to see if the user calling the API is a part of a specified group. In our example, we are checking for the `Admin` group which will be securely passed 

### createProduct.ts

```typescript
const AWS = require('aws-sdk')
const docClient = new AWS.DynamoDB.DocumentClient()
import Product from './Product'
const { v4: uuid } = require('uuid')

async function createProduct(product: Product) {
  if (!product.id) {
    product.id = uuid()
  }
  const params = {
    TableName: process.env.PRODUCT_TABLE,
    Item: product
  }
  try {
    await docClient.put(params).promise()
    return product
  } catch (err) {
    console.log('DynamoDB error: ', err)
    return null
  }
}

export default createProduct
```

The `createProduct` function takes in a `product` as an argument. We then check to see if there is already an `id` associated with it, if there is not an `id` we generate one.

### listProducts.ts

```typescript
const AWS = require('aws-sdk')
const docClient = new AWS.DynamoDB.DocumentClient()

async function listProducts() {
    const params = {
        TableName: process.env.PRODUCT_TABLE,
    }
    try {
        const data = await docClient.scan(params).promise()
        return data.Items
    } catch (err) {
        console.log('DynamoDB error: ', err)
        return null
    }
}

export default listProducts
```

### getProductByID.ts

```typescript
const AWS = require('aws-sdk')
const docClient = new AWS.DynamoDB.DocumentClient()

async function getProductById(productId: string) {
    const params = {
        TableName: process.env.PRODUCT_TABLE,
        Key: { id: productId }
    }
    try {
        const { Item } = await docClient.get(params).promise()
        return Item
    } catch (err) {
        console.log('DynamoDB error: ', err)
    }
}

export default getProductById
```

### deleteProduct.ts

```typescript
const AWS = require('aws-sdk')
const docClient = new AWS.DynamoDB.DocumentClient()

async function deleteProduct(productId: string) {
  const params = {
    TableName: process.env.PRODUCT_TABLE,
    Key: {
      id: productId
    }
}
  try {
    await docClient.delete(params).promise()
    return productId
  } catch (err) {
    console.log('DynamoDB error: ', err)
    return null
  }
}

export default deleteProduct
```

### updateProduct.ts

```typescript
const AWS = require('aws-sdk')
const docClient = new AWS.DynamoDB.DocumentClient()

type Params = {
  TableName: string | undefined,
  Key: string | {},
  ExpressionAttributeValues: any,
  ExpressionAttributeNames: any,
  UpdateExpression: string,
  ReturnValues: string,
}

async function updateProduct(product: any) {
  let params : Params = {
    TableName: process.env.PRODUCT_TABLE,
    Key: {
      id: product.id
    },
    UpdateExpression: "",
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {},
    ReturnValues: "UPDATED_NEW"
  }
  let prefix = "set "
  let attributes = Object.keys(product)
  for (let i=0; i<attributes.length; i++) {
    let attribute = attributes[i]
    if (attribute !== "id") {
      params["UpdateExpression"] += prefix + "#" + attribute + " = :" + attribute
      params["ExpressionAttributeValues"][":" + attribute] = product[attribute]
      params["ExpressionAttributeNames"]["#" + attribute] = attribute
      prefix = ", "
    }
  }
  try {
    await docClient.update(params).promise()
    return product
  } catch (err) {
    console.log('DynamoDB error: ', err)
    return null
  }
}

export default updateProduct
```

In this function there is logic that will build the `UpdateExpression` dynamically based on what is passed in. This way, we can allow the user to update `N` number of items without having to take into consideration how many items are being updated.

### productsByCategory.ts

```typescript
const AWS = require('aws-sdk')
const docClient = new AWS.DynamoDB.DocumentClient()

async function productsByCategory(category: string) {
  const params = {
    TableName: process.env.PRODUCT_TABLE,
    IndexName: 'productsByCategory',
    KeyConditionExpression: '#fieldName = :category',
    ExpressionAttributeNames: { '#fieldName': 'category' },
    ExpressionAttributeValues: { ':category': category },
  }

  try {
      const data = await docClient.query(params).promise()
      return data.Items
  } catch (err) {
      console.log('DynamoDB error: ', err)
      return null
  }
}

export default productsByCategory
```

This function calls a DynamoDB `query`, querying on the `productsByCategory` Global Secondary Index, returning an array of items that match the `category` name passed in as an argument.

## Deploying and testing

To see what will be deployed before making changes at any time, you can build the project and run the CDK `diff` command from the root of the CDK project:

```sh
npm run build && cdk diff
```

> Note that if you run this command from another location other than the root of the CDK project, it will not work.

At this point we are ready to deploy the back end. To do so, run the following command from your terminal in the root directory of your CDK project:

```sh
npm run build && cdk deploy -O ../next-frontend/cdk-exports.json
```

## Creating a user

Since this is an authenticated API, we need to create a user in order to test out the API.

To create a user, open the [Amazon Cognito Dashboard](Amazon Cognito Dashboard) and click on __Manage User Pools__.

Next, click on the User Pool that starts with `cdkproductsuserpool`. _Be sure that you are in the same region in the AWS Console that you created your project in, or else the User Pool will not show up._

In this dashboard, click __Users and groups__ to create a new user.

> Note that you do not need to input a phone number to create a new user.