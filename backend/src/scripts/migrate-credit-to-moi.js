import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Payment from '../models/Payment.js';
import ManagerOverride from '../models/ManagerOverride.js';

// One-time data migration: renames the 'CREDIT' payment method to 'MOI'
// across every collection that stores it, following the CREDIT -> MOI
// rename of the payment method enum in the Payment / ManagerOverride models.
const migrate = async () => {
  await connectDB();

  const paymentResult = await Payment.updateMany(
    { method: 'CREDIT' },
    { $set: { method: 'MOI' } }
  );
  console.log(`Payment.method: ${paymentResult.modifiedCount} document(s) updated`);

  const overrideResult = await ManagerOverride.updateMany(
    { paymentMethod: 'CREDIT' },
    { $set: { paymentMethod: 'MOI' } }
  );
  console.log(`ManagerOverride.paymentMethod: ${overrideResult.modifiedCount} document(s) updated`);

  const overrideContextResult = await ManagerOverride.updateMany(
    { 'saleContext.paymentMethod': 'CREDIT' },
    { $set: { 'saleContext.paymentMethod': 'MOI' } }
  );
  console.log(`ManagerOverride.saleContext.paymentMethod: ${overrideContextResult.modifiedCount} document(s) updated`);

  console.log('Migration complete.');
  await mongoose.disconnect();
  process.exit(0);
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
