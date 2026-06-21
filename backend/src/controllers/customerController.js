import * as svc from '../services/customerService.js';

export const backfill = async (req, res) => {
  try {
    const result = await svc.backfillCustomersFromPayments();
    res.json({ message: `Backfill complete. Processed: ${result.processed}, Linked: ${result.linked}`, ...result });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

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
