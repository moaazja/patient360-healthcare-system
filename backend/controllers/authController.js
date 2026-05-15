/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Authentication Controller — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  📁 Path: backend/controllers/authController.js
 *  🔧 Version: 2.1 (Transactions removed — Standalone MongoDB compatible)
 *
 *  Responsibilities:
 *    1. Signup (adult + minor with child registration number flow)
 *    2. Login + comprehensive failure tracking
 *    3. Logout (with FCM token cleanup + audit logging)
 *    4. Password reset via OTP email
 *    5. Doctor / Pharmacist / Lab Technician professional registration
 *    6. Token verification and last-login tracking
 *
 *  v2.1 Changes:
 *    - Signup no longer uses MongoDB transactions (Standalone-compatible).
 *    - Manual rollback deletes partial documents on failure → preserves
 *      atomicity behavior even without replica set.
 *
 *  Security Events Audited:
 *    ✓ LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT
 *    ✓ PASSWORD_RESET_REQUESTED, PASSWORD_CHANGED
 *    ✓ ACCOUNT_LOCKED, OTP_VERIFIED, OTP_FAILED
 *    ✓ SIGNUP_SUCCESS, SIGNUP_FAILED
 * ═══════════════════════════════════════════════════════════════════════════
 */

const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const mongoose = require('mongoose');

// ── Models ──────────────────────────────────────────────────────────────────
const {
  Account,
  Person,
  Children,
  Patient,
  Doctor,
  Pharmacist,
  LabTechnician,
  Pharmacy,
  Laboratory,
  DoctorRequest,
  AuditLog,
} = require('../models');

// ── Utilities ───────────────────────────────────────────────────────────────
const {
  sendEmail,
  generateOTP,
  createOTPEmailTemplate,
} = require('../utils/sendEmail');

// ============================================================================
// CONSTANTS
// ============================================================================

const JWT_EXPIRES_IN     = process.env.JWT_EXPIRES_IN || '7d';
const OTP_VALIDITY_MS    = 10 * 60 * 1000; // 10 minutes
const ADULT_AGE_THRESHOLD = 14;            // Patient360 dual-patient model

// ============================================================================
// HELPER — Generate JWT token
// ============================================================================

