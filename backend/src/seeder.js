import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Employee from './models/Employee.js';
import Product from './models/Product.js';

// Prevent running in production
if (process.env.NODE_ENV === 'production') {
  console.error('Seeding is not allowed in production environment.');
  process.exit(1);
}

const seedData = async () => {
  try {
    await connectDB();

    await Employee.deleteMany();
    await Product.deleteMany();

    const admin = new Employee({
      employeeCode: 'ADMIN123',
      name: 'System Admin',
      role: 'Admin',
      pinHash: '1234', // Will be hashed by pre-save hook
      isActive: true,
    });
    await admin.save();

    const products = [
      { name: 'Coca Cola', sku: 'COLA001', barcode: '1234567890', price: 120, costPrice: 80, stockQty: 100, quickSlot: 1 },
      { name: 'Pepsi', sku: 'PEPSI001', barcode: '0987654321', price: 110, costPrice: 75, stockQty: 100, quickSlot: 2 },
    ];

    await Product.insertMany(products);

    console.log('Database Seeded Successfully!');
    console.log('Admin Code: ADMIN123');
    console.log('Admin PIN: 1234');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedData();
