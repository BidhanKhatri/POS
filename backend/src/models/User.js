import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        clerkId: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
            trim: true,
        },
        employeeCode: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            uppercase: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
            lowercase: true,
            trim: true,
        },
        firstName: {
            type: String,
            trim: true,
        },
        lastName: {
            type: String,
            trim: true,
        },
        imageUrl: {
            type: String,
            trim: true,
        },
        authProvider: {
            type: String,
            enum: ['local', 'clerk'],
            default: 'local',
            index: true,
        },
        role: {
            type: String,
            enum: ['Admin', 'Manager', 'Employee'],
            default: 'Employee',
            index: true,
        },
        pinHash: {
            type: String,
            select: false,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        // Account lifecycle state — drives the approval workflow.
        // Default ACTIVE preserves backward compat for all existing users.
        // New local signups are created as PENDING until a manager approves.
        status: {
            type: String,
            enum: ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'],
            default: 'ACTIVE',
            index: true,
        },
        // Links this POS user to their corresponding EMS employee record.
        // Used to pull schedule/shift data from Staffing Betit (EMS).
        // Falls back to email matching when this is absent.
        staffingBetitEmployeeId: {
            type: String,
            default: null,
            index: true,
            sparse: true,
        },
        address: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.methods.matchPin = async function matchPin(enteredPin) {
    if (!this.pinHash) return false;
    return await bcrypt.compare(enteredPin, this.pinHash);
};

userSchema.pre('save', async function preSave() {
    if (!this.isModified('pinHash') || !this.pinHash) return;
    const salt = await bcrypt.genSalt(10);
    this.pinHash = await bcrypt.hash(this.pinHash, salt);
});

export default mongoose.model('User', userSchema);
