import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    description: {
      type:  String,
      trim:  true,
      default: '',
    },
    members: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
  },
  { timestamps: true }
);

groupSchema.index({ name: 1 });

export default mongoose.model('Group', groupSchema);
