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