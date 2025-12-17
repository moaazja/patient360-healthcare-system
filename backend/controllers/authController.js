const jwt = require('jsonwebtoken');
const Account = require('../models/Account');
const Person = require('../models/Person');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register new patient
// @route   POST /api/auth/register (or /api/auth/signup)
// @access  Public
exports.signup = async (req, res) => {
  console.log('🔵 Signup request received');
  console.log('📦 Request body:', req.body);
  
  try {
    const {
      // Person data
      nationalId,
      parentNationalId,
      isMinor,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phoneNumber,
      address,
      
      // Account data
      email,
      password,
      
      // Patient data
      bloodType,
      height,
      weight,
      smokingStatus,
      allergies,
      chronicDiseases,
      familyHistory,
      
      // Emergency Contact - UPDATED TO ACCEPT OBJECT
      emergencyContact,
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone
    } = req.body;

    console.log('✅ Step 1: Data extracted from body');

    // ========================================
    // 1. Extract Emergency Contact (support both formats)
    // ========================================
    let emergencyName, emergencyRelationship, emergencyPhone;
    
    if (emergencyContact && typeof emergencyContact === 'object') {
      // NEW FORMAT: emergencyContact object
      emergencyName = emergencyContact.name;
      emergencyRelationship = emergencyContact.relationship;
      emergencyPhone = emergencyContact.phone;
      console.log('✅ Emergency contact format: OBJECT');
    } else {
      // OLD FORMAT: separate fields
      emergencyName = emergencyContactName;
      emergencyRelationship = emergencyContactRelationship;
      emergencyPhone = emergencyContactPhone;
      console.log('✅ Emergency contact format: SEPARATE FIELDS');
    }

    // ========================================
    // 2. التحقق من وجود البيانات المطلوبة
    // ========================================
    if (!firstName || !lastName || !dateOfBirth || !gender || !phoneNumber || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول المطلوبة يجب أن تكون موجودة'
      });
    }

    // Validate ID based on isMinor flag
    if (isMinor && !parentNationalId) {
      console.log('❌ Missing parent national ID for minor');
      return res.status(400).json({
        success: false,
        message: 'رقم الهوية الوطنية للوالد/الوالدة مطلوب للقاصرين'
      });
    }

    if (!isMinor && !nationalId) {
      console.log('❌ Missing national ID for adult');
      return res.status(400).json({
        success: false,
        message: 'رقم الهوية الوطنية مطلوب'
      });
    }

    if (!emergencyName || !emergencyRelationship || !emergencyPhone) {
      console.log('❌ Missing emergency contact');
      console.log('Emergency data:', { emergencyName, emergencyRelationship, emergencyPhone });
      return res.status(400).json({
        success: false,
        message: 'معلومات جهة الاتصال للطوارئ مطلوبة (الاسم، صلة القرابة، رقم الهاتف)'
      });
    }

    console.log('✅ Step 2: All required fields present');

    // ========================================
    // 3. التحقق من عدم وجود حساب مسبق
    // ========================================
    console.log('🔍 Checking for existing account...');
    const existingAccount = await Account.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      console.log('❌ Email already exists');
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    // Check national ID for adults only
    if (!isMinor) {
      console.log('🔍 Checking for existing person (adult)...');
      const existingPerson = await Person.findOne({ nationalId });
      if (existingPerson) {
        console.log('❌ National ID already exists');
        return res.status(400).json({
          success: false,
          message: 'رقم الهوية الوطنية مستخدم بالفعل'
        });
      }
    }

    console.log('✅ Step 3: No duplicate accounts found');

    // ========================================
    // 4. التحقق من صحة تاريخ الميلاد
    // ========================================
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    if (birthDate >= today) {
      console.log('❌ Invalid birth date - future date');
      return res.status(400).json({
        success: false,
        message: 'تاريخ الميلاد يجب أن يكون في الماضي'
      });
    }

    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 1 || age > 120) {
      console.log('❌ Invalid age:', age);
      return res.status(400).json({
        success: false,
        message: 'تاريخ الميلاد غير صحيح'
      });
    }

    console.log('✅ Step 4: Birth date validated, age:', age);

    // ========================================
    // 5. Generate Child ID for Minors
    // ========================================
    let childId = null;
    if (isMinor) {
      console.log('🔍 Generating child ID for minor...');
      // Find existing children of this parent
      const existingChildren = await Person.find({ 
        parentNationalId 
      }).sort({ childId: -1 });
      
      let childNumber = 1;
      if (existingChildren.length > 0 && existingChildren[0].childId) {
        const lastNumber = parseInt(existingChildren[0].childId.split('-')[1]);
        childNumber = lastNumber + 1;
      }
      
      childId = `${parentNationalId}-${childNumber.toString().padStart(2, '0')}`;
      console.log('✅ Generated child ID:', childId);
    }

    // ========================================
    // 6. إنشاء Person Document
    // ========================================
    console.log('📝 Creating Person document...');
    const personData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: birthDate,
      gender,
      phoneNumber: phoneNumber.replace(/\s/g, ''),
      address: address?.trim()
    };

    // Add ID fields based on minor status
    if (isMinor) {
      personData.nationalId = null;
      personData.parentNationalId = parentNationalId;
      personData.childId = childId;
      personData.isMinor = true;
    } else {
      personData.nationalId = nationalId;
      personData.parentNationalId = null;
      personData.childId = null;
      personData.isMinor = false;
    }

    const person = await Person.create(personData);
    console.log('✅ Step 5: Person created with ID:', person._id);

    // ========================================
    // 7. إنشاء Account Document
    // ========================================
    console.log('📝 Creating Account document...');
    const account = await Account.create({
      email: email.trim().toLowerCase(),
      password,
      roles: ['patient'],
      personId: person._id,
      isActive: true
    });
    console.log('✅ Step 6: Account created with ID:', account._id);

    // ========================================
    // 8. تحضير بيانات Patient
    // ========================================
    console.log('📝 Preparing Patient data...');
    const patientData = {
      personId: person._id,
      emergencyContact: {
        name: emergencyName.trim(),
        relationship: emergencyRelationship.trim(),
        phoneNumber: emergencyPhone.replace(/\s/g, '')
      }
    };

    if (bloodType) patientData.bloodType = bloodType;
    if (height) patientData.height = parseFloat(height);
    if (weight) patientData.weight = parseFloat(weight);
    if (smokingStatus) patientData.smokingStatus = smokingStatus;
    
    // Handle arrays
    if (allergies && Array.isArray(allergies)) {
      patientData.allergies = allergies.filter(item => item && item.trim());
    } else if (allergies && typeof allergies === 'string' && allergies.trim()) {
      patientData.allergies = allergies.split(',').map(item => item.trim()).filter(item => item);
    }
    
    if (chronicDiseases && Array.isArray(chronicDiseases)) {
      patientData.chronicDiseases = chronicDiseases.filter(item => item && item.trim());
    } else if (chronicDiseases && typeof chronicDiseases === 'string' && chronicDiseases.trim()) {
      patientData.chronicDiseases = chronicDiseases.split(',').map(item => item.trim()).filter(item => item);
    }
    
    if (familyHistory && Array.isArray(familyHistory)) {
      patientData.familyHistory = familyHistory.filter(item => item && item.trim());
    } else if (familyHistory && typeof familyHistory === 'string' && familyHistory.trim()) {
      patientData.familyHistory = familyHistory.split(',').map(item => item.trim()).filter(item => item);
    }

    console.log('📦 Patient data prepared:', patientData);

    // ========================================
    // 9. إنشاء Patient Document
    // ========================================
    console.log('📝 Creating Patient document...');
    const patient = await Patient.create(patientData);
    console.log('✅ Step 7: Patient created with ID:', patient._id);

    // ========================================
    // 10. إنشاء JWT Token
    // ========================================
    console.log('🔑 Generating JWT token...');
    const token = generateToken(account._id);
    console.log('✅ Step 8: Token generated');

    // ========================================
    // 11. إرسال الاستجابة
    // ========================================
    console.log('✅ SUCCESS: Sending response');
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      token,
      user: {
        accountId: account._id,
        email: account.email,
        roles: account.roles,
        personId: person._id,
        firstName: person.firstName,
        lastName: person.lastName,
        nationalId: person.nationalId,
        childId: person.childId,
        isMinor: person.isMinor,
        phoneNumber: person.phoneNumber,
        patientId: patient._id
      }
    });

  } catch (error) {
    console.error('❌❌❌ SIGNUP ERROR - FULL DETAILS ❌❌❌');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);

    // معالجة أخطاء Mongoose Validation
    if (error.name === 'ValidationError') {
      console.error('Validation Error Details:', error.errors);
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'خطأ في البيانات المدخلة'
      });
    }

    // معالجة أخطاء التكرار
    if (error.code === 11000) {
      console.error('Duplicate Key Error:', error.keyPattern);
      const field = Object.keys(error.keyPattern)[0];
      const arabicFields = {
        email: 'البريد الإلكتروني',
        nationalId: 'رقم الهوية الوطنية',
        phoneNumber: 'رقم الهاتف'
      };
      return res.status(400).json({
        success: false,
        message: `${arabicFields[field] || field} مستخدم بالفعل`
      });
    }

    res.status(500).json({
      success: false,
      message: 'حدث خطأ في السيرفر. الرجاء المحاولة مرة أخرى'
    });
  }
};

