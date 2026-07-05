import * as overrideService from '../services/overrideService.js';
import { emit } from '../socket/emitter.js';
import { EVENTS, ROOMS } from '../socket/events.js';

const createPriceChangeOverride = async (req, res, next) => {
  try {
    const {
      productId, productName, sku, defaultPrice, sellingPrice, variancePercent,
      reason, saleContext, items, varianceItems,
    } = req.body;
    const override = await overrideService.createPriceChangeOverride(req.user._id, {
      productId, productName, sku, defaultPrice, sellingPrice, variancePercent,
      reason, saleContext, items, varianceItems,
    });
    res.status(201).json(override);
    emit(ROOMS.MANAGERS, EVENTS.OVERRIDE_NEW, {
      type: 'PRICE_CHANGE', overrideId: override._id,
      requestedBy: { id: req.user._id, name: req.user.name },
      productName, sellingPrice, defaultPrice, reason,
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

const createDiscountOverride = async (req, res, next) => {
  try {
    const {
      productId, productName, sku, amount,
      discountType, discountValue, discountAmount, reason, saleContext, items,
    } = req.body;
    const override = await overrideService.createDiscountOverride(req.user._id, {
      productId, productName, sku, amount,
      discountType, discountValue, discountAmount, reason, saleContext, items,
    });
    res.status(201).json(override);
    emit(ROOMS.MANAGERS, EVENTS.OVERRIDE_NEW, {
      type: 'DISCOUNT', overrideId: override._id,
      requestedBy: { id: req.user._id, name: req.user.name },
      productName, discountType, discountValue, reason,
    });
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
      saleId, saleItemId, quantity, paymentMethod, buyer, card, reason, buyerVerified, idempotencyKey, tipAmount,
    } = req.body;
    const override = await overrideService.createRefundRequest(req.user._id, {
      saleId, saleItemId, quantity, paymentMethod, buyer, card, reason, buyerVerified, idempotencyKey, tipAmount,
    });
    res.status(201).json(override);
    emit(ROOMS.MANAGERS, EVENTS.OVERRIDE_NEW, {
      type: 'REFUND', overrideId: override._id,
      requestedBy: { id: req.user._id, name: req.user.name },
      saleId, reason,
    });
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
    emit(ROOMS.MANAGERS, EVENTS.OVERRIDE_NEW, {
      type: 'VOID', overrideId: override._id,
      requestedBy: { id: req.user._id, name: req.user.name },
      saleId, reason,
    });
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
    emit(ROOMS.employee(override.requestedBy.toString()), EVENTS.OVERRIDE_RESOLVED, {
      overrideId: override._id, status: 'APPROVED',
      resolvedBy: { id: req.user._id, name: req.user.name },
    });
    emit(ROOMS.MANAGERS, EVENTS.NOTIFICATION, {
      message: `Override #${override._id} approved`, type: 'success',
    });
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
    emit(ROOMS.employee(override.requestedBy.toString()), EVENTS.OVERRIDE_RESOLVED, {
      overrideId: override._id, status: 'DENIED',
      resolvedBy: { id: req.user._id, name: req.user.name },
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

export { createRefundRequest, createDiscountOverride, createVoidRequest, createPriceChangeOverride, getOverrideById, getOverrides, getMyOverrides, approveOverride, denyOverride };