function signToken(accountId, roles) {
  return jwt.sign(
    { id: accountId, roles },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

// ============================================================================
// HELPER — Extract IP address robustly (proxy-aware)
// ============================================================================

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

// ============================================================================
// HELPER — Calculate age from date of birth
// ============================================================================

function calculateAge(dateOfBirth) {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

// ============================================================================
// 1. SIGNUP — Adult or Minor patient registration (NO TRANSACTIONS)
// ============================================================================

/**
 * POST /api/auth/signup
 * Public route — creates a new patient account.
 *
 * Atomicity strategy:
 *   This function does NOT use MongoDB transactions (which require
 *   replica set). Instead, it tracks every document created and rolls
 *   back manually on failure. This gives the same end-state guarantee:
 *   either a complete account is created, or no traces remain in the DB.
 *
 * Body (adult, age ≥ 14):
 *   { firstName, fatherName, lastName, motherName, nationalId,
 *     dateOfBirth, gender, phoneNumber, email, password,
 *     governorate, city, address, bloodType?, allergies?, ... }
 *
 * Body (minor, age < 14):
 *   { firstName, fatherName, lastName, motherName, dateOfBirth, gender,
 *     parentNationalId, ... (no nationalId field for the child) }
 */
exports.signup = async (req, res) => {
  // ── Track created documents for manual rollback on error ────────────────
  // Replaces MongoDB transactions (which require replica set). Manual
  // cleanup of partially-created records preserves atomicity on Standalone.
  let personDoc  = null;
  let childDoc   = null;
  let patientDoc = null;
  let accountDoc = null;

  try {
    const {
      // Names
      firstName, fatherName, lastName, motherName,
      // Identity
      nationalId, dateOfBirth, gender,
      // Contact
      phoneNumber, email, password,
      // Address
      governorate, city, district, street, building, address,
      // Medical (optional)
      bloodType, allergies, chronicDiseases, height, weight,
      // For minor flow
      parentNationalId,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────
    if (!firstName || !fatherName || !lastName || !motherName) {
      return res.status(400).json({
        success: false,
        message: 'الاسم الكامل مطلوب (الاسم، اسم الأب، اسم العائلة، اسم الأم)',
      });
    }

    if (!dateOfBirth || !gender) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ الميلاد والجنس مطلوبان',
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان',
      });
    }

    // ── Check if email already exists ───────────────────────────────────
    const existingAccount = await Account.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل',
      });
    }

    // ── Determine patient type by age ───────────────────────────────────
    const age = calculateAge(dateOfBirth);
    const isAdult = age >= ADULT_AGE_THRESHOLD;

    if (isAdult) {
      // ── ADULT FLOW ────────────────────────────────────────────────────
      if (!nationalId || !/^\d{11}$/.test(nationalId)) {
        return res.status(400).json({
          success: false,
          message: 'الرقم الوطني مطلوب ويجب أن يكون 11 رقماً',
        });
      }

      // Check nationalId uniqueness
      const existingPerson = await Person.findOne({ nationalId });
      if (existingPerson) {
        return res.status(400).json({
          success: false,
          message: 'الرقم الوطني مستخدم بالفعل',
        });
      }

      // Create Person document
      personDoc = await Person.create({
        nationalId,
        firstName, fatherName, lastName, motherName,
        dateOfBirth, gender,
        phoneNumber, email: email.toLowerCase(),
        governorate, city, district, street, building, address,
        isActive: true,
        isDeleted: false,
      });

      // Create Patient profile linked to Person
      patientDoc = await Patient.create({
        personId: personDoc._id,
        bloodType: bloodType || 'unknown',
        allergies: allergies || [],
        chronicDiseases: chronicDiseases || [],
        height, weight,
        totalVisits: 0,
      });
    } else {
      // ── MINOR FLOW (under 14) ─────────────────────────────────────────
      if (!parentNationalId || !/^\d{11}$/.test(parentNationalId)) {
        return res.status(400).json({
          success: false,
          message: 'الرقم الوطني للوالد/الوصي مطلوب ويجب أن يكون 11 رقماً',
        });
      }

      // Find parent person
      const parent = await Person.findOne({ nationalId: parentNationalId });
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على الوالد/الوصي بالرقم الوطني المُدخل',
        });
      }

      // Generate child registration number
      const childRegistrationNumber = await Children.generateRegistrationNumber();

      // Create Child document
      childDoc = await Children.create({
        childRegistrationNumber,
        parentNationalId,
        parentPersonId: parent._id,
        firstName, fatherName, lastName, motherName,
        dateOfBirth, gender,
        phoneNumber, governorate, city, district, street, building, address,
        hasReceivedNationalId: false,
        migrationStatus: 'pending',
        isActive: true,
        isDeleted: false,
      });

      // Create Patient profile linked to Child
      patientDoc = await Patient.create({
        childId: childDoc._id,
        bloodType: bloodType || 'unknown',
        allergies: allergies || [],
        chronicDiseases: chronicDiseases || [],
        totalVisits: 0,
      });
    }

    // ── Create Account ──────────────────────────────────────────────────
    const accountData = {
      email: email.toLowerCase(),
      password, // Auto-hashed by Account.js pre-validate hook
      roles: ['patient'],
      isActive: true,
      isVerified: false,
      language: 'ar',
      timezone: 'Asia/Damascus',
    };

    if (isAdult) {
      accountData.personId = personDoc._id;
    } else {
      accountData.childId = childDoc._id;
    }

    accountDoc = await Account.create(accountData);

    // ── Audit log (best-effort, never throws) ─────────────
    try {
      await AuditLog.record({
        userId: accountDoc._id,
        userEmail: accountDoc.email,
        userRole: 'patient',
        action: 'SIGNUP_SUCCESS',
        description: isAdult
          ? `New adult patient registered: ${firstName} ${lastName}`
          : `New minor patient registered: ${firstName} ${lastName} (CRN: ${childDoc.childRegistrationNumber})`,
        resourceType: isAdult ? 'persons' : 'children',
        resourceId: isAdult ? personDoc._id : childDoc._id,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        platform: req.headers['x-platform'] || 'web',
        success: true,
        metadata: {
          accountType: isAdult ? 'adult' : 'minor',
          ageAtSignup: age,
          ...(childDoc && { childRegistrationNumber: childDoc.childRegistrationNumber }),
        },
      });
    } catch (auditErr) {
      console.warn('⚠️  AuditLog (signup success) skipped:', auditErr.message);
    }

    // ── Generate JWT and return ─────────────────────────────────────────
    const token = signToken(accountDoc._id, accountDoc.roles);

    console.log(`✅ Signup successful: ${email} (${isAdult ? 'adult' : 'minor'})`);

    // Build user object matching frontend expectation (same shape as login)
    const profile = personDoc || childDoc || {};
    const safeUser = {
      _id:        accountDoc._id,
      email:      accountDoc.email,
      roles:      accountDoc.roles,
      role:       accountDoc.roles?.[0] || null,
      isActive:   accountDoc.isActive,
      isVerified: accountDoc.isVerified,

      // Flattened profile
      firstName:  profile.firstName  || '',
      fatherName: profile.fatherName || '',
      lastName:   profile.lastName   || '',
      motherName: profile.motherName || '',
      phoneNumber: profile.phoneNumber || '',
      gender:     profile.gender,
      dateOfBirth: profile.dateOfBirth,
      governorate: profile.governorate,
      city:       profile.city,

      nationalId:              profile.nationalId              || null,
      childRegistrationNumber: profile.childRegistrationNumber || null,

      // Nested versions
      person: isAdult ? {
        _id:        personDoc._id,
        firstName:  personDoc.firstName,
        lastName:   personDoc.lastName,
        nationalId: personDoc.nationalId,
      } : null,
      child: !isAdult ? {
        _id:        childDoc._id,
        firstName:  childDoc.firstName,
        lastName:   childDoc.lastName,
        childRegistrationNumber: childDoc.childRegistrationNumber,
      } : null,
    };

    return res.status(201).json({
      success: true,
      message: isAdult
        ? 'تم إنشاء الحساب بنجاح'
        : `تم إنشاء حساب الطفل بنجاح. رقم التسجيل: ${childDoc.childRegistrationNumber}`,
      token,
      user:    safeUser,    // ← Primary key for frontend
      account: safeUser,    // ← Alias for legacy callers
      ...(childDoc && {
        childRegistrationNumber: childDoc.childRegistrationNumber,
      }),
    });
  } catch (error) {
    console.error('❌ Signup error:', error);

    // ── MANUAL ROLLBACK ────────────────────────────────────────────────
    // Delete any documents that were created before the failure point.
    // Order matters: delete in reverse-creation order so the cleanup runs
    // children before their parents.
    try {
      if (accountDoc) await Account.findByIdAndDelete(accountDoc._id);
      if (patientDoc) await Patient.findByIdAndDelete(patientDoc._id);
      if (childDoc)   await Children.findByIdAndDelete(childDoc._id);
      if (personDoc)  await Person.findByIdAndDelete(personDoc._id);
      if (accountDoc || patientDoc || childDoc || personDoc) {
        console.log('🧹 Rollback complete — partial documents removed');
      }
    } catch (rollbackErr) {
      console.error('⚠️  Rollback failed:', rollbackErr.message);
    }

    // Try to log failure (best-effort)
    try {
      await AuditLog.record({
        userEmail: req.body?.email,
        action: 'SIGNUP_FAILED',
        description: `Signup failed: ${error.message}`,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        platform: req.headers['x-platform'] || 'web',
        success: false,
        errorMessage: error.message,
      });
    } catch (auditErr) {
      // Swallow — audit log shouldn't break the response
    }

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الحساب',
      error: error.message,
    });
  }
  // ── No finally block needed — no session to close ──
};

