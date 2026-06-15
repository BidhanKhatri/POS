import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { createClerkClient, verifyToken } from '@clerk/backend';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const createServiceError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getClerkSecretKey = () => {
  if (!process.env.CLERK_SECRET_KEY) {
    throw createServiceError('CLERK_SECRET_KEY is not configured in backend/.env', 500);
  }

  return process.env.CLERK_SECRET_KEY;
};

const serializeUser = (user, includeToken = false) => {
  const payload = {
    _id: user._id,
    clerkId: user.clerkId,
    employeeCode: user.employeeCode,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };

  if (includeToken) {
    payload.token = generateToken(user._id);
  }

  return payload;
};

const normalizeRole = (role) => {
  if (['Admin', 'Manager', 'Employee'].includes(role)) return role;
  return 'Employee';
};

const getPrimaryEmail = (clerkUser) => {
  const emailId = clerkUser.primary_email_address_id || clerkUser.primaryEmailAddressId;
  const emailAddresses = clerkUser.email_addresses || clerkUser.emailAddresses || [];
  const primaryEmail = emailAddresses.find((email) => email.id === emailId) || emailAddresses[0];
  return primaryEmail?.email_address || primaryEmail?.emailAddress || clerkUser.email || '';
};

const buildName = (clerkUser, email) => {
  const firstName = clerkUser.first_name || clerkUser.firstName || '';
  const lastName = clerkUser.last_name || clerkUser.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || clerkUser.username || email || 'Clerk User';
};

const buildEmployeeCodeBase = (clerkUser, email) => {
  const metadata = clerkUser.public_metadata || clerkUser.publicMetadata || {};
  const explicitCode = metadata.employeeCode || metadata.employee_code;
  const source = explicitCode || email.split('@')[0] || clerkUser.id;
  const normalized = String(source).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return normalized || String(clerkUser.id).replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-8);
};

const resolveEmployeeCode = async (baseCode, clerkId) => {
  let employeeCode = baseCode;
  let counter = 1;

  while (await User.exists({ employeeCode, clerkId: { $ne: clerkId } })) {
    const suffix = String(counter).padStart(2, '0');
    employeeCode = `${baseCode.slice(0, 10)}${suffix}`;
    counter += 1;
  }

  return employeeCode;
};

const loginUser = async (email, pin) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+pinHash');

  if (!user) {
    throw new Error('Invalid email or PIN');
  }

  if (!user.isActive) {
    throw new Error('Employee account is inactive');
  }

  const isMatch = await user.matchPin(pin);

  if (!isMatch) {
    throw new Error('Invalid email or PIN');
  }

  return serializeUser(user, true);
};

const generateEmployeeCode = async (name, email) => {
  const source = email ? email.split('@')[0] : name;
  const base = String(source).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'EMP';
  let employeeCode = base;
  let counter = 1;
  while (await User.exists({ employeeCode })) {
    const suffix = String(counter).padStart(2, '0');
    employeeCode = `${base.slice(0, 10)}${suffix}`;
    counter += 1;
  }
  return employeeCode;
};

const registerUser = async ({ name, email, pin, role = 'Employee' }) => {
  if (!name || !pin) {
    throw new Error('name and pin are required');
  }

  if (email) {
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) throw new Error('Email already in use');
  }

  const employeeCode = await generateEmployeeCode(name, email);

  const user = await User.create({
    employeeCode,
    name,
    email: email ? email.toLowerCase() : undefined,
    role,
    authProvider: 'local',
    pinHash: pin,
  });

  return serializeUser(user, true);
};

const upsertClerkUser = async (clerkUser) => {
  if (!clerkUser?.id) {
    throw new Error('Clerk user id is required');
  }

  const email = getPrimaryEmail(clerkUser);
  const metadata = clerkUser.public_metadata || clerkUser.publicMetadata || {};
  const firstName = clerkUser.first_name || clerkUser.firstName || '';
  const lastName = clerkUser.last_name || clerkUser.lastName || '';
  const name = buildName(clerkUser, email);
  const role = normalizeRole(metadata.role);
  const existingUser = await User.findOne(
    email ? { $or: [{ clerkId: clerkUser.id }, { email }] } : { clerkId: clerkUser.id }
  );
  const employeeCode = existingUser?.employeeCode || await resolveEmployeeCode(buildEmployeeCodeBase(clerkUser, email), clerkUser.id);

  const user = await User.findOneAndUpdate(
    existingUser ? { _id: existingUser._id } : { clerkId: clerkUser.id },
    {
      $set: {
        clerkId: clerkUser.id,
        employeeCode,
        name,
        email: email || undefined,
        firstName,
        lastName,
        imageUrl: clerkUser.image_url || clerkUser.imageUrl || '',
        authProvider: 'clerk',
        role,
        isActive: true,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  return serializeUser(user);
};

const deactivateClerkUser = async (clerkId) => {
  if (!clerkId) {
    throw new Error('Clerk user id is required');
  }

  const user = await User.findOneAndUpdate(
    { clerkId },
    { $set: { isActive: false } },
    { new: true }
  );

  return user ? serializeUser(user) : null;
};

const syncCurrentClerkUser = async (sessionToken) => {
  if (!sessionToken) {
    throw createServiceError('Missing Clerk session token', 401);
  }

  const secretKey = getClerkSecretKey();
  const verifiedToken = await verifyToken(sessionToken, {
    secretKey,
  });

  const clerkClient = createClerkClient({
    secretKey,
  });
  const clerkUser = await clerkClient.users.getUser(verifiedToken.sub);

  return await upsertClerkUser(clerkUser);
};

export { loginUser, registerUser, upsertClerkUser, deactivateClerkUser, syncCurrentClerkUser };
