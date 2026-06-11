import Product from '../models/Product.js';

const getProducts = async () => {
  return await Product.find({ isActive: true });
};

const getProductBySkuOrBarcode = async (identifier) => {
  return await Product.findOne({
    $or: [{ sku: identifier }, { barcode: identifier }],
    isActive: true,
  });
};

const createProduct = async (productData) => {
  return await Product.create(productData);
};

const updateProduct = async (id, productData) => {
  const product = await Product.findById(id);
  if (!product) throw new Error('Product not found');
  
  Object.assign(product, productData);
  await product.save();
  return product;
};

export { getProducts,
  getProductBySkuOrBarcode,
  createProduct,
  updateProduct, };