// ============================================================================
// 2. LOGIN — With comprehensive audit logging
// ============================================================================

/**
 * POST /api/auth/login
 * Public route — authenticates user and returns JWT.
 *
 * Body: { email, password }
 *
 * Audit events emitted:
 *   ✓ LOGIN_FAILED  — email not found, wrong password, inactive, locked
 *   ✓ LOGIN_SUCCESS — successful authentication
 *   ✓ ACCOUNT_LOCKED — after 5th failed attempt (auto by Account model)
 */
exports.login = async (req, res) => {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const platform  = req.headers['x-platform'] || 'web';

  try {
    const { email, password } = req.body;

    // ── Basic validation ────────────────────────────────────────────────
    if (!email || !password) {
      await AuditLog.record({
        userEmail: email || null,
        action: 'LOGIN_FAILED',
        description: 'Login attempt with missing credentials',
        ipAddress, userAgent, platform,
        success: false,
        errorMessage: 'Missing email or password',
      });

      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان',
      });
    }

    // ── Find account (with password field) ──────────────────────────────
    const account = await Account.findOne({ email: email.toLowerCase() })
      .select('+password +failedLoginAttempts +accountLockedUntil')
      .populate('personId')
      .populate('childId');

    // ── Account not found ────────────────────────────────────────────────
    if (!account) {
      await AuditLog.record({
        userEmail: email.toLowerCase(),
        action: 'LOGIN_FAILED',
        description: `Login attempt with non-existent email: ${email}`,
        ipAddress, userAgent, platform,
        success: false,
        errorMessage: 'Account not found',
      });

      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      });
    }

    // ── Account inactive ────────────────────────────────────────────────
    if (!account.isActive) {
      await AuditLog.record({
        userId: account._id,
        userEmail: account.email,
        userRole: account.roles?.[0],
        action: 'LOGIN_FAILED',
        description: 'Login attempt on inactive account',
        ipAddress, userAgent, platform,
        success: false,
        errorMessage: 'Account inactive',
        metadata: { deactivationReason: account.deactivationReason },
      });

      return res.status(403).json({
        success: false,
        message: 'هذا الحساب غير نشط. يرجى التواصل مع الإدارة',
      });
    }

    // ── Account locked ──────────────────────────────────────────────────
    if (typeof account.isLocked === 'function' && account.isLocked()) {
      const lockMinutes = Math.ceil(
        (account.accountLockedUntil - new Date()) / 60000,
      );

      await AuditLog.record({
        userId: account._id,
        userEmail: account.email,
        userRole: account.roles?.[0],
        action: 'LOGIN_FAILED',
        description: `Login attempt on locked account (${lockMinutes} minutes remaining)`,
        ipAddress, userAgent, platform,
        success: false,
        errorMessage: 'Account locked',
        metadata: { lockedUntil: account.accountLockedUntil, minutesRemaining: lockMinutes },
      });

      return res.status(423).json({
        success: false,
        message: `الحساب مقفل مؤقتاً بسبب محاولات دخول فاشلة. حاول مرة أخرى بعد ${lockMinutes} دقيقة`,
      });
    }

    // ── Verify password ─────────────────────────────────────────────────
    const isPasswordValid = await bcrypt.compare(password, account.password);

    if (!isPasswordValid) {
      // Record the failed attempt — Account model handles lockout
      if (typeof account.recordFailedLogin === 'function') {
        await account.recordFailedLogin();
      }

      // Check if this attempt triggered a lockout
      const justLocked = account.failedLoginAttempts >= 5;

      await AuditLog.record({
        userId: account._id,
        userEmail: account.email,
        userRole: account.roles?.[0],
        action: 'LOGIN_FAILED',
        description: `Wrong password (attempt ${account.failedLoginAttempts}/5)`,
        ipAddress, userAgent, platform,
        success: false,
        errorMessage: 'Invalid password',
        metadata: { attemptCount: account.failedLoginAttempts },
      });

      // Separate ACCOUNT_LOCKED event when threshold reached
      if (justLocked) {
        await AuditLog.record({
          userId: account._id,
          userEmail: account.email,
          userRole: account.roles?.[0],
          action: 'ACCOUNT_LOCKED',
          description: 'Account auto-locked after 5 consecutive failed login attempts',
          ipAddress, userAgent, platform,
          success: false,
          errorMessage: 'Lockout triggered',
          metadata: { lockedUntil: account.accountLockedUntil },
        });
      }

      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        ...(justLocked && {
          locked: true,
          lockMessage: 'تم قفل الحساب لمدة 15 دقيقة بسبب محاولات دخول متعددة',
        }),
      });
    }

    // ── Success — Record successful login ───────────────────────────────
    if (typeof account.recordSuccessfulLogin === 'function') {
      await account.recordSuccessfulLogin(ipAddress);
    }

    await AuditLog.record({
      userId: account._id,
      userEmail: account.email,
      userRole: account.roles?.[0],
      action: 'LOGIN_SUCCESS',
      description: 'User logged in successfully',
      ipAddress, userAgent, platform,
      success: true,
      metadata: {
        roles: account.roles,
        loginTime: new Date(),
      },
    });

    // ── Generate token and return ───────────────────────────────────────
    const token = signToken(account._id, account.roles);

    console.log(`✅ Login successful: ${account.email}`);

    const profile = account.personId || account.childId || {};
    const safeUser = {
      _id:        account._id,
      email:      account.email,
      roles:      account.roles,
      role:       account.roles?.[0] || null,
      isActive:   account.isActive,
      isVerified: account.isVerified,
      language:   account.language,

      firstName:  profile.firstName  || '',
      fatherName: profile.fatherName || '',
      lastName:   profile.lastName   || '',
      motherName: profile.motherName || '',
      phoneNumber: profile.phoneNumber || '',
      gender:     profile.gender,
      dateOfBirth: profile.dateOfBirth,
      governorate: profile.governorate,
      city:       profile.city,

      nationalId:              profile.nationalId              || null,
      childRegistrationNumber: profile.childRegistrationNumber || null,

      person: account.personId ? {
        _id:        account.personId._id,
        firstName:  account.personId.firstName,
        fatherName: account.personId.fatherName,
        lastName:   account.personId.lastName,
        motherName: account.personId.motherName,
        nationalId: account.personId.nationalId,
        phoneNumber: account.personId.phoneNumber,
        gender:     account.personId.gender,
        dateOfBirth: account.personId.dateOfBirth,
        governorate: account.personId.governorate,
        city:       account.personId.city,
      } : null,
      child: account.childId ? {
        _id:        account.childId._id,
        firstName:  account.childId.firstName,
        fatherName: account.childId.fatherName,
        lastName:   account.childId.lastName,
        motherName: account.childId.motherName,
        childRegistrationNumber: account.childId.childRegistrationNumber,
        dateOfBirth: account.childId.dateOfBirth,
        gender:     account.childId.gender,
      } : null,
    };

    return res.status(200).json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user:    safeUser,
      account: safeUser,
    });
  } catch (error) {
    console.error('❌ Login error:', error);

    await AuditLog.record({
      userEmail: req.body?.email,
      action: 'LOGIN_FAILED',
      description: `Login system error: ${error.message}`,
      ipAddress, userAgent, platform,
      success: false,
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error.message,
    });
  }
};

