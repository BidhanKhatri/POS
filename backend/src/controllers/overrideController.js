import * as overrideService from '../services/overrideService.js';

const createDiscountOverride = async (req, res, next) => {
  try {
    const { productId, productName, sku, amount, discountType, discountValue, discountAmount, reason, saleContext } = req.body;
    const override = await overrideService.createDiscountOverride(req.user._id, {
      productId, productName, sku, amount, discountType, discountValue, discountAmount, reason, saleContext,
    });
    res.status(201).json(override);
  } catch (error) {
    res.status(400);
    next(error);
  }
};

const getOverrideById = async (req, res, next) => {
  try {
    const override = await overrideService.getOverrideById(req.params.id, req.user._id);
    res.json(override);
  } catch (error) {
    res.status(404);
    next(error);
  }
};

const createRefundRequest = async (req, res, next) => {
  try {
    const {
      saleId, saleItemId, quantity, paymentMethod, buyer, card, reason, buyerVerified, idempotencyKey,
    } = req.body;
    const override = await overrideService.createRefundRequest(req.user._id, {
      saleId, saleItemId, quantity, paymentMethod, buyer, card, reason, buyerVerified, idempotencyKey,
    });
    res.status(201).json(override);
  } catch (error) {
    res.status(400);
    next(error);
  }
};

const createVoidRequest = async (req, res, next) => {
  try {
    const { saleId, reason } = req.body;
    const override = await overrideService.createVoidRequest(req.user._id, { saleId, reason });
    res.status(201).json(override);
  } catch (error) {
    res.status(400);
    next(error);
  }
};

const getOverrides = async (req, res, next) => {
  try {
    const overrides = await overrideService.getOverrides(req.query.status);
    res.status(200).json(overrides);
  } catch (error) {
    next(error);
  }
};

const getMyOverrides = async (req, res, next) => {
  try {
    const overrides = await overrideService.getMyOverrides(req.user._id);
    res.status(200).json(overrides);
  } catch (error) {
    next(error);
  }
};

const approveOverride = async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      res.status(400);
      throw new Error('Manager PIN is required');
    }
    const override = await overrideService.approveOverride(req.params.id, req.user._id, pin);
    res.status(200).json(override);
  } catch (error) {
    res.status(400);
    next(error);
  }
};

const denyOverride = async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      res.status(400);
      throw new Error('Manager PIN is required');
    }
    const override = await overrideService.denyOverride(req.params.id, req.user._id, pin);
    res.status(200).json(override);
  } catch (error) {
    res.status(400);
    next(error);
  }
};

export { createRefundRequest, createDiscountOverride, createVoidRequest, getOverrideById, getOverrides, getMyOverrides, approveOverride, denyOverride };
