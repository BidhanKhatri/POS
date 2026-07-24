// Canonical event names — import this everywhere so strings never drift.
export const EVENTS = {
  // Override / refund / void lifecycle
  OVERRIDE_NEW:      'override:new',       // → managers room
  OVERRIDE_RESOLVED: 'override:resolved',  // → employee:{id} room

  // Transactions
  TRANSACTION_NEW:   'transaction:new',    // → managers room

  // Shift
  SHIFT_UPDATE:      'shift:update',       // → managers room
  SHIFT_ENDING_SOON: 'shift:endingsoon',  // → employee:{id} room
  SHIFT_ENDED:              'shift:ended',          // → employee:{id} room — instant terminal lock
  MISSED_CHECKOUT_DETECTED: 'shift:missedcheckout', // → managers room — dashboard refresh
  FORCE_CHECKOUT:           'shift:forcecheckout',  // → employee:{id} room — manager forced their checkout

  // EMS attendance sync
  EMS_CLOCK_IN:  'ems:clockin',  // → employee:{id} room — auto unlock + enable sales
  EMS_CLOCK_OUT: 'ems:clockout', // → employee:{id} room — auto lock + disable sales

  // Inventory
  INVENTORY_LOWSTOCK: 'inventory:lowstock', // → managers room
  BARCODE_STOCK_SYNC: 'barcode:stocksync',  // → store room

  // Notifications (generic)
  NOTIFICATION:      'notification',        // → employee:{id} room

  // Connection lifecycle (client-only)
  CONNECT:           'connect',
  DISCONNECT:        'disconnect',
  CONNECT_ERROR:     'connect_error',
};

// Room names — single-store POS so no storeId partitioning needed
export const ROOMS = {
  STORE:    'store',       // every authenticated connection
  MANAGERS: 'managers',   // managers + admins only
  employee: (userId) => `employee:${userId}`,
};
