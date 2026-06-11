import * as authService from '../services/authService.js';

const login = async (req, res, next) => {
  try {
    const { employeeCode, pin } = req.body;
    if (!employeeCode || !pin) {
      res.status(400);
      throw new Error('Please provide employee code and PIN');
    }

    const employee = await authService.loginEmployee(employeeCode, pin);
    res.status(200).json(employee);
  } catch (error) {
    next(error);
  }
};

export { login, };