// ============================================================================
// 3. LOGOUT — With FCM token cleanup + audit logging
// ============================================================================

exports.logout = async (req, res) => {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const platform  = req.headers['x-platform'] || 'web';

  try {
    const accountId = req.user?._id || req.account?._id;
    if (!accountId) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرّح',
      });
    }

    const { fcmToken } = req.body || {};

    let tokensRemoved = 0;
    if (fcmToken) {
      const result = await Account.updateOne(
        { _id: accountId },
        { $pull: { pushNotificationTokens: { token: fcmToken } } },
      );
      tokensRemoved = result.modifiedCount;
    }

    const account = await Account.findById(accountId).select('email roles').lean();

    await AuditLog.record({
      userId: accountId,
      userEmail: account?.email,
      userRole: account?.roles?.[0],
      action: 'LOGOUT',
      description: tokensRemoved > 0
        ? 'User logged out and FCM token removed'
        : 'User logged out',
      ipAddress, userAgent, platform,
      success: true,
      metadata: {
        fcmTokensRemoved: tokensRemoved,
        logoutTime: new Date(),
      },
    });

    console.log(`✅ Logout: ${account?.email} (FCM tokens removed: ${tokensRemoved})`);

    return res.status(200).json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
      fcmTokensRemoved: tokensRemoved,
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الخروج',
      error: error.message,
    });
  }
};

