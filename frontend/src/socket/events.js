// Mirror of backend/src/socket/events.js — keep in sync
export const EVENTS = {
  OVERRIDE_NEW:       'override:new',
  OVERRIDE_RESOLVED:  'override:resolved',
  TRANSACTION_NEW:    'transaction:new',
  SHIFT_UPDATE:       'shift:update',
  SHIFT_ENDING_SOON:  'shift:endingsoon',
  SHIFT_ENDED:              'shift:ended',
  MISSED_CHECKOUT_DETECTED: 'shift:missedcheckout',
  FORCE_CHECKOUT:           'shift:forcecheckout',
  INVENTORY_LOWSTOCK: 'inventory:lowstock',
  BARCODE_STOCK_SYNC: 'barcode:stocksync',
  NOTIFICATION:       'notification',
  CONNECT:            'connect',
  DISCONNECT:         'disconnect',
  CONNECT_ERROR:      'connect_error',
};
