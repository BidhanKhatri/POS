import * as productService from '../services/productService.js';
import { emit } from '../socket/emitter.js';
import { EVENTS, ROOMS } from '../socket/events.js';
import Product from '../models/Product.js';
import { uploadBuffer, deleteFile } from '../services/imagekitService.js';

const LOW_STOCK_THRESHOLD = 10;

const getProducts = async (req, res, next) => {
  try {
    const products = await productService.getProducts();
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400);
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.status(200).json(product);
  } catch (error) {
    res.status(400);
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await productService.deleteProduct(req.params.id);
    res.status(200).json({ message: 'Product deactivated', product });
  } catch (error) {
    res.status(404);
    next(error);
  }
};

const addStockMovement = async (req, res, next) => {
  try {
    const { movementType, quantity, remarks } = req.body;
    if (!movementType || !quantity) {
      return res.status(400).json({ message: 'movementType and quantity are required' });
    }
    const product = await productService.addStockMovement(req.params.id, {
      movementType,
      quantity,
      remarks,
      createdBy: req.user._id,
    });
    res.status(200).json(product);

    // Broadcast low-stock alert after a SALE/ADJUSTMENT reduces stock
    if (product.trackStock && product.stockQty <= LOW_STOCK_THRESHOLD) {
      emit(ROOMS.MANAGERS, EVENTS.INVENTORY_LOWSTOCK, {
        productId: product._id,
        name:      product.name,
        sku:       product.sku,
        stockQty:  product.stockQty,
        threshold: LOW_STOCK_THRESHOLD,
      });
    }

    // Barcode stock sync — always broadcast so scanner UIs stay current
    emit(ROOMS.STORE, EVENTS.BARCODE_STOCK_SYNC, {
      productId: product._id,
      sku:       product.sku,
      barcode:   product.barcode,
      stockQty:  product.stockQty,
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

const getProductMovements = async (req, res, next) => {
  try {
    const movements = await productService.getProductMovements(req.params.id);
    res.status(200).json(movements);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/products/:id/image
const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    if (product.image?.fileId) await deleteFile(product.image.fileId);

    const imageData = await uploadBuffer({
      buffer:   req.file.buffer,
      fileName: `product-${product._id}`,
      folder:   '/pos/products',
      tags:     ['product', product.sku],
    });

    product.image = imageData;
    await product.save();

    res.json({ success: true, data: { image: product.image } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id/image
const deleteProductImage = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    if (product.image?.fileId) await deleteFile(product.image.fileId);

    product.image = { url: null, fileId: null, fileName: null };
    await product.save();

    res.json({ success: true, message: 'Product image removed.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/products/:id/images — append one image to the images[] array
const addProductImageToArray = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const imageData = await uploadBuffer({
      buffer:   req.file.buffer,
      fileName: `product-${product._id}-${Date.now()}`,
      folder:   '/pos/products',
      tags:     ['product', product.sku],
    });

    product.images = [...(product.images ?? []), imageData];
    if (!product.image?.url) product.image = imageData;
    await product.save();

    res.json({ success: true, data: imageData });
  } catch (err) { next(err); }
};

// DELETE /api/products/:id/images/:fileId — remove one from images[]
const removeProductImageFromArray = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const { fileId } = req.params;
    await deleteFile(fileId);

    product.images = (product.images ?? []).filter(img => img.fileId !== fileId);
    if (product.image?.fileId === fileId) {
      product.image = product.images[0] ?? { url: null, fileId: null, fileName: null };
    }
    await product.save();

    res.json({ success: true });
  } catch (err) { next(err); }
};

export { getProducts, createProduct, updateProduct, deleteProduct, addStockMovement, getProductMovements, uploadProductImage, deleteProductImage, addProductImageToArray, removeProductImageFromArray };