// ============================================================================
// 4. FORGOT PASSWORD — Send OTP via email
// ============================================================================

exports.forgotPassword = async (req, res) => {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const platform  = req.headers['x-platform'] || 'web';

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مطلوب',
      });
    }

    const account = await Account.findOne({ email: email.toLowerCase() });

    if (!account) {
      await AuditLog.record({
        userEmail: email.toLowerCase(),
        action: 'PASSWORD_RESET_REQUESTED',
        description: 'Password reset requested for non-existent email',
        ipAddress, userAgent, platform,
        success: false,
        errorMessage: 'Email not found',
      });

      return res.status(200).json({
        success: true,
        message: 'إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رمز التحقق',
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + OTP_VALIDITY_MS);

    account.resetPasswordOTP     = otp;
    account.resetPasswordExpires = otpExpires;
    await account.save({ validateBeforeSave: false });

    try {
      await sendEmail({
        email: account.email,
        subject: 'Patient 360° — رمز التحقق لاستعادة كلمة المرور',
        message: createOTPEmailTemplate(otp, account.email),
      });

      await AuditLog.record({
        userId: account._id,
        userEmail: account.email,
        userRole: account.roles?.[0],
        action: 'PASSWORD_RESET_REQUESTED',
        description: 'OTP sent successfully for password reset',
        ipAddress, userAgent, platform,
        success: true,
        metadata: { otpExpiresAt: otpExpires },
      });

      return res.status(200).json({
        success: true,
        message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
      });
    } catch (emailError) {
      account.resetPasswordOTP     = undefined;
      account.resetPasswordExpires = undefined;
      await account.save({ validateBeforeSave: false });

      await AuditLog.record({
        userId: account._id,
        userEmail: account.email,
        userRole: account.roles?.[0],
        action: 'PASSWORD_RESET_REQUESTED',
        description: 'OTP generation succeeded but email send failed',
        ipAddress, userAgent, platform,
        success: false,
        errorMessage: emailError.message,
      });

      console.error('❌ Forgot password email error:', emailError);

      return res.status(500).json({
        success: false,
        message: 'فشل إرسال البريد الإلكتروني. حاول مرة أخرى لاحقاً',
      });
    }
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error.message,
    });
  }
};

// ============================================================================
// 5. VERIFY OTP — Validate 6-digit code
// ============================================================================

exports.verifyOTP = async (req, res) => {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const platform  = req.headers['x-platform'] || 'web';

  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني ورمز التحقق مطلوبان',
      });
    }

    const account = await Account.findOne({
      email: email.toLowerCase(),
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!account) {
      await AuditLog.record({
        userEmail: email.toLowerCase(),
        action: 'OTP_FAILED',
        description: 'Invalid or expired OTP entered',
        ipAddress, userAgent, platform,
        success: false,
        errorMessage: 'OTP invalid or expired',
      });

      return res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح أو منتهي الصلاحية',
      });
    }

    const resetToken = jwt.sign(
      { id: account._id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    await AuditLog.record({
      userId: account._id,
      userEmail: account.email,
      userRole: account.roles?.[0],
      action: 'OTP_VERIFIED',
      description: 'OTP verified successfully — reset token issued',
      ipAddress, userAgent, platform,
      success: true,
    });

    return res.status(200).json({
      success: true,
      message: 'تم التحقق من الرمز بنجاح',
      resetToken,
    });
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error.message,
    });
  }
};

// ============================================================================
// 6. RESET PASSWORD — Complete password reset using reset token
// ============================================================================

exports.resetPassword = async (req, res) => {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const platform  = req.headers['x-platform'] || 'web';

  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'رمز إعادة التعيين وكلمة المرور الجديدة مطلوبان',
      });
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (jwtError) {
      await AuditLog.record({
        action: 'PASSWORD_CHANGED',
        description: 'Reset token invalid or expired',
        ipAddress, userAgent, platform,
        success: false,
        errorMessage: jwtError.message,
      });

      return res.status(401).json({
        success: false,
        message: 'رمز إعادة التعيين غير صالح أو منتهي الصلاحية',
      });
    }

    if (payload.purpose !== 'password-reset') {
      return res.status(401).json({
        success: false,
        message: 'رمز إعادة التعيين غير صالح',
      });
    }

    const account = await Account.findById(payload.id).select('+password');
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'الحساب غير موجود',
      });
    }

    account.password = newPassword;
    account.resetPasswordOTP     = undefined;
    account.resetPasswordExpires = undefined;
    account.passwordChangedAt    = new Date();
    account.failedLoginAttempts  = 0;
    account.accountLockedUntil   = undefined;
    await account.save();

    await AuditLog.record({
      userId: account._id,
      userEmail: account.email,
      userRole: account.roles?.[0],
      action: 'PASSWORD_CHANGED',
      description: 'Password successfully reset via OTP flow',
      ipAddress, userAgent, platform,
      success: true,
      metadata: { changedAt: account.passwordChangedAt },
    });

    console.log(`✅ Password reset successful: ${account.email}`);

    return res.status(200).json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول',
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error.message,
    });
  }
};

// ============================================================================
// 7. VERIFY TOKEN
// ============================================================================

exports.verify = async (req, res) => {
  try {
    const accountId = req.user?._id || req.account?._id;
    if (!accountId) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرّح',
      });
    }

    const account = await Account.findById(accountId)
      .populate('personId')
      .populate('childId')
      .lean();

    if (!account || !account.isActive) {
      return res.status(401).json({
        success: false,
        message: 'الحساب غير نشط',
      });
    }

    const profile = account.personId || account.childId || {};
    const safeUser = {
      _id:        account._id,
      email:      account.email,
      roles:      account.roles,
      role:       account.roles?.[0] || null,
      isActive:   account.isActive,
      isVerified: account.isVerified,
      language:   account.language,

      firstName:  profile.firstName  || '',
      fatherName: profile.fatherName || '',
      lastName:   profile.lastName   || '',
      motherName: profile.motherName || '',
      phoneNumber: profile.phoneNumber || '',
      gender:     profile.gender,
      dateOfBirth: profile.dateOfBirth,
      governorate: profile.governorate,
      city:       profile.city,

      nationalId:              profile.nationalId              || null,
      childRegistrationNumber: profile.childRegistrationNumber || null,

      person: account.personId,
      child:  account.childId,
    };

    return res.status(200).json({
      success: true,
      user:    safeUser,
      account: safeUser,
    });
  } catch (error) {
    console.error('❌ Verify error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error.message,
    });
  }
};

// ============================================================================
// 8. UPDATE LAST LOGIN
// ============================================================================

exports.updateLastLogin = async (req, res) => {
  try {
    const accountId = req.user?._id || req.account?._id;
    if (!accountId) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرّح',
      });
    }

    const { fcmToken, platform, deviceName, appVersion } = req.body || {};
    const ipAddress = getClientIp(req);

    const updateOps = {
      $set: { lastLogin: new Date(), lastLoginIp: ipAddress },
    };

    if (fcmToken && platform) {
      const account = await Account.findById(accountId);
      const existing = (account.pushNotificationTokens || []).find(t => t.token === fcmToken);

      if (existing) {
        await Account.updateOne(
          { _id: accountId, 'pushNotificationTokens.token': fcmToken },
          {
            $set: {
              lastLogin: new Date(),
              lastLoginIp: ipAddress,
              'pushNotificationTokens.$.lastUsedAt': new Date(),
              'pushNotificationTokens.$.isActive': true,
            },
          },
        );
      } else {
        await Account.updateOne(
          { _id: accountId },
          {
            $set: { lastLogin: new Date(), lastLoginIp: ipAddress },
            $push: {
              pushNotificationTokens: {
                $each: [{
                  token: fcmToken,
                  platform,
                  deviceName: deviceName || 'unknown',
                  appVersion: appVersion || 'unknown',
                  addedAt: new Date(),
                  lastUsedAt: new Date(),
                  isActive: true,
                }],
                $slice: -10,
              },
            },
          },
        );
      }
    } else {
      await Account.updateOne({ _id: accountId }, updateOps);
    }

    return res.status(200).json({
      success: true,
      message: 'تم تحديث آخر دخول',
    });
  } catch (error) {
    console.error('❌ Update last login error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error.message,
    });
  }
};

// ============================================================================
// 9. PROFESSIONAL REGISTRATION ROUTES
// ============================================================================

exports.registerDoctor = async (req, res) => {
  const ipAddress = getClientIp(req);

  try {
    const requiredFields = [
      'firstName', 'fatherName', 'lastName', 'motherName',
      'nationalId', 'email', 'phoneNumber', 'dateOfBirth', 'gender',
      'governorate', 'city', 'address',
      'medicalLicenseNumber', 'specialization', 'yearsOfExperience', 'consultationFee',
    ];

    for (const field of requiredFields) {
      if (!req.body[field] && req.body[field] !== 0) {
        return res.status(400).json({
          success: false,
          message: `الحقل ${field} مطلوب`,
        });
      }
    }

    const existingByNationalId = await DoctorRequest.findOne({
      nationalId: req.body.nationalId,
      status: { $ne: 'rejected' },
    });
    if (existingByNationalId) {
      return res.status(400).json({
        success: false,
        message: 'يوجد طلب سابق بنفس الرقم الوطني',
      });
    }

    const existingByEmail = await DoctorRequest.findOne({
      email: req.body.email.toLowerCase(),
      status: { $ne: 'rejected' },
    });
    if (existingByEmail) {
      return res.status(400).json({
        success: false,
        message: 'يوجد طلب سابق بنفس البريد الإلكتروني',
      });
    }

    const existingByLicense = await DoctorRequest.findOne({
      medicalLicenseNumber: req.body.medicalLicenseNumber,
      status: { $ne: 'rejected' },
    });
    if (existingByLicense) {
      return res.status(400).json({
        success: false,
        message: 'يوجد طلب سابق بنفس رقم الترخيص',
      });
    }

    const request = await DoctorRequest.create({
      ...req.body,
      email: req.body.email.toLowerCase(),
      requestType: 'doctor',
      status: 'pending',
      ...(req.files?.licenseDocument && { licenseDocumentUrl: req.files.licenseDocument[0].path }),
      ...(req.files?.degreeDocument && { degreeDocumentUrl: req.files.degreeDocument[0].path }),
      ...(req.files?.nationalIdDocument && { nationalIdDocumentUrl: req.files.nationalIdDocument[0].path }),
    });

    await AuditLog.record({
      userEmail: request.email,
      action: 'DOCTOR_REQUEST_SUBMITTED',
      description: `New doctor application: ${request.firstName} ${request.lastName} (${request.specialization})`,
      resourceType: 'doctor_requests',
      resourceId: request._id,
      ipAddress,
      userAgent: req.headers['user-agent'],
      platform: req.headers['x-platform'] || 'web',
      success: true,
      metadata: {
        specialization: request.specialization,
        yearsOfExperience: request.yearsOfExperience,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'تم استلام الطلب بنجاح. ستتم مراجعته من قبل الإدارة',
      requestId: request._id,
    });
  } catch (error) {
    console.error('❌ Register doctor error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إرسال الطلب',
      error: error.message,
    });
  }
};

