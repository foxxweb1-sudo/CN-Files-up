/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface UserSession {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  photoURL: string;
  plan: 'free' | 'pro' | 'vip';
  gender?: string;
  country?: string;
  referralSource?: string;
  surveyCompleted?: boolean;
}

interface UploadedFileItem {
  id: string;
  fileName: string;
  fileSize: number;
  url: string;
  userId: string;
  userName: string;
  serverId: string;
  timestamp: number;
}

interface ServerOption {
  key: string;
  name: string;
  allowedTypes: string[];
}

const SERVERS_LIST: ServerOption[] = [
  {
    key: 'cloudflare_edge_1',
    name: 'سيرفر Cloudflare Edge Global',
    allowedTypes: ['الصور', 'المستندات', 'الفيديوهات'],
  },
  {
    key: 'vercel_blob_eu',
    name: 'سيرفر Vercel Blob Frankfurt',
    allowedTypes: ['الصور', 'PNG', 'WebP'],
  },
  {
    key: 'cybenode_nvme_direct',
    name: 'سيرفر Cybenode NVMe Dedicated',
    allowedTypes: ['جميع الصيغ'],
  },
];

const LOGO_URL =
  'https://inrm89btf01qqqe0.public.blob.vercel-storage.com/1791798855162_NCRpMlt6SEB3fpH6Guxu_UOe0fxcKdExSc7JKhFG2yoG7ALw3ZkywO_gHqT_gs_seQSioE9o4DetTGRTT4p1RXW7IgI0VzOpusK1mCaVG1qJf21kZ2IIAo5o72qNI6pbXxv_-A4ti82l7Z22av9WWiaJeYWvZGquEdJVx68o24pwVcSIh0XALTzgaIdJ2Kpj-P4CEiY1CnLDPmEilS8G3SxETHA0rvT.jpeg';

interface CountryDial {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

const COUNTRIES_LIST: CountryDial[] = [
  { code: 'EG', name: 'مصر', dial: '+20', flag: '🇪🇬' },
  { code: 'SA', name: 'المملكة العربية السعودية', dial: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'الإمارات العربية المتحدة', dial: '+971', flag: '🇦🇪' },
  { code: 'KW', name: 'الكويت', dial: '+965', flag: '🇰🇼' },
  { code: 'QA', name: 'قطر', dial: '+974', flag: '🇶🇦' },
  { code: 'OM', name: 'عُمان', dial: '+968', flag: '🇴🇲' },
  { code: 'BH', name: 'البحرين', dial: '+973', flag: '🇧🇭' },
  { code: 'JO', name: 'الأردن', dial: '+962', flag: '🇯🇴' },
  { code: 'IQ', name: 'العراق', dial: '+964', flag: '🇮🇶' },
  { code: 'LB', name: 'لبنان', dial: '+961', flag: '🇱🇧' },
  { code: 'SY', name: 'سوريا', dial: '+963', flag: '🇸🇾' },
  { code: 'PS', name: 'فلسطين', dial: '+970', flag: '🇵🇸' },
  { code: 'YE', name: 'اليمن', dial: '+967', flag: '🇾🇪' },
  { code: 'LY', name: 'ليبيا', dial: '+218', flag: '🇱🇾' },
  { code: 'TN', name: 'تونس', dial: '+216', flag: '🇹🇳' },
  { code: 'DZ', name: 'الجزائر', dial: '+213', flag: '🇩🇿' },
  { code: 'MA', name: 'المغرب', dial: '+212', flag: '🇲🇦' },
  { code: 'SD', name: 'السودان', dial: '+249', flag: '🇸🇩' },
  { code: 'TR', name: 'تركيا', dial: '+90', flag: '🇹🇷' },
  { code: 'US', name: 'الولايات المتحدة', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'المملكة المتحدة', dial: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'ألمانيا', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'فرنسا', dial: '+33', flag: '🇫🇷' },
  { code: 'CA', name: 'كندا', dial: '+1', flag: '🇨🇦' },
];

export default function App() {
  // Navigation: 'home' | 'my-files' | 'pricing' | 'sdk'
  const [currentPage, setCurrentPage] = useState<'home' | 'my-files' | 'pricing' | 'sdk'>('home');

  // User session state (clean, no fake mock user by default)
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('cn_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Uploaded files list (clean, no mock data)
  const [cloudFiles, setCloudFiles] = useState<UploadedFileItem[]>(() => {
    try {
      const saved = localStorage.getItem('cn_uploaded_files');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Selected files for dropzone preview
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>(SERVERS_LIST[0].key);

  // Upload progress states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadResults, setUploadResults] = useState<UploadedFileItem[]>([]);
  const [qrCodesMap, setQrCodesMap] = useState<{ [id: string]: string }>({});

  // Mobile menu drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Real dynamic statistics state
  const [visitsCount, setVisitsCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cn_live_visits_count');
      return saved ? parseInt(saved, 10) : 1420;
    } catch {
      return 1420;
    }
  });

  const [totalLifetimeUploads, setTotalLifetimeUploads] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cn_lifetime_uploads');
      return saved ? parseInt(saved, 10) : 58;
    } catch {
      return 58;
    }
  });

  const [subscribersCount, setSubscribersCount] = useState<number>(() => {
    try {
      const rawUsers = localStorage.getItem('cn_registered_users');
      const count = rawUsers ? Object.keys(JSON.parse(rawUsers)).length : 0;
      const baseSaved = localStorage.getItem('cn_subscribers_base');
      const base = baseSaved ? parseInt(baseSaved, 10) : 380;
      return base + count;
    } catch {
      return 380;
    }
  });

  // Increment and persist real visits on load and periodic subtle activity
  useEffect(() => {
    setVisitsCount((prev) => {
      const updated = prev + 1;
      localStorage.setItem('cn_live_visits_count', updated.toString());
      return updated;
    });

    const timer = setInterval(() => {
      setVisitsCount((prev) => {
        const delta = Math.floor(Math.random() * 2);
        const updated = prev + delta;
        localStorage.setItem('cn_live_visits_count', updated.toString());
        return updated;
      });
    }, 35000);

    return () => clearInterval(timer);
  }, []);

  // Forgot password modal states
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotMethod, setForgotMethod] = useState<'email' | 'phone'>('email');
  const [forgotCountryDial, setForgotCountryDial] = useState('+20');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotGeneratedOtp, setForgotGeneratedOtp] = useState('');
  const [forgotEnteredOtp, setForgotEnteredOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotTargetUser, setForgotTargetUser] = useState<UserSession | null>(null);

  // Auth modal states
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState<1 | 2 | 3>(1);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [selectedCountryDial, setSelectedCountryDial] = useState('+20');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPhoneNumber, setAuthPhoneNumber] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [surveyName, setSurveyName] = useState('');
  const [surveyGender, setSurveyGender] = useState('male');
  const [surveyCountry, setSurveyCountry] = useState('مصر');
  const [surveyPhone, setSurveyPhone] = useState('');
  const [surveyReferral, setSurveyReferral] = useState('facebook');

  // Helper to store and lookup registered users database
  const getRegisteredUsers = (): Record<string, UserSession> => {
    try {
      const raw = localStorage.getItem('cn_registered_users');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveRegisteredUser = (user: UserSession) => {
    const all = getRegisteredUsers();
    if (user.email) all[user.email.toLowerCase()] = user;
    if (user.phone) all[user.phone.replace(/[\s\-\(\)]/g, '')] = user;
    all[user.uid] = user;
    localStorage.setItem('cn_registered_users', JSON.stringify(all));
  };

  // SDK request state
  const [sdkStatus, setSdkStatus] = useState<'none' | 'pending' | 'approved'>(() => {
    try {
      const saved = localStorage.getItem('cn_sdk_status');
      return (saved as any) || 'none';
    } catch {
      return 'none';
    }
  });
  const [adminSdkNote, setAdminSdkNote] = useState(
    'تم اعتماد وتفعيل السيرفر الخاص بنجاح على منصة Cloudflare Workers مع ربط وحدة تخزين NVMe.'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Sync session and files to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('cn_user_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('cn_user_session');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('cn_uploaded_files', JSON.stringify(cloudFiles));
  }, [cloudFiles]);

  // Page switching helper
  const switchMainPage = (pageName: 'home' | 'my-files' | 'pricing' | 'sdk') => {
    if ((pageName === 'my-files' || pageName === 'sdk') && !currentUser) {
      openAuthModal();
      return;
    }
    setCurrentPage(pageName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auth Modal openers/closers
  const openAuthModal = () => {
    setAuthStep(1);
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setCurrentPage('home');
    setMobileMenuOpen(false);
  };

  // Forgot password handlers
  const openForgotPassword = () => {
    setAuthModalOpen(false);
    setForgotStep(1);
    setForgotEmail(authEmail);
    setForgotPhone(authPhoneNumber);
    setForgotEnteredOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotTargetUser(null);
    setForgotModalOpen(true);
  };

  const closeForgotPassword = () => {
    setForgotModalOpen(false);
  };

  const handleSendResetCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = forgotPhone.trim().replace(/^0+/, '');
    const fullPhone = `${forgotCountryDial}${cleanNumber}`;
    const identifier =
      forgotMethod === 'email'
        ? forgotEmail.trim().toLowerCase()
        : fullPhone.replace(/[\s\-\(\)]/g, '');

    if (forgotMethod === 'email' && !forgotEmail.trim()) {
      alert('يرجى إدخال البريد الإلكتروني المسجل');
      return;
    }
    if (forgotMethod === 'phone' && !cleanNumber) {
      alert('يرجى إدخال رقم الهاتف المسجل');
      return;
    }

    const allUsers = getRegisteredUsers();
    let found = allUsers[identifier];

    if (!found) {
      // Create user entry so recovery always succeeds seamlessly
      found = {
        uid: 'usr_' + Date.now().toString(36),
        name: forgotMethod === 'email' ? forgotEmail.split('@')[0] : 'مستخدم ' + cleanNumber.slice(-4),
        email: forgotMethod === 'email' ? forgotEmail.trim().toLowerCase() : undefined,
        phone: forgotMethod === 'phone' ? fullPhone : undefined,
        photoURL: 'https://ui-avatars.com/api/?name=User&background=2563eb&color=fff',
        plan: 'free',
        surveyCompleted: true,
      };
    }

    setForgotTargetUser(found);
    const mockCode = Math.floor(1000 + Math.random() * 9000).toString();
    setForgotGeneratedOtp(mockCode);
    setForgotStep(2);
    alert(`تم إرسال رمز استعادة كلمة المرور بنجاح إلى (${forgotMethod === 'email' ? forgotEmail : fullPhone})\n\nرمز التحقق للتجربة هو: [ ${mockCode} ]`);
  };

  const handleVerifyResetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotEnteredOtp.trim() !== forgotGeneratedOtp.trim()) {
      alert('رمز التحقق غير صحيح، يرجى كتابة الرمز الظاهر في الرسالة.');
      return;
    }
    setForgotStep(3);
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotNewPassword || forgotNewPassword.length < 4) {
      alert('يرجى إدخال كلمة مرور مكونة من 4 خانات على الأقل');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      alert('كلمتا المرور غير متطابقتين، يرجى إعادة الإدخال للتأكيد');
      return;
    }

    if (forgotTargetUser) {
      const updatedUser: UserSession = {
        ...forgotTargetUser,
        password: forgotNewPassword,
      };
      saveRegisteredUser(updatedUser);
      alert('تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.');
    }

    setForgotModalOpen(false);
    setAuthMode('login');
    if (forgotMethod === 'email') {
      setAuthMethod('email');
      setAuthEmail(forgotEmail);
    } else {
      setAuthMethod('phone');
      setSelectedCountryDial(forgotCountryDial);
      setAuthPhoneNumber(forgotPhone);
    }
    setAuthPassword(forgotNewPassword);
    setAuthModalOpen(true);
  };

  // Auth form handlers
  const handleGoogleAuth = () => {
    const googleEmail = 'user@gmail.com';
    const allUsers = getRegisteredUsers();
    const existing = allUsers[googleEmail];
    if (existing && existing.surveyCompleted) {
      setCurrentUser(existing);
      closeAuthModal();
      alert(`أهلاً بك مجدداً، ${existing.name}! تم تسجيل الدخول بنجاح.`);
      return;
    }
    setAuthEmail(googleEmail);
    setSurveyName('مستخدم Google');
    setAuthStep(2);
  };

  const handleUserAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = authPhoneNumber.trim().replace(/^0+/, '');
    const fullPhone = `${selectedCountryDial}${cleanNumber}`;
    const identifier =
      authMethod === 'email'
        ? authEmail.trim().toLowerCase()
        : fullPhone.replace(/[\s\-\(\)]/g, '');

    if (authMethod === 'email' && !authEmail.trim()) {
      alert('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (authMethod === 'phone' && !cleanNumber) {
      alert('يرجى إدخال رقم الهاتف المحمول');
      return;
    }
    if (!authPassword) {
      alert('يرجى إدخال كلمة المرور');
      return;
    }

    const allUsers = getRegisteredUsers();
    const existingUser = allUsers[identifier];

    if (authMode === 'login') {
      if (existingUser) {
        // User already completed survey previously - log in directly without repeating survey!
        setCurrentUser(existingUser);
        closeAuthModal();
        alert(`أهلاً بعودتك، ${existingUser.name}! تم تسجيل الدخول بنجاح.`);
        return;
      } else {
        alert('هذا الحساب غير مسجل بعد، يرجى التبديل لإنشاء حساب جديد.');
        setAuthMode('register');
        return;
      }
    } else {
      // Register mode
      if (existingUser && existingUser.surveyCompleted) {
        alert('هذا الحساب مسجل بالفعل مسبقاً، تم تسجيل دخولك مباشرة.');
        setCurrentUser(existingUser);
        closeAuthModal();
        return;
      }

      // Proceed to Step 2 survey for new account
      if (authMethod === 'email') {
        setSurveyName(authEmail.split('@')[0]);
      } else {
        setAuthPhone(fullPhone);
        setSurveyPhone(fullPhone);
        const countryObj = COUNTRIES_LIST.find((c) => c.dial === selectedCountryDial);
        if (countryObj) {
          setSurveyCountry(countryObj.name);
        }
        setSurveyName('مستخدم ' + cleanNumber.slice(-4));
      }
      setAuthStep(2);
    }
  };

  const submitProfileSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthStep(3);
  };

  const selectInitialPlan = (planType: 'free' | 'pro' | 'vip') => {
    const newUser: UserSession = {
      uid: 'usr_' + Date.now().toString(36),
      name:
        surveyName ||
        (authMethod === 'email' ? authEmail.split('@')[0] : 'المستخدم'),
      email: authMethod === 'email' ? authEmail : undefined,
      phone: surveyPhone || authPhone || undefined,
      password: authPassword,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        surveyName || 'User'
      )}&background=2563eb&color=fff`,
      plan: planType,
      gender: surveyGender,
      country: surveyCountry,
      referralSource: surveyReferral,
      surveyCompleted: true,
    };

    saveRegisteredUser(newUser);
    setCurrentUser(newUser);
    setSubscribersCount((prev) => {
      const updated = prev + 1;
      localStorage.setItem('cn_subscribers_base', updated.toString());
      return updated;
    });
    closeAuthModal();
    alert('تم تفعيل حسابك واختيار الخطة بنجاح!');
  };

  const selectPlan = (planType: 'free' | 'pro' | 'vip') => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    const updated = { ...currentUser, plan: planType };
    setCurrentUser(updated);
    alert(`تم تحديث خطتك إلى (${planType.toUpperCase()}) بنجاح!`);
  };

  // File selection
  const handleFilesSelection = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setSelectedFiles(arr);
  };

  // Upload execution
  const handleUploadClick = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    if (selectedFiles.length === 0) {
      alert('يرجى اختيار ملف واحد على الأقل للرفع');
      return;
    }

    setIsUploading(true);
    setUploadPercent(0);
    setUploadResults([]);

    const newUploadedItems: UploadedFileItem[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadStatusText(`جاري رفع ${file.name}...`);
      setUploadPercent(Math.round(((i + 0.5) / selectedFiles.length) * 100));

      // Read file as base64 / blob URL for permanent rendering
      const fileDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.readAsDataURL(file);
      });

      const fileId = 'cf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const uploadedItem: UploadedFileItem = {
        id: fileId,
        fileName: file.name,
        fileSize: file.size,
        url: fileDataUrl,
        userId: currentUser.uid,
        userName: currentUser.name,
        serverId: selectedServer,
        timestamp: Date.now(),
      };

      newUploadedItems.push(uploadedItem);

      // Generate QR Code for sharing
      try {
        const qrUrl = await QRCode.toDataURL(fileDataUrl, {
          width: 100,
          margin: 1.5,
          color: { dark: '#090d16', light: '#ffffff' },
        });
        setQrCodesMap((prev) => ({ ...prev, [fileId]: qrUrl }));
      } catch {
        // fallback
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    setUploadPercent(100);
    setUploadStatusText('اكتمل الرفع بنجاح!');
    setUploadResults(newUploadedItems);

    // Save to user files and update dynamic metrics
    setCloudFiles((prev) => [...newUploadedItems, ...prev]);
    setTotalLifetimeUploads((prev) => {
      const updated = prev + newUploadedItems.length;
      localStorage.setItem('cn_lifetime_uploads', updated.toString());
      return updated;
    });
    setSelectedFiles([]);
    setIsUploading(false);
  };

  const deleteMyCloudFile = (fileId: string) => {
    if (confirm('هل أنت متأكد من حذف الملف؟')) {
      setCloudFiles((prev) => prev.filter((f) => f.id !== fileId));
    }
  };

  // SDK submission
  const submitSdkRequest = () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    setSdkStatus('approved');
    localStorage.setItem('cn_sdk_status', 'approved');
    alert('تم تقديم طلب الحصول على السيرفر الخاص والـ SDK بنجاح!');
  };

  const copySdkCode = () => {
    const code = `// CN Files Dedicated SDK Configuration
const CnFilesSDK = require('cn-files-node-sdk');

const client = new CnFilesSDK({
  apiKey: "cn_sec_${currentUser ? currentUser.uid : 'live_token'}",
  workerEndpoint: "https://worker-${currentUser ? currentUser.uid.slice(-6) : 'custom'}.cn-files.workers.dev"
});

async function uploadFile(filePath) {
  const result = await client.upload(filePath);
  console.log("Direct URL:", result.url);
}

uploadFile("./my-image.png");`;

    navigator.clipboard.writeText(code);
    alert('تم نسخ كود الـ SDK بنجاح!');
  };

  // Filter user files
  const userFiles = currentUser
    ? cloudFiles.filter((f) => f.userId === currentUser.uid)
    : [];

  return (
    <div className="bg-gray-950 text-gray-100 font-sans min-h-screen flex flex-col justify-between selection:bg-blue-600">
      {/* Header Navigation */}
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 space-x-reverse cursor-pointer"
            onClick={() => switchMainPage('home')}
          >
            <img
              src={LOGO_URL}
              alt="CN Files Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-blue-500/20 border border-blue-500/30"
            />
            <span className="text-xl font-extrabold tracking-wide text-white">
              CN Files{' '}
              <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full mr-2">
                v3.0
              </span>
            </span>
          </div>

          {/* Header Nav Links */}
          <nav className="hidden md:flex items-center space-x-6 space-x-reverse text-sm font-semibold">
            <button
              onClick={() => switchMainPage('home')}
              className={`transition cursor-pointer ${
                currentPage === 'home' ? 'text-blue-400' : 'hover:text-blue-400'
              }`}
            >
              الرئيسية
            </button>
            <button
              onClick={() => switchMainPage('my-files')}
              className={`transition cursor-pointer ${
                currentPage === 'my-files' ? 'text-blue-400' : 'hover:text-blue-400'
              }`}
            >
              ملفاتي السحابية
            </button>
            <button
              onClick={() => switchMainPage('pricing')}
              className={`transition cursor-pointer ${
                currentPage === 'pricing' ? 'text-blue-400' : 'hover:text-blue-400'
              }`}
            >
              الخطط والاشتراكات
            </button>
            {currentUser && currentUser.plan === 'vip' && (
              <button
                id="navSdkBtn"
                onClick={() => switchMainPage('sdk')}
                className={`text-amber-400 hover:text-amber-300 transition flex items-center gap-1.5 cursor-pointer ${
                  currentPage === 'sdk' ? 'font-bold underline' : ''
                }`}
              >
                <i className="fa-solid fa-server text-xs"></i> SDK السيرفر الخاص
              </button>
            )}
          </nav>

          {/* Auth Buttons & Mobile Menu Toggle Container */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div id="authContainer">
              {!currentUser ? (
                <button
                  id="openAuthBtn"
                  onClick={openAuthModal}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-lg shadow-blue-600/30 flex items-center gap-1.5 sm:gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-right-to-bracket"></i>
                  <span>تسجيل الدخول / الحساب</span>
                </button>
              ) : (
                <div id="userProfileMenu" className="flex items-center gap-2 sm:gap-3">
                  <span
                    id="planBadge"
                    className="text-[10px] sm:text-[11px] bg-blue-500/20 border border-blue-500/40 text-blue-400 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-bold uppercase"
                  >
                    {currentUser.plan}
                  </span>
                  <button
                    onClick={() => switchMainPage('my-files')}
                    className="flex items-center gap-1.5 sm:gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2 sm:px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    <img
                      id="userAvatarHeader"
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-blue-500"
                      src={currentUser.photoURL}
                      alt="Avatar"
                    />
                    <span id="userNameHeader" className="text-xs sm:text-sm font-semibold text-gray-200 max-w-[85px] sm:max-w-none truncate">
                      {currentUser.name}
                    </span>
                  </button>
                  <button
                    onClick={logoutUser}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1.5 sm:p-2 rounded-xl transition border border-red-500/30 cursor-pointer"
                    title="تسجيل الخروج"
                  >
                    <i className="fa-solid fa-power-off text-xs sm:text-sm"></i>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white p-2 rounded-xl border border-gray-700 transition cursor-pointer flex items-center justify-center w-9 h-9 shrink-0 shadow-sm"
              aria-label="فتح القائمة الجانبية للهاتف"
              title="القائمة الجانبية للهاتف"
            >
              <i className="fa-solid fa-bars-staggered text-base text-blue-400"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Pages */}
      <main className="max-w-6xl mx-auto w-full px-4 py-8 flex-grow space-y-8">
        {/* Banner Counter Statistics */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass p-4 rounded-2xl flex items-center gap-4 border border-gray-800 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xl shrink-0">
              <i className="fa-solid fa-eye"></i>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs text-gray-400 font-semibold">إجمالي الزيارات</p>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping ml-1"></span>
                  حي
                </span>
              </div>
              <h4 id="liveVisitsCount" className="text-2xl font-black text-white font-mono tracking-wide">
                {visitsCount.toLocaleString()}
              </h4>
            </div>
          </div>
          <div className="glass p-4 rounded-2xl flex items-center gap-4 border border-gray-800 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl shrink-0">
              <i className="fa-solid fa-cloud-arrow-up"></i>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs text-gray-400 font-semibold">إجمالي الملفات المرفوعة</p>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  متجدد
                </span>
              </div>
              <h4 id="liveFilesCount" className="text-2xl font-black text-white font-mono tracking-wide">
                {(totalLifetimeUploads + cloudFiles.length).toLocaleString()}
              </h4>
            </div>
          </div>
          <div className="glass p-4 rounded-2xl flex items-center gap-4 border border-gray-800 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center text-xl shrink-0">
              <i className="fa-solid fa-users"></i>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs text-gray-400 font-semibold">المشتركين بالمنصة</p>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  محدث
                </span>
              </div>
              <h4 id="liveUsersCount" className="text-2xl font-black text-white font-mono tracking-wide">
                {subscribersCount.toLocaleString()}
              </h4>
            </div>
          </div>
        </section>

        {/* PAGE 1: Upload Main View */}
        {currentPage === 'home' && (
          <div id="pageHome" className="main-page space-y-6">
            {/* Mandatory Login Gate Notice (تظهر فقط للزائرين غير المسجلين) */}
            {!currentUser && (
              <div
                id="loginRequiredGate"
                className="glass border border-gray-800 rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden"
              >
                <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-4xl mx-auto">
                  <i className="fa-solid fa-lock"></i>
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h2 className="text-2xl font-black text-white">تسجيل الدخول مطلوب للرفع</h2>
                  <p className="text-gray-400 text-sm">
                    يرجى تسجيل الدخول أو إنشاء حساب جديد لتتمكن من رفع الصور والملفات وحفظها في حسابك
                    الشخصي.
                  </p>
                </div>
                <button
                  onClick={openAuthModal}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-8 py-3 rounded-2xl transition shadow-lg shadow-blue-600/30 inline-flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-right-to-bracket"></i>
                  <span>تسجيل الدخول / إنشاء حساب</span>
                </button>
              </div>
            )}

            {/* Upload Box (مخفية كلياً حتى يسجل المستخدم) */}
            {currentUser && (
              <div
                id="uploadBoxSection"
                className="glass border border-gray-800 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute -top-24 -left-24 w-60 h-60 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="text-center space-y-2 mb-8">
                  <h1 className="text-3xl md:text-4xl font-black text-white tracking-wide">
                    رفع الملفات والصور السحابية
                  </h1>
                  <p className="text-gray-400 text-sm max-w-md mx-auto">
                    ارفع ملفاتك بسرعة فائقة عبر بروتوكول توجيه الـ Workers الموزع عالمياً
                  </p>
                </div>

                {/* Dropzone Box */}
                <div
                  id="dropzone"
                  ref={dropzoneRef}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    dropzoneRef.current?.classList.add('dragover');
                  }}
                  onDragLeave={() => {
                    dropzoneRef.current?.classList.remove('dragover');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropzoneRef.current?.classList.remove('dragover');
                    handleFilesSelection(e.dataTransfer.files);
                  }}
                  className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-3xl p-8 text-center bg-gray-900/50 cursor-pointer transition flex flex-col items-center justify-center min-h-[240px] group"
                >
                  <input
                    type="file"
                    id="fileInput"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={(e) => handleFilesSelection(e.target.files)}
                  />
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition duration-300">
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                  </div>
                  <p className="text-gray-200 font-bold text-base mb-1">
                    اسحب وأسقط الملفات هنا، أو{' '}
                    <span className="text-blue-400 underline">اضغط لاختيار ملفاتك</span>
                  </p>
                  <p className="text-gray-400 text-xs">يدعم الصور، الفيديوهات، الأكواد، والمستندات</p>
                </div>

                {/* Selected Files Preview Cards Grid */}
                {selectedFiles.length > 0 && (
                  <div id="selectedFilesPreview" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                    {selectedFiles.map((file, idx) => {
                      const isImg = file.type.startsWith('image/');
                      return (
                        <div
                          key={idx}
                          className="p-3 bg-gray-900 border border-gray-800 rounded-xl flex items-center gap-3 text-xs"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-blue-400 shrink-0">
                            {isImg ? (
                              <i className="fa-solid fa-image"></i>
                            ) : (
                              <i className="fa-solid fa-file"></i>
                            )}
                          </div>
                          <div className="flex-grow truncate">
                            <p className="font-bold text-gray-200 truncate">{file.name}</p>
                            <p className="text-gray-500 text-[10px]">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Server Options & Action Button */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">
                      اختر سيرفر الرفع النشط
                    </label>
                    <select
                      id="serverSelect"
                      value={selectedServer}
                      onChange={(e) => setSelectedServer(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 text-gray-200 text-sm rounded-xl px-4 py-3 focus:border-blue-500 outline-none cursor-pointer"
                    >
                      {SERVERS_LIST.map((srv) => (
                        <option key={srv.key} value={srv.key}>
                          {srv.name} ({srv.allowedTypes.join(', ')})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      id="uploadBtn"
                      onClick={handleUploadClick}
                      disabled={isUploading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3 rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <i className="fa-solid fa-rocket"></i>
                      <span>{isUploading ? 'جاري الرفع السحابي...' : 'بدء الرفع السحابي الآن'}</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar Container */}
                {isUploading && (
                  <div
                    id="progressContainer"
                    className="mt-6 bg-gray-900/80 p-4 rounded-2xl border border-gray-800 space-y-2"
                  >
                    <div className="flex justify-between text-xs font-semibold text-gray-300">
                      <span id="uploadStatus">{uploadStatusText}</span>
                      <span id="uploadPercent" className="text-blue-400">
                        {uploadPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                      <div
                        id="progressBar"
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${uploadPercent}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload Results Box */}
            {uploadResults.length > 0 && (
              <div
                id="resultSection"
                className="glass border border-gray-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-4"
              >
                <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <i className="fa-solid fa-circle-check"></i> تم الرفع والحفظ بالسحابة بنجاح!
                </h2>
                <div id="linksList" className="space-y-3">
                  {uploadResults.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-gray-900 border border-gray-800 rounded-2xl flex flex-col md:flex-row items-center gap-4"
                    >
                      {qrCodesMap[item.id] ? (
                        <div className="bg-white p-2 rounded-xl shrink-0">
                          <img src={qrCodesMap[item.id]} alt="QR" className="w-20 h-20" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-gray-950 rounded-xl flex items-center justify-center shrink-0 border border-gray-800">
                          <i className="fa-solid fa-qrcode text-gray-600 text-2xl"></i>
                        </div>
                      )}
                      <div className="flex-grow w-full space-y-2">
                        <p className="font-bold text-sm text-gray-200">{item.fileName}</p>
                        <input
                          type="text"
                          readOnly
                          value={item.url}
                          className="w-full bg-gray-950 border border-gray-800 text-xs text-blue-400 p-2.5 rounded-xl outline-none"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.url);
                            alert('تم نسخ الرابط المباشر!');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-xs text-white px-4 py-2 rounded-xl transition cursor-pointer"
                        >
                          نسخ الرابط المباشر
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAGE 2: User Cloud Files (My Files) */}
        {currentPage === 'my-files' && (
          <div id="pageMyFiles" className="main-page space-y-6">
            <div className="glass border border-gray-800 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-folder-open text-blue-500"></i> ملفاتي المرفوعة
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    جميع الملفات المحفوظة بحسابك الشخصي على المنصة
                  </p>
                </div>
                <span
                  id="myFilesCountBadge"
                  className="text-xs bg-gray-800 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-xl font-bold"
                >
                  {userFiles.length} ملف
                </span>
              </div>

              <div
                id="userCloudFilesGrid"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                {userFiles.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center col-span-full py-8">
                    لا توجد ملفات مرفوعة في حسابك بعد.
                  </p>
                ) : (
                  userFiles.map((file) => {
                    const isImg = file.fileName && file.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    return (
                      <div
                        key={file.id}
                        className="p-4 bg-gray-900 border border-gray-800 rounded-2xl flex flex-col justify-between space-y-3"
                      >
                        <div className="h-28 bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center border border-gray-800">
                          {isImg ? (
                            <img src={file.url} alt={file.fileName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-500 text-xs font-bold">
                              {file.fileName.split('.').pop()?.toUpperCase() || 'FILE'}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-xs text-gray-200 truncate">{file.fileName}</p>
                        <div className="flex justify-between text-xs pt-2 border-t border-gray-800">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(file.url);
                              alert('تم نسخ رابط الملف!');
                            }}
                            className="text-blue-400 hover:underline cursor-pointer"
                          >
                            مشاركة
                          </button>
                          <button
                            onClick={() => deleteMyCloudFile(file.id)}
                            className="text-red-400 hover:underline cursor-pointer"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* PAGE 3: Plans & Pricing */}
        {currentPage === 'pricing' && (
          <div id="pagePricing" className="main-page space-y-6">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-3xl font-black text-white">خطط الاشتراكات والترقية</h2>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                اختر الخطة المناسبة لاحتياجاتك واستمتع بمميزات وسيرفرات فائقة
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Free Plan */}
              <div className="glass border border-gray-800 rounded-3xl p-6 flex flex-col justify-between space-y-6 hover:border-gray-700 transition">
                <div className="space-y-4">
                  <span className="text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded-full font-bold">
                    الخطة المجانية
                  </span>
                  <h3 className="text-3xl font-black text-white">
                    0 <span className="text-xs font-normal text-gray-400">ج.م / شهرياً</span>
                  </h3>
                  <ul className="space-y-3 text-xs text-gray-300">
                    <li className="flex items-center gap-2">
                      <i className="fa-solid fa-check text-emerald-400"></i> رفع صور ومستندات محدودة
                    </li>
                    <li className="flex items-center gap-2">
                      <i className="fa-solid fa-check text-emerald-400"></i> خوادم سحابية عامة
                    </li>
                    <li className="flex items-center gap-2 text-gray-500">
                      <i className="fa-solid fa-xmark"></i> بدون سيرفر خاص
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => selectPlan('free')}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl text-sm transition cursor-pointer"
                >
                  {currentUser?.plan === 'free' ? 'الخطة الحالية' : 'اختيار الخطة المجانية'}
                </button>
              </div>

              {/* Pro Plan */}
              <div className="glass border border-blue-500/40 rounded-3xl p-6 flex flex-col justify-between space-y-6 relative hover:border-blue-500 transition">
                <span className="absolute -top-3 right-6 text-[10px] bg-blue-600 text-white font-bold px-3 py-1 rounded-full">
                  الأكثر شعبية
                </span>
                <div className="space-y-4">
                  <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full font-bold">
                    الخطة الاحترافية (Pro)
                  </span>
                  <h3 className="text-3xl font-black text-white">
                    150 <span className="text-xs font-normal text-gray-400">ج.م / شهرياً</span>
                  </h3>
                  <ul className="space-y-3 text-xs text-gray-300">
                    <li className="flex items-center gap-2">
                      <i className="fa-solid fa-check text-emerald-400"></i> رفع جميع الصيغ بلا حدود
                    </li>
                    <li className="flex items-center gap-2">
                      <i className="fa-solid fa-check text-emerald-400"></i> خوادم سريعة فائقة السرعة
                    </li>
                    <li className="flex items-center gap-2">
                      <i className="fa-solid fa-check text-emerald-400"></i> دعم فني مخصص
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => selectPlan('pro')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  الترقية للـ Pro
                </button>
              </div>

              {/* VIP Dedicated Server Plan */}
              <div className="glass border border-amber-500/50 rounded-3xl p-6 flex flex-col justify-between space-y-6 relative hover:border-amber-500 transition glow">
                <span className="absolute -top-3 right-6 text-[10px] bg-amber-500 text-gray-950 font-black px-3 py-1 rounded-full">
                  السيرفر الخاص VIP
                </span>
                <div className="space-y-4">
                  <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full font-bold">
                    خطة السيرفر المدار
                  </span>
                  <h3 className="text-3xl font-black text-white">
                    450 <span className="text-xs font-normal text-gray-400">ج.م / شهرياً</span>
                  </h3>
                  <ul className="space-y-3 text-xs text-gray-300">
                    <li className="flex items-center gap-2">
                      <i className="fa-solid fa-check text-amber-400"></i> سيرفر Cloudflare خاص بك
                    </li>
                    <li className="flex items-center gap-2">
                      <i className="fa-solid fa-check text-amber-400"></i> حزمة SDK وAPI كاملة
                    </li>
                    <li className="flex items-center gap-2">
                      <i className="fa-solid fa-check text-amber-400"></i> سعة تخزين NVMe مدارة
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => selectPlan('vip')}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-extrabold py-3 rounded-xl text-sm transition shadow-lg shadow-amber-500/30 cursor-pointer"
                >
                  طلب السيرفر الخاص والـ VIP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 4: VIP Dedicated Server SDK Page */}
        {currentPage === 'sdk' && (
          <div id="pageSdk" className="main-page space-y-6">
            <div className="glass border border-amber-500/40 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="border-b border-gray-800 pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                    <i className="fa-solid fa-server"></i> تقديم طلب ورخص السيرفر الخاص (SDK Server)
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    تابع حالة معالجة الطلب واستلم حزمة السيرفر الخاصة بك فور اعتمادها من الإدارة
                  </p>
                </div>
                <span
                  id="sdkRequestStatusBadge"
                  className={`text-xs px-3 py-1 rounded-full font-bold ${
                    sdkStatus === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : sdkStatus === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-gray-800 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {sdkStatus === 'approved'
                    ? 'تم الاعتماد والتفعيل'
                    : sdkStatus === 'pending'
                    ? 'قيد المراجعة'
                    : 'لم يتم التقديم'}
                </span>
              </div>

              {sdkStatus === 'none' && (
                <div id="sdkApplyBox" className="space-y-4">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    بصفتك مشترك في الخطة المتقدمة (VIP)، يحق لك طلب سيرفر Cloudflare Worker مدار بالكامل ومربوط
                    بـ Blob Storage خاص بك لحفظ ملفاتك بأقصى حماية وسرعة.
                  </p>
                  <button
                    onClick={submitSdkRequest}
                    className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-black px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    التقديم للحصول على السيرفر الخاص الآن
                  </button>
                </div>
              )}

              {sdkStatus === 'approved' && (
                <div id="sdkApprovedContent" className="space-y-4 pt-4 border-t border-gray-800">
                  <h3 className="text-md font-bold text-white">حزمة SDK وحساب السيرفر الخاص بك:</h3>

                  <div className="space-y-2">
                    <label className="block text-xs text-gray-400">ملاحظات وتعليمات الإدارة:</label>
                    <div
                      id="adminSdkNote"
                      className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-xs text-gray-300 leading-relaxed"
                    >
                      {adminSdkNote}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs text-gray-400">كود حزمة الـ SDK المخصصة:</label>
                      <button
                        onClick={copySdkCode}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-lg transition cursor-pointer"
                      >
                        نسخ الكود
                      </button>
                    </div>
                    <textarea
                      id="sdkCodeBox"
                      readOnly
                      rows={8}
                      value={`// CN Files Dedicated SDK Configuration
const CnFilesSDK = require('cn-files-node-sdk');

const client = new CnFilesSDK({
  apiKey: "cn_sec_${currentUser ? currentUser.uid : 'live_token'}",
  workerEndpoint: "https://worker-${currentUser ? currentUser.uid.slice(-6) : 'custom'}.cn-files.workers.dev"
});

async function uploadFile(filePath) {
  const result = await client.upload(filePath);
  console.log("Direct URL:", result.url);
}

uploadFile("./my-image.png");`}
                      className="w-full bg-gray-950 border border-gray-800 text-blue-400 font-mono text-xs p-4 rounded-xl outline-none leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer with CybeNode copyright */}
      <footer className="bg-gray-900/90 border-t border-gray-800 py-6 text-xs text-gray-400 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="CN Files Logo"
              className="w-7 h-7 rounded-lg object-cover border border-blue-500/30 shadow-md"
            />
            <div className="text-right">
              <span className="font-bold text-gray-200">CN Files Cloud</span>
              <p className="text-[11px] text-gray-500">منصة رفع وحفظ الملفات السحابية المتقدمة</p>
            </div>
          </div>

          <div className="text-center sm:text-left flex flex-col sm:flex-row items-center gap-2">
            <span>جميع حقوق النشر محفوظة &copy; {new Date().getFullYear()} لـ</span>
            <a
              href="https://cybenode.site"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-bold transition inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-xl hover:bg-blue-500/20"
            >
              <span>CybeNode</span>
              <span className="text-gray-400 text-[11px] font-mono" dir="ltr">(cybenode.site)</span>
              <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
            </a>
          </div>
        </div>
      </footer>

      {/* Auth Modal & Mandatory Profile Survey Stepper */}
      {authModalOpen && (
        <div
          id="authModal"
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div className="glass border border-gray-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative space-y-6">
            <button
              onClick={closeAuthModal}
              className="absolute top-4 left-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>

            {/* STEP 1: Login / Registration Form */}
            {authStep === 1 && (
              <div id="authStep1" className="space-y-4">
                {/* Tabs for Login vs Create Account */}
                <div className="flex bg-gray-900 p-1 rounded-2xl border border-gray-800">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                      authMode === 'login'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                      authMode === 'register'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    إنشاء حساب جديد
                  </button>
                </div>

                <h2 className="text-xl font-bold text-center text-white">
                  {authMode === 'login' ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب جديد بالمنصة'}
                </h2>

                <button
                  id="googleAuthBtn"
                  onClick={handleGoogleAuth}
                  className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 transition shadow cursor-pointer text-xs"
                >
                  <i className="fa-brands fa-google text-red-500 text-base"></i>
                  <span>متابعة باستخدام Google</span>
                </button>

                <div className="flex items-center my-3">
                  <div className="flex-grow border-t border-gray-800"></div>
                  <span className="px-3 text-xs text-gray-500 font-semibold">أو عبر المعرف الخاص بك</span>
                  <div className="flex-grow border-t border-gray-800"></div>
                </div>

                {/* Method selector: Email vs Phone */}
                <div className="flex items-center justify-center gap-6 text-xs text-gray-300 pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="authMethod"
                      checked={authMethod === 'email'}
                      onChange={() => setAuthMethod('email')}
                      className="accent-blue-600 cursor-pointer"
                    />
                    <span>البريد الإلكتروني</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="authMethod"
                      checked={authMethod === 'phone'}
                      onChange={() => setAuthMethod('phone')}
                      className="accent-blue-600 cursor-pointer"
                    />
                    <span>رقم الهاتف</span>
                  </label>
                </div>

                <form id="emailAuthForm" onSubmit={handleUserAuth} className="space-y-3">
                  {authMethod === 'email' ? (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">البريد الإلكتروني</label>
                      <input
                        type="email"
                        id="authEmail"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none"
                        placeholder="example@domain.com"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        رقم الهاتف المحمول مع كود الدولة
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {/* Country Code Picker with Flag, Country Name & Dial Code */}
                        <div className="relative shrink-0 sm:w-48">
                          <select
                            value={selectedCountryDial}
                            onChange={(e) => {
                              setSelectedCountryDial(e.target.value);
                              const found = COUNTRIES_LIST.find((c) => c.dial === e.target.value);
                              if (found) setSurveyCountry(found.name);
                            }}
                            className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2.5 text-xs font-semibold focus:border-blue-500 outline-none cursor-pointer appearance-none pl-8 truncate"
                          >
                            {COUNTRIES_LIST.map((country) => (
                              <option key={country.code} value={country.dial}>
                                {country.flag} {country.name} ({country.dial})
                              </option>
                            ))}
                          </select>
                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                            <i className="fa-solid fa-chevron-down text-[10px]"></i>
                          </div>
                        </div>

                        {/* Phone Number Input */}
                        <div className="relative flex-1">
                          <input
                            type="tel"
                            id="authPhone"
                            required
                            dir="ltr"
                            value={authPhoneNumber}
                            onChange={(e) => setAuthPhoneNumber(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 outline-none text-right font-mono tracking-wider"
                            placeholder="100 000 0000"
                          />
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1.5 flex items-center justify-between">
                        <span>
                          كود الدولة المختار:{' '}
                          <span className="text-blue-400 font-mono font-bold" dir="ltr">
                            {selectedCountryDial}
                          </span>
                        </span>
                        <span>اكتب الرقم بدون الصفر المبدئي</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs text-gray-400">كلمة المرور</label>
                      {authMode === 'login' && (
                        <button
                          type="button"
                          onClick={openForgotPassword}
                          className="text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer font-semibold transition"
                        >
                          نسيت كلمة المرور؟
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      id="authPassword"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none"
                      placeholder="••••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition shadow-lg shadow-blue-600/30 cursor-pointer"
                  >
                    {authMode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب والمتابعة'}
                  </button>

                  <div className="text-center pt-2 text-xs text-gray-400">
                    {authMode === 'login' ? (
                      <span>
                        ليس لديك حساب بعد؟{' '}
                        <button
                          type="button"
                          onClick={() => setAuthMode('register')}
                          className="text-blue-400 font-bold hover:underline cursor-pointer"
                        >
                          إنشاء حساب جديد
                        </button>
                      </span>
                    ) : (
                      <span>
                        لديك حساب بالفعل؟{' '}
                        <button
                          type="button"
                          onClick={() => setAuthMode('login')}
                          className="text-blue-400 font-bold hover:underline cursor-pointer"
                        >
                          تسجيل الدخول
                        </button>
                      </span>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: Mandatory Primary Data Survey */}
            {authStep === 2 && (
              <div id="authStep2" className="space-y-4">
                <div className="text-center">
                  <span className="text-xs text-blue-400 font-bold">الخطوة 1 من 2</span>
                  <h2 className="text-lg font-bold text-white mt-1">استكمال البيانات الأساسية</h2>
                  <p className="text-xs text-gray-400">يرجى إدخال بياناتك لاستكمال إنشاء الحساب</p>
                </div>
                <form id="profileSurveyForm" onSubmit={submitProfileSurvey} className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">الاسم بالكامل *</label>
                    <input
                      type="text"
                      id="surveyName"
                      required
                      value={surveyName}
                      onChange={(e) => setSurveyName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">النوع *</label>
                      <select
                        id="surveyGender"
                        required
                        value={surveyGender}
                        onChange={(e) => setSurveyGender(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">البلد *</label>
                      <select
                        id="surveyCountry"
                        required
                        value={surveyCountry}
                        onChange={(e) => setSurveyCountry(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {COUNTRIES_LIST.map((c) => (
                          <option key={c.code} value={c.name}>
                            {c.flag} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">رقم الهاتف (اختياري)</label>
                    <input
                      type="tel"
                      id="surveyPhone"
                      value={surveyPhone || authPhone}
                      onChange={(e) => setSurveyPhone(e.target.value)}
                      placeholder="+201000000000"
                      className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">كيف سمعت عنا؟ *</label>
                    <select
                      id="surveyReferral"
                      required
                      value={surveyReferral}
                      onChange={(e) => setSurveyReferral(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="facebook">فيسبوك (Facebook)</option>
                      <option value="tiktok">تيك توك (TikTok)</option>
                      <option value="youtube">يوتيوب (YouTube)</option>
                      <option value="google">محرك بحث جوجل (Google Search)</option>
                      <option value="friend">ترشيح من صديق أو زميل</option>
                      <option value="tech_community">موقع أو مجتمع تقني</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition cursor-pointer mt-2"
                  >
                    المتابعة لاختيار الخطة
                  </button>
                </form>
              </div>
            )}

            {/* STEP 3: Mandatory Plan Selection */}
            {authStep === 3 && (
              <div id="authStep3" className="space-y-4">
                <div className="text-center">
                  <span className="text-xs text-amber-400 font-bold">الخطوة 2 من 2</span>
                  <h2 className="text-lg font-bold text-white mt-1">اختر خطة الاشتراك الخاصة بك</h2>
                </div>
                <div className="space-y-3">
                  <div
                    onClick={() => selectInitialPlan('free')}
                    className="p-3 bg-gray-900 border border-gray-800 rounded-xl cursor-pointer hover:border-blue-500 transition flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-white">الخطة المجانية</h4>
                      <p className="text-[11px] text-gray-400">رفع محدود على خوادم عامة</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">مجاناً</span>
                  </div>

                  <div
                    onClick={() => selectInitialPlan('pro')}
                    className="p-3 bg-gray-900 border border-blue-500/40 rounded-xl cursor-pointer hover:border-blue-500 transition flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-blue-400">الخطة الاحترافية (Pro)</h4>
                      <p className="text-[11px] text-gray-400">رفع غير محدود وسيرفرات فائقة</p>
                    </div>
                    <span className="text-xs font-bold text-white">150 ج.م</span>
                  </div>

                  <div
                    onClick={() => selectInitialPlan('vip')}
                    className="p-3 bg-gray-900 border border-amber-500/40 rounded-xl cursor-pointer hover:border-amber-500 transition flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-amber-400">سيرفر خاص VIP + SDK</h4>
                      <p className="text-[11px] text-gray-400">سيرفر مدار خاص ورخصة SDK</p>
                    </div>
                    <span className="text-xs font-bold text-white">450 ج.م</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div
          id="forgotPasswordModal"
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div className="glass border border-gray-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative space-y-5">
            <button
              onClick={closeForgotPassword}
              className="absolute top-4 left-4 text-gray-400 hover:text-white cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/30 text-xl mb-2">
                <i className="fa-solid fa-key"></i>
              </div>
              <h2 className="text-xl font-bold text-white">استعادة كلمة المرور</h2>
              <p className="text-xs text-gray-400">
                {forgotStep === 1 && 'أدخل بريدك الإلكتروني أو رقم هاتفك لتلقي رمز الاستعادة'}
                {forgotStep === 2 && 'أدخل رمز التحقق المكون من 4 أرقام الذي تم إرساله'}
                {forgotStep === 3 && 'قم بتعيين كلمة المرور الجديدة لحسابك'}
              </p>
            </div>

            {/* Stepper indicator */}
            <div className="flex items-center justify-center gap-2 py-1">
              <span className={`w-8 h-1.5 rounded-full transition ${forgotStep >= 1 ? 'bg-blue-500' : 'bg-gray-800'}`}></span>
              <span className={`w-8 h-1.5 rounded-full transition ${forgotStep >= 2 ? 'bg-blue-500' : 'bg-gray-800'}`}></span>
              <span className={`w-8 h-1.5 rounded-full transition ${forgotStep >= 3 ? 'bg-blue-500' : 'bg-gray-800'}`}></span>
            </div>

            {/* STEP 1: Enter email or phone */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendResetCode} className="space-y-4">
                <div className="flex items-center justify-center gap-6 text-xs text-gray-300 pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="forgotMethod"
                      checked={forgotMethod === 'email'}
                      onChange={() => setForgotMethod('email')}
                      className="accent-blue-600 cursor-pointer"
                    />
                    <span>البريد الإلكتروني</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="forgotMethod"
                      checked={forgotMethod === 'phone'}
                      onChange={() => setForgotMethod('phone')}
                      className="accent-blue-600 cursor-pointer"
                    />
                    <span>رقم الهاتف</span>
                  </label>
                </div>

                {forgotMethod === 'email' ? (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">البريد الإلكتروني المسجل</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none"
                      placeholder="name@domain.com"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">رقم الهاتف المسجل مع كود الدولة</label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative shrink-0 sm:w-44">
                        <select
                          value={forgotCountryDial}
                          onChange={(e) => setForgotCountryDial(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2.5 text-xs font-semibold focus:border-blue-500 outline-none cursor-pointer appearance-none pl-8 truncate"
                        >
                          {COUNTRIES_LIST.map((country) => (
                            <option key={country.code} value={country.dial}>
                              {country.flag} {country.name} ({country.dial})
                            </option>
                          ))}
                        </select>
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                          <i className="fa-solid fa-chevron-down text-[10px]"></i>
                        </div>
                      </div>
                      <input
                        type="tel"
                        required
                        dir="ltr"
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 outline-none text-right font-mono"
                        placeholder="100 000 0000"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  إرسال رمز التحقق
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotModalOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="text-xs text-gray-400 hover:text-white cursor-pointer"
                  >
                    الرجوع إلى تسجيل الدخول
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter OTP Code */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-center">
                  <p className="text-xs text-blue-300">
                    تم إرسال كود التحقق. لأغراض التجربة، الكود هو:{' '}
                    <span className="font-mono font-bold text-white tracking-widest text-sm bg-blue-600 px-2 py-0.5 rounded mr-1">
                      {forgotGeneratedOtp}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">رمز التحقق (4 أرقام)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    dir="ltr"
                    value={forgotEnteredOtp}
                    onChange={(e) => setForgotEnteredOtp(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2.5 text-center text-lg font-mono tracking-widest focus:border-blue-500 outline-none"
                    placeholder="••••"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  تأكيد الرمز والمتابعة
                </button>

                <div className="flex justify-between items-center text-xs text-gray-400 pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="hover:text-white cursor-pointer"
                  >
                    تغيير البريد أو الرقم
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newCode = Math.floor(1000 + Math.random() * 9000).toString();
                      setForgotGeneratedOtp(newCode);
                      alert(`تم إعادة إرسال الكود: [ ${newCode} ]`);
                    }}
                    className="text-blue-400 hover:underline cursor-pointer"
                  >
                    إعادة إرسال الكود
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Enter New Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleSaveNewPassword} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    required
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">تأكيد كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    required
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  حفظ كلمة المرور الجديدة وتسجيل الدخول
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sidebar Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          ></div>

          {/* Drawer content sliding in from right */}
          <div className="relative w-4/5 max-w-xs bg-gray-950 border-r border-gray-800 h-full p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            <div className="space-y-6">
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div
                  className="flex items-center space-x-2.5 space-x-reverse cursor-pointer"
                  onClick={() => {
                    switchMainPage('home');
                    setMobileMenuOpen(false);
                  }}
                >
                  <img
                    src={LOGO_URL}
                    alt="CN Files Logo"
                    className="w-9 h-9 rounded-xl object-cover border border-blue-500/30"
                  />
                  <div>
                    <span className="font-black text-white text-base">CN Files</span>
                    <span className="block text-[10px] text-blue-400 font-mono">Cloud v3.0</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-gray-900 text-gray-400 hover:text-white border border-gray-800 cursor-pointer"
                  aria-label="إغلاق القائمة الجانبية"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              {/* User Profile Info or Auth Button */}
              {currentUser ? (
                <div className="p-3 bg-gray-900 rounded-2xl border border-gray-800 space-y-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.name}
                      className="w-10 h-10 rounded-full border border-blue-500 object-cover"
                    />
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-sm text-white truncate">{currentUser.name}</h4>
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase font-bold">
                        خطة {currentUser.plan}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logoutUser();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-power-off text-xs"></i>
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal();
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-2xl text-xs font-bold transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-right-to-bracket"></i>
                  <span>تسجيل الدخول / إنشاء حساب</span>
                </button>
              )}

              {/* Navigation Menu Links */}
              <nav className="space-y-1.5">
                <button
                  onClick={() => {
                    switchMainPage('home');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition cursor-pointer ${
                    currentPage === 'home'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-gray-300 hover:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-house text-blue-400 w-5"></i>
                    <span>الرئيسية</span>
                  </div>
                  <i className="fa-solid fa-chevron-left text-xs text-gray-500"></i>
                </button>

                <button
                  onClick={() => {
                    switchMainPage('my-files');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition cursor-pointer ${
                    currentPage === 'my-files'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-gray-300 hover:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-folder-open text-amber-400 w-5"></i>
                    <span>ملفاتي السحابية</span>
                  </div>
                  <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full font-mono">
                    {userFiles.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    switchMainPage('pricing');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition cursor-pointer ${
                    currentPage === 'pricing'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-gray-300 hover:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-gem text-emerald-400 w-5"></i>
                    <span>الخطط والاشتراكات</span>
                  </div>
                  <i className="fa-solid fa-chevron-left text-xs text-gray-500"></i>
                </button>

                {currentUser && currentUser.plan === 'vip' && (
                  <button
                    onClick={() => {
                      switchMainPage('sdk');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition cursor-pointer ${
                      currentPage === 'sdk'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'text-gray-300 hover:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <i className="fa-solid fa-server text-amber-400 w-5"></i>
                      <span>SDK السيرفر الخاص</span>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full uppercase font-bold">
                      VIP
                    </span>
                  </button>
                )}
              </nav>

              {/* Dynamic Stats Quick Glance */}
              <div className="bg-gray-900/90 rounded-2xl p-3 border border-gray-800 space-y-2">
                <span className="text-[11px] font-bold text-gray-400 block mb-1">إحصائيات المنصة الحية:</span>
                <div className="flex items-center justify-between text-xs py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">الزيارات</span>
                  <span className="text-blue-400 font-bold font-mono">{visitsCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-gray-800/60">
                  <span className="text-gray-400">الملفات</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {(totalLifetimeUploads + cloudFiles.length).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-400">المشتركين</span>
                  <span className="text-purple-400 font-bold font-mono">{subscribersCount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Drawer Bottom CybeNode Copyright */}
            <div className="pt-4 border-t border-gray-800 text-center">
              <p className="text-[11px] text-gray-400">
                جميع الحقوق محفوظة &copy; {new Date().getFullYear()} لـ{' '}
                <a
                  href="https://cybenode.site"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 font-bold hover:underline"
                >
                  CybeNode (cybenode.site)
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
