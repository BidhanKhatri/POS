import * as productService from '../services/productService.js';

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

export { getProducts, createProduct, updateProduct, deleteProduct, addStockMovement, getProductMovements };
