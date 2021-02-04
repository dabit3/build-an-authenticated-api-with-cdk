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