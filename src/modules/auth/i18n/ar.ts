import type { en } from './en';

export const ar: typeof en = {
  login: {
    title: 'تسجيل الدخول',
    description: 'أدخل اسم المستخدم وكلمة المرور، وسنرسل لك رمز تحقق.',
    username: 'اسم المستخدم أو البريد الإلكتروني',
    password: 'كلمة المرور',
    forgot: 'نسيت كلمة المرور؟',
    submit: 'متابعة',
    submitting: 'جارٍ التحقق…',
    expired: 'انتهت جلستك. سجّل الدخول مرة أخرى.',
  },
  otp: {
    title: 'أدخل رمز التحقق',
    description: 'أرسلنا رمزًا من {{count}} أرقام إلى',
    label: 'رمز التحقق',
    verifying: 'جارٍ التحقق…',
    verifyFailed: 'حدث خطأ أثناء التحقق من الرمز.',
    resend: 'إعادة إرسال الرمز',
    resendIn: 'إعادة الإرسال بعد {{seconds}} ث',
    resent: 'تم إرسال رمز جديد',
    resendFailed: 'تعذّرت إعادة إرسال الرمز.',
    back: 'رجوع',
  },
  forgot: {
    title: 'إعادة تعيين كلمة المرور',
    description: 'أدخل اسم المستخدم وسنرسل لك رمزًا للتأكد من هويتك.',
    submit: 'إرسال الرمز',
    submitting: 'جارٍ الإرسال…',
    failed: 'حدث خطأ ما. حاول مرة أخرى.',
    backToLogin: 'العودة لتسجيل الدخول',
  },
  reset: {
    title: 'اختر كلمة مرور جديدة',
    description: 'للمستخدم',
    password: 'كلمة المرور الجديدة',
    confirm: 'تأكيد كلمة المرور الجديدة',
    rules:
      '6 أحرف على الأقل، تتضمن رقمًا وحرفًا صغيرًا وحرفًا كبيرًا ورمزًا خاصًا.',
    submit: 'تحديث كلمة المرور',
    submitting: 'جارٍ التحديث…',
    done: 'تم تحديث كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.',
  },
  account: {
    signOut: 'تسجيل الخروج',
  },
  validation: {
    required: 'مطلوب',
    passwordLength: 'استخدم من 6 إلى 50 حرفًا',
    passwordMin: 'استخدم 6 أحرف على الأقل',
    passwordDigit: 'أضف رقمًا واحدًا على الأقل',
    passwordLower: 'أضف حرفًا صغيرًا واحدًا على الأقل',
    passwordUpper: 'أضف حرفًا كبيرًا واحدًا على الأقل',
    passwordSymbol: 'أضف رمزًا واحدًا على الأقل',
    passwordSpecial: 'أضف رمزًا خاصًا واحدًا على الأقل، مثل ! @ # $',
    passwordMatch: 'كلمتا المرور غير متطابقتين',
  },
};
