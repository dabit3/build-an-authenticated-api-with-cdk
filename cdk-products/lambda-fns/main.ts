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