import Employee from '../models/Employee.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const loginEmployee = async (employeeCode, pin) => {
  const employee = await Employee.findOne({ employeeCode });

  if (!employee) {
    throw new Error('Invalid employee code or PIN');
  }

  if (!employee.isActive) {
    throw new Error('Employee account is inactive');
  }

  const isMatch = await employee.matchPin(pin);

  if (!isMatch) {
    throw new Error('Invalid employee code or PIN');
  }

  return {
    _id: employee._id,
    employeeCode: employee.employeeCode,
    name: employee.name,
    role: employee.role,
    token: generateToken(employee._id),
  };
};

export { loginEmployee, };
