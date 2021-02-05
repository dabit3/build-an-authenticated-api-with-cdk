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
    case "getProductById":
      return await getProductById(event.arguments.productId)
    case "createProduct":
      return await createProduct(event.arguments.product)
    case "listProducts":
      return await listProducts()
    case "deleteProduct":
      return await deleteProduct(event.arguments.productId)
    case "updateProduct":
      return await updateProduct(event.arguments.product)
    case "productsByCategory":
      return await productsByCategory(event.arguments.category)
    default:
      return null
  }
}