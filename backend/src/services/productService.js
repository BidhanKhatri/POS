import Product from '../models/Product.js';
import InventoryMovement from '../models/InventoryMovement.js';

const getProducts = async () => {
  return await Product.find({ isActive: true }).sort({ name: 1 });
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

  // Never allow stockQty to be set directly via update — use addStockMovement instead
  const { stockQty, ...safeData } = productData;
  Object.assign(product, safeData);
  await product.save();
  return product;
};

const deleteProduct = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw new Error('Product not found');
  product.isActive = false;
  await product.save();
  return product;
};

const addStockMovement = async (productId, { movementType, quantity, remarks, createdBy }) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  const beforeQty = product.stockQty;
  const delta = movementType === 'RESTOCK' ? Math.abs(quantity) : -Math.abs(quantity);
  const afterQty = Math.max(0, beforeQty + delta);

  product.stockQty = afterQty;
  await product.save();

  await InventoryMovement.create({
    productId: product._id,
    movementType,
    quantity: delta,
    beforeQty,
    afterQty,
    remarks: remarks || '',
    createdBy,
  });

  return product;
};

const getProductMovements = async (productId) => {
  return await InventoryMovement.find({ productId })
    .sort({ createdAt: -1 })
    .limit(50);
};

export {
  getProducts,
  getProductBySkuOrBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  addStockMovement,
  getProductMovements,
};
