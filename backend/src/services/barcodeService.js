import Barcode from '../models/Barcode.js';
import Product from '../models/Product.js';
import AuditLog from '../models/AuditLog.js';

function generateBarcodeValue() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `POS${ts}${rand}`;
}

async function getUniqueValue(maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    const value = generateBarcodeValue();
    const conflict = await Barcode.findOne({ barcodeValue: value }).lean();
    if (!conflict) return value;
  }
  throw new Error('Failed to generate a unique barcode value. Please try again.');
}

export async function generateBarcode(productId, userId, userRole, ipAddress) {
  const product = await Product.findById(productId).lean();
  if (!product) throw new Error('Product not found');
  if (!product.isActive) throw new Error('Cannot generate barcode for an inactive product');

  const existing = await Barcode.findOne({ productId }).lean();
  if (existing) {
    throw new Error('A barcode already exists for this product. Use regenerate to replace it.');
  }

  const barcodeValue = await getUniqueValue();

  const barcode = await Barcode.create({
    productId,
    sku: product.sku,
    productName: product.name,
    barcodeValue,
    generatedBy: userId,
  });

  await Product.findByIdAndUpdate(productId, { barcode: barcodeValue });

  await AuditLog.create({
    action: 'BARCODE_GENERATED',
    entity: 'Barcode',
    entityId: barcode._id,
    afterData: { barcodeValue, productId, sku: product.sku, productName: product.name },
    performedBy: userId,
    role: userRole,
    ipAddress,
  });

  return barcode;
}

export async function regenerateBarcode(barcodeId, userId, userRole, ipAddress) {
  const barcode = await Barcode.findById(barcodeId);
  if (!barcode) throw new Error('Barcode not found');

  const oldValue = barcode.barcodeValue;
  const newValue = await getUniqueValue();

  barcode.regenerationHistory.push({
    oldValue,
    regeneratedBy: userId,
    regeneratedAt: new Date(),
  });
  barcode.barcodeValue = newValue;
  await barcode.save();

  await Product.findByIdAndUpdate(barcode.productId, { barcode: newValue });

  await AuditLog.create({
    action: 'BARCODE_REGENERATED',
    entity: 'Barcode',
    entityId: barcode._id,
    beforeData: { barcodeValue: oldValue },
    afterData: { barcodeValue: newValue },
    performedBy: userId,
    role: userRole,
    ipAddress,
  });

  return barcode;
}

export async function getBarcodes({ search, page = 1, limit = 20 }) {
  const query = { isActive: true };
  if (search) {
    const re = new RegExp(search.trim(), 'i');
    query.$or = [{ sku: re }, { productName: re }, { barcodeValue: re }];
  }

  const skip = (page - 1) * limit;

  const [barcodes, total] = await Promise.all([
    Barcode.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('generatedBy', 'name employeeCode')
      .populate('lastPrintedBy', 'name employeeCode')
      .lean(),
    Barcode.countDocuments(query),
  ]);

  return {
    barcodes,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function getBarcodeByValue(value) {
  const barcode = await Barcode.findOne({
    $or: [{ barcodeValue: value }, { sku: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }],
    isActive: true,
  })
    .populate('productId', 'name sku price stockQty isActive categoryId')
    .lean();

  if (!barcode) throw new Error('Barcode not found');
  return barcode;
}

export async function getBarcodeById(id) {
  const barcode = await Barcode.findById(id)
    .populate('generatedBy', 'name employeeCode')
    .populate('lastPrintedBy', 'name employeeCode')
    .populate('productId', 'name sku price stockQty isActive')
    .lean();

  if (!barcode) throw new Error('Barcode not found');
  return barcode;
}

export async function trackPrint(barcodeId, userId, userRole, ipAddress) {
  const barcode = await Barcode.findByIdAndUpdate(
    barcodeId,
    {
      $inc: { printCount: 1 },
      lastPrintedAt: new Date(),
      lastPrintedBy: userId,
    },
    { new: true }
  );
  if (!barcode) throw new Error('Barcode not found');

  await AuditLog.create({
    action: 'BARCODE_PRINTED',
    entity: 'Barcode',
    entityId: barcode._id,
    afterData: { printCount: barcode.printCount, barcodeValue: barcode.barcodeValue },
    performedBy: userId,
    role: userRole,
    ipAddress,
  });

  return barcode;
}

export async function getProductsWithBarcodeStatus({ search, page = 1, limit = 20 }) {
  const productQuery = { isActive: true };
  if (search) {
    const re = new RegExp(search.trim(), 'i');
    productQuery.$or = [{ name: re }, { sku: re }];
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(productQuery)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .select('name sku price stockQty isActive barcode')
      .lean(),
    Product.countDocuments(productQuery),
  ]);

  const productIds = products.map((p) => p._id);
  const barcodes = await Barcode.find({ productId: { $in: productIds }, isActive: true })
    .select('productId barcodeValue barcodeType createdAt generatedBy')
    .populate('generatedBy', 'name')
    .lean();

  const barcodeMap = {};
  barcodes.forEach((b) => {
    barcodeMap[b.productId.toString()] = b;
  });

  const enriched = products.map((p) => ({
    ...p,
    barcodeRecord: barcodeMap[p._id.toString()] || null,
  }));

  return { products: enriched, total, page, pages: Math.ceil(total / limit) };
}
