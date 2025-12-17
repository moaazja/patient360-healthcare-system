const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'معرف المريض مطلوب']
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'معرف الطبيب مطلوب']
  },
  visitDate: {
    type: Date,
    required: [true, 'تاريخ الزيارة مطلوب']
  },
  visitTime: {
    type: String,
    required: [true, 'وقت الزيارة مطلوب'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/, 'وقت الزيارة يجب أن يكون بصيغة HH:MM AM/PM']
  },
  status: {
    type: String,
    required: [true, 'حالة الزيارة مطلوبة'],
    enum: {
      values: ['scheduled', 'completed', 'cancelled', 'no-show'],
      message: 'حالة الزيارة غير صالحة'
    }
  },
  chiefComplaint: {
    type: String,
    minlength: [5, 'الشكوى الرئيسية يجب أن تكون 5 أحرف على الأقل'],
    maxlength: [500, 'الشكوى الرئيسية يجب ألا تتجاوز 500 حرف']
  },
  vitalSigns: {
    bloodPressure: {
      type: String,
      match: [/^[0-9]{2,3}\/[0-9]{2,3}$/, 'ضغط الدم يجب أن يكون بصيغة XXX/XX']
    },
    heartRate: {
      type: Number,
      min: [30, 'معدل ضربات القلب يجب أن يكون بين 30 و 250'],
      max: [250, 'معدل ضربات القلب يجب أن يكون بين 30 و 250']
    },
    temperature: {
      type: Number,
      min: [35, 'درجة الحرارة يجب أن تكون بين 35 و 43'],
      max: [43, 'درجة الحرارة يجب أن تكون بين 35 و 43']
    },
    oxygenSaturation: {
      type: Number,
      min: [50, 'نسبة الأكسجين يجب أن تكون بين 50 و 100'],
      max: [100, 'نسبة الأكسجين يجب أن تكون بين 50 و 100']
    }
  },
  diagnosis: {
    type: String,
    minlength: [5, 'التشخيص يجب أن يكون 5 أحرف على الأقل'],
    maxlength: [1000, 'التشخيص يجب ألا يتجاوز 1000 حرف']
  },
  prescribedMedications: [{
    medicationName: {
      type: String,
      required: [true, 'اسم الدواء مطلوب'],
      minlength: [2, 'اسم الدواء يجب أن يكون حرفين على الأقل'],
      maxlength: [100, 'اسم الدواء يجب ألا يتجاوز 100 حرف']
    },
    dosage: {
      type: String,
      required: [true, 'الجرعة مطلوبة'],
      minlength: [2, 'الجرعة يجب أن تكون حرفين على الأقل'],
      maxlength: [50, 'الجرعة يجب ألا تتجاوز 50 حرفاً'],
      match: [/^[0-9]+\s?(mg|g|ml|units?)$/, 'الجرعة يجب أن تكون بصيغة صحيحة (مثل: 500mg)']
    },
    frequency: {
      type: String,
      required: [true, 'التكرار مطلوب'],
      minlength: [5, 'التكرار يجب أن يكون 5 أحرف على الأقل'],
      maxlength: [100, 'التكرار يجب ألا يتجاوز 100 حرف']
    },
    duration: {
      type: String,
      required: [true, 'المدة مطلوبة'],
      minlength: [3, 'المدة يجب أن تكون 3 أحرف على الأقل'],
      maxlength: [50, 'المدة يجب ألا تتجاوز 50 حرفاً']
    }
  }],
  labTests: [{
    type: String,
    minlength: [2, 'اسم التحليل يجب أن يكون حرفين على الأقل'],
    maxlength: [100, 'اسم التحليل يجب ألا يتجاوز 100 حرف']
  }],
  doctorNotes: {
    type: String,
    maxlength: [2000, 'ملاحظات الطبيب يجب ألا تتجاوز 2000 حرف']
  },
  followUpDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'visits'
});

// Indexes
visitSchema.index({ patientId: 1, visitDate: -1 });
visitSchema.index({ doctorId: 1, visitDate: -1 });
visitSchema.index({ status: 1 });
visitSchema.index({ visitDate: 1 });

module.exports = mongoose.model('Visit', visitSchema, 'visits');