// Login remains the same...
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const account = await Account.findOne({ email: email.toLowerCase() });

    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    if (account.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'الحساب مقفل بسبب عدة محاولات فاشلة. الرجاء المحاولة لاحقاً'
      });
    }

    if (!account.isActive) {
      return res.status(403).json({
        success: false,
        message: 'الحساب غير مفعّل. الرجاء التواصل مع الإدارة'
      });
    }

    const isPasswordCorrect = await account.comparePassword(password);

    if (!isPasswordCorrect) {
      account.loginAttempts += 1;

      if (account.loginAttempts >= 5) {
        account.lockUntil = Date.now() + (15 * 60 * 1000);
        await account.save();
        
        return res.status(423).json({
          success: false,
          message: 'تم قفل الحساب بسبب عدة محاولات فاشلة. الرجاء المحاولة بعد 15 دقيقة'
        });
      }

      await account.save();

      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    account.loginAttempts = 0;
    account.lockUntil = null;
    account.lastLogin = new Date();
    await account.save();

    const person = await Person.findById(account.personId);

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'بيانات المستخدم غير موجودة'
      });
    }

    let roleData = {};

    for (const role of account.roles) {
      if (role === 'patient') {
        const patient = await Patient.findOne({ personId: account.personId });
        if (patient) {
          roleData.patient = {
            bloodType: patient.bloodType,
            height: patient.height,
            weight: patient.weight,
            allergies: patient.allergies,
            chronicDiseases: patient.chronicDiseases,
            smokingStatus: patient.smokingStatus,
            emergencyContact: patient.emergencyContact
          };
        }
      }

      if (role === 'doctor') {
        const doctor = await Doctor.findOne({ personId: account.personId });
        if (doctor) {
          roleData.doctor = {
            medicalLicenseNumber: doctor.medicalLicenseNumber,
            specialization: doctor.specialization,
            yearsOfExperience: doctor.yearsOfExperience,
            hospitalAffiliation: doctor.hospitalAffiliation,
            consultationFee: doctor.consultationFee
          };
        }
      }

      if (role === 'admin') {
        roleData.admin = {
          hasAdminAccess: true
        };
      }
    }

    const token = generateToken(account._id);

    res.status(200).json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        accountId: account._id,
        email: account.email,
        roles: account.roles,
        isActive: account.isActive,
        personId: person._id,
        firstName: person.firstName,
        lastName: person.lastName,
        nationalId: person.nationalId,
        childId: person.childId,
        isMinor: person.isMinor,
        phoneNumber: person.phoneNumber,
        dateOfBirth: person.dateOfBirth,
        gender: person.gender,
        address: person.address,
        roleData
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول'
    });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    const person = await Person.findById(req.account.personId);

    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'بيانات المستخدم غير موجودة'
      });
    }

    let roleData = {};

    for (const role of req.account.roles) {
      if (role === 'patient') {
        const patient = await Patient.findOne({ personId: req.account.personId });
        if (patient) {
          roleData.patient = {
            bloodType: patient.bloodType,
            height: patient.height,
            weight: patient.weight,
            allergies: patient.allergies,
            chronicDiseases: patient.chronicDiseases,
            smokingStatus: patient.smokingStatus
          };
        }
      }

      if (role === 'doctor') {
        const doctor = await Doctor.findOne({ personId: req.account.personId });
        if (doctor) {
          roleData.doctor = {
            medicalLicenseNumber: doctor.medicalLicenseNumber,
            specialization: doctor.specialization,
            yearsOfExperience: doctor.yearsOfExperience,
            hospitalAffiliation: doctor.hospitalAffiliation
          };
        }
      }

      if (role === 'admin') {
        roleData.admin = {
          hasAdminAccess: true
        };
      }
    }

    res.status(200).json({
      success: true,
      user: {
        accountId: req.account._id,
        email: req.account.email,
        roles: req.account.roles,
        isActive: req.account.isActive,
        personId: person._id,
        firstName: person.firstName,
        lastName: person.lastName,
        nationalId: person.nationalId,
        phoneNumber: person.phoneNumber,
        dateOfBirth: person.dateOfBirth,
        gender: person.gender,
        address: person.address,
        roleData
      }
    });

  } catch (error) {
    console.error('Verify Token Error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من الرمز'
    });
  }
};

exports.updateLastLogin = async (req, res) => {
  try {
    req.account.lastLogin = new Date();
    await req.account.save();

    res.status(200).json({
      success: true,
      message: 'تم تحديث آخر تسجيل دخول'
    });

  } catch (error) {
    console.error('Update Last Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحديث'
    });
  }
};