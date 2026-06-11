import Shift from '../models/Shift.js';

const openShift = async (employeeId, openingCash) => {
  // Check if employee already has an open shift
  const existingShift = await Shift.findOne({ employeeId, status: 'OPEN' });
  if (existingShift) {
    throw new Error('Employee already has an open shift');
  }

  const shift = await Shift.create({
    employeeId,
    openingCash,
    shiftDate: new Date(),
  });

  return shift;
};

const closeShift = async (employeeId, closingCash) => {
  const shift = await Shift.findOne({ employeeId, status: 'OPEN' });
  if (!shift) {
    throw new Error('No open shift found for this employee');
  }

  shift.status = 'CLOSED';
  shift.clockOutTime = new Date();
  shift.closingCash = closingCash;

  await shift.save();

  return shift;
};

const getActiveShift = async (employeeId) => {
  return await Shift.findOne({ employeeId, status: 'OPEN' });
};

export { openShift,
  closeShift,
  getActiveShift, };
