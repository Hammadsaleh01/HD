import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, UserRole, VerificationStatus } from '@shared/types.ts';
import { userRepository } from '../database/repositories/userRepository.ts';
import { assistanceRepository } from '../database/repositories/assistanceRepository.ts';
import { auditRepository } from '../database/repositories/auditRepository.ts';
import { encryptCnic, hashCnic, hashToken } from '../utils/crypto.ts';
import { AppError } from '../utils/errors.ts';
import { config } from '../config.ts';
import { logger } from '../utils/logger.ts';

export const authService = {
  register: async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
    city: string;
    province?: string;
    area?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
    cnic?: string;
    organizationName?: string;
    registrationNumber?: string;
    capacity?: number;
    operatingHours?: string;
    contactPerson?: string;
    foodCategories?: string[];
    householdSize?: number;
    urgency?: 'Low' | 'Medium' | 'High' | 'Emergency';
    hasSmartphone?: boolean;
    serviceAreas?: string[];
    mission?: string;
  }): Promise<{ user: Omit<User, 'password' | 'resetPasswordTokenHash'>; token: string }> => {
    // 1. Strict security check: Disallow Admin registration publicly
    if (data.role === 'Admin') {
      throw AppError.forbidden('Administrator accounts cannot be registered publicly.');
    }

    // 2. Check email uniqueness
    const existingEmail = await userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw AppError.conflict('An account with this email address already exists.');
    }

    // 3. Process CNIC for beneficiaries
    let encryptedCnic: string | undefined = undefined;
    let cnicHashVal: string | undefined = undefined;

    if (data.role === 'Beneficiary' && data.cnic) {
      cnicHashVal = hashCnic(data.cnic);
      // Check duplicate across users
      const existingUser = await userRepository.findByCnicHash(cnicHashVal);
      if (existingUser) {
        throw AppError.conflict('An account with this CNIC is already registered.');
      }
      // Check duplicate across NGO assistance cases
      const existingCase = await assistanceRepository.findCaseByCnicHash(cnicHashVal);
      if (existingCase) {
        throw AppError.conflict('A beneficiary case with this CNIC is already registered by an NGO.');
      }
      encryptedCnic = encryptCnic(data.cnic);
    }

    // 4. Verification Status Rules (PHASE 1.3: Beneficiary must start as Pending / Under_Review)
    let initialVerificationStatus: VerificationStatus = 'Pending';
    if (data.role === 'Donor') {
      initialVerificationStatus = 'Verified'; // Donors are verified by default
    } else if (data.role === 'Beneficiary') {
      initialVerificationStatus = 'Under_Review'; // Must be reviewed by NGO or Admin
    } else {
      initialVerificationStatus = 'Pending'; // Restaurants and NGOs start Pending
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const userId = `${data.role.toLowerCase()}-${crypto.randomUUID()}`;

    const newUser: User = {
      id: userId,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      password: hashedPassword,
      role: data.role,
      country: 'Pakistan',
      province: data.province || 'Punjab',
      city: data.city.trim(),
      area: data.area?.trim() || 'Central',
      address: data.address?.trim() || `${data.city}, Pakistan`,
      coordinates: data.coordinates,
      verificationStatus: initialVerificationStatus,
      cnic: encryptedCnic,
      cnicHash: cnicHashVal,
      organizationName: data.organizationName?.trim(),
      registrationNumber: data.registrationNumber?.trim(),
      capacity: data.capacity,
      operatingHours: data.operatingHours?.trim(),
      contactPerson: data.contactPerson?.trim(),
      foodCategories: data.foodCategories,
      householdSize: data.householdSize || 4,
      urgency: data.urgency || 'Medium',
      eligibilityStatus: data.role === 'Beneficiary' ? 'Under_Review' : undefined,
      hasSmartphone: data.hasSmartphone ?? true,
      serviceAreas: data.serviceAreas,
      mission: data.mission?.trim(),
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString()
    };

    const saved = await userRepository.create(newUser);

    // Audit log (sanitized)
    await auditRepository.create({
      actorId: saved.id,
      actorName: saved.name,
      actorRole: saved.role,
      action: 'USER_REGISTER',
      details: `New account registered as ${saved.role} in ${saved.city}. Status: ${saved.verificationStatus}.`
    });

    // Generate JWT token (1 day expiry)
    const token = jwt.sign(
      { id: saved.id, email: saved.email, role: saved.role, name: saved.name },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    return {
      user: userRepository.sanitizeUser(saved),
      token
    };
  },

  login: async (email: string, pass: string): Promise<{ user: Omit<User, 'password' | 'resetPasswordTokenHash'>; token: string }> => {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      // Avoid timing difference
      await bcrypt.hash('dummy-password-hash', 10);
      throw AppError.unauthorized('Invalid email or password.');
    }

    // Check account lockout
    if (userRepository.isAccountLocked(user)) {
      const minutesLeft = Math.ceil(
        (new Date(user.lockoutUntil!).getTime() - Date.now()) / (60 * 1000)
      );
      throw AppError.locked(`Account is locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`);
    }

    // Check account suspension or rejection
    if (user.verificationStatus === 'Suspended') {
      throw AppError.forbidden('Your account has been suspended by the platform administrator.');
    }
    if (user.verificationStatus === 'Rejected') {
      throw AppError.forbidden('Your account registration application was rejected.');
    }

    // Verify password
    const valid = user.password ? await bcrypt.compare(pass, user.password) : false;
    if (!valid) {
      const { locked, attemptsLeft } = await userRepository.recordFailedLogin(user);

      await auditRepository.create({
        actorId: user.id,
        actorName: 'Security System',
        actorRole: user.role,
        action: 'FAILED_LOGIN_ATTEMPT',
        details: `Failed login attempt for user ID ${user.id}. Attempts remaining: ${attemptsLeft}.`
      });

      if (locked) {
        throw AppError.locked('Too many failed attempts. Your account has been temporarily locked for 15 minutes.');
      }
      throw AppError.unauthorized(`Invalid email or password. ${attemptsLeft} attempts remaining before lockout.`);
    }

    // Reset failed login attempts on successful login
    await userRepository.resetFailedLogin(user.id);

    // Issue JWT token with 24-hour expiration
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    return {
      user: userRepository.sanitizeUser(user),
      token
    };
  },

  /**
   * Secure Forgot Password:
   * - Never returns token in response
   * - Stores SHA-256 hash with 1 hour expiration
   * - In dev only, logs reset link to console
   */
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const genericMessage = 'If an account with that email exists, password reset instructions have been sent.';
    const user = await userRepository.findByEmail(email);

    if (!user) {
      return { message: genericMessage };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await userRepository.update(user.id, {
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: expires
    });

    if (!config.isProduction) {
      logger.info(`[PlateShare Dev Security] Password Reset Link for ${user.email}: /reset-password?token=${rawToken}`);
    }

    return { message: genericMessage };
  },

  /**
   * Secure Password Reset:
   * - Compares SHA-256 hashes
   * - Single-use: clears token immediately on success
   */
  resetPassword: async (token: string, newPass: string): Promise<{ message: string }> => {
    const tokenHash = hashToken(token);
    const user = await userRepository.findByResetTokenHash(tokenHash);

    if (!user) {
      throw AppError.badRequest('Password reset token is invalid or has expired.');
    }

    const newHashed = await bcrypt.hash(newPass, 10);
    await userRepository.update(user.id, {
      password: newHashed,
      resetPasswordTokenHash: undefined,
      resetPasswordExpires: undefined,
      failedLoginAttempts: 0,
      lockoutUntil: undefined
    });

    await auditRepository.create({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      details: 'Password was successfully reset using verified single-use token.'
    });

    return { message: 'Password has been successfully updated. You can now log in.' };
  }
};
