import * as svc from '../services/customerService.js';
import Customer from '../models/Customer.js';
import { uploadBuffer, deleteFile } from '../services/imagekitService.js';

const send = (res, fn) => fn.then(d => res.json(d)).catch(e => {
  const status = e.message.includes('not found') ? 404
    : e.message.includes('already exists') || e.message.includes('required') ? 400
    : 500;
  res.status(status).json({ message: e.message });
});

export const list = (req, res) => {
  const { page = 1, limit = 25, search = '', startDate = '', endDate = '' } = req.query;
  send(res, svc.listCustomers({ page: +page, limit: +limit, search, startDate, endDate }));
};

export const search = (req, res) =>
  send(res, svc.searchCustomers(req.query.q || ''));

export const analytics = (req, res) => {
  const { startDate = '', endDate = '' } = req.query;
  send(res, svc.getCustomerAnalytics({ startDate, endDate }));
};

export const detail = (req, res) =>
  send(res, svc.getCustomerDetail(req.params.id));

export const purchases = (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  send(res, svc.getCustomerPurchases(req.params.id, { page: +page, limit: +limit }));
};

export const refunds = (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  send(res, svc.getCustomerRefunds(req.params.id, { page: +page, limit: +limit }));
};

export const update = (req, res) =>
  send(res, svc.updateCustomer(req.params.id, req.body));

export const remove = (req, res) =>
  svc.deleteCustomer(req.params.id)
    .then(() => res.json({ message: 'Customer deactivated' }))
    .catch(e => res.status(e.message === 'Customer not found' ? 404 : 500).json({ message: e.message }));

// PATCH /api/customers/:id/image
export const uploadCustomerImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    if (customer.image?.fileId) await deleteFile(customer.image.fileId);

    const imageData = await uploadBuffer({
      buffer:   req.file.buffer,
      fileName: `customer-${customer._id}`,
      folder:   '/pos/customers',
      tags:     ['customer'],
    });

    customer.image = imageData;
    await customer.save();

    res.json({ success: true, data: { image: customer.image } });
  } catch (err) { next(err); }
};

// DELETE /api/customers/:id/image
export const deleteCustomerImage = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    if (customer.image?.fileId) await deleteFile(customer.image.fileId);

    customer.image = { url: null, fileId: null, fileName: null };
    await customer.save();

    res.json({ success: true, message: 'Customer image removed.' });
  } catch (err) { next(err); }
};