exports.registerPharmacist = async (req, res) => {
  const ipAddress = getClientIp(req);

  try {
    const request = await DoctorRequest.create({
      ...req.body,
      email: req.body.email.toLowerCase(),
      requestType: 'pharmacist',
      status: 'pending',
      ...(req.files?.licenseDocument && { licenseDocumentUrl: req.files.licenseDocument[0].path }),
      ...(req.files?.degreeDocument && { degreeDocumentUrl: req.files.degreeDocument[0].path }),
      ...(req.files?.nationalIdDocument && { nationalIdDocumentUrl: req.files.nationalIdDocument[0].path }),
    });

    await AuditLog.record({
      userEmail: request.email,
      action: 'PHARMACIST_REQUEST_SUBMITTED',
      description: `New pharmacist application: ${request.firstName} ${request.lastName}`,
      resourceType: 'doctor_requests',
      resourceId: request._id,
      ipAddress,
      userAgent: req.headers['user-agent'],
      platform: req.headers['x-platform'] || 'web',
      success: true,
    });

    return res.status(201).json({
      success: true,
      message: 'تم استلام الطلب بنجاح',
      requestId: request._id,
    });
  } catch (error) {
    console.error('❌ Register pharmacist error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إرسال الطلب',
      error: error.message,
    });
  }
};

exports.registerLabTechnician = async (req, res) => {
  const ipAddress = getClientIp(req);

  try {
    const request = await DoctorRequest.create({
      ...req.body,
      email: req.body.email.toLowerCase(),
      requestType: 'lab_technician',
      status: 'pending',
      ...(req.files?.licenseDocument && { licenseDocumentUrl: req.files.licenseDocument[0].path }),
      ...(req.files?.degreeDocument && { degreeDocumentUrl: req.files.degreeDocument[0].path }),
      ...(req.files?.nationalIdDocument && { nationalIdDocumentUrl: req.files.nationalIdDocument[0].path }),
    });

    await AuditLog.record({
      userEmail: request.email,
      action: 'LAB_TECH_REQUEST_SUBMITTED',
      description: `New lab technician application: ${request.firstName} ${request.lastName}`,
      resourceType: 'doctor_requests',
      resourceId: request._id,
      ipAddress,
      userAgent: req.headers['user-agent'],
      platform: req.headers['x-platform'] || 'web',
      success: true,
    });

    return res.status(201).json({
      success: true,
      message: 'تم استلام الطلب بنجاح',
      requestId: request._id,
    });
  } catch (error) {
    console.error('❌ Register lab technician error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في إرسال الطلب',
      error: error.message,
    });
  }
};

// ============================================================================
// 10. STATUS CHECKS
// ============================================================================

exports.checkDoctorStatus = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مطلوب',
      });
    }

    const request = await DoctorRequest.findOne({
      email: email.toLowerCase(),
      requestType: 'doctor',
    }).sort({ createdAt: -1 }).lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على طلب',
      });
    }

    return res.status(200).json({
      success: true,
      status: request.status,
      rejectionReason: request.rejectionReason,
      rejectionDetails: request.rejectionDetails,
      submittedAt: request.createdAt,
      reviewedAt: request.reviewedAt,
    });
  } catch (error) {
    console.error('❌ Check doctor status error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error.message,
    });
  }
};

exports.checkProfessionalStatus = async (req, res) => {
  try {
    const { email, type } = req.query;
    if (!email || !type) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني ونوع الطلب مطلوبان',
      });
    }

    const request = await DoctorRequest.findOne({
      email: email.toLowerCase(),
      requestType: type,
    }).sort({ createdAt: -1 }).lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على طلب',
      });
    }

    return res.status(200).json({
      success: true,
      status: request.status,
      rejectionReason: request.rejectionReason,
      rejectionDetails: request.rejectionDetails,
      submittedAt: request.createdAt,
      reviewedAt: request.reviewedAt,
    });
  } catch (error) {
    console.error('❌ Check professional status error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error.message,
    });
  }
};

// Register endpoint alias (some routes import as 'register')
exports.register = exports.signup;