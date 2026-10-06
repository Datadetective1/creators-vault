import type { AuthMessages } from "../en/auth";

export const auth: AuthMessages = {
  notConfigured:
    "इस डिप्लॉयमेंट पर अभी अकाउंट चालू नहीं हुए हैं। साइट प्रीव्यू के लिए लाइव है, लेकिन साइन अप डेटाबेस कनेक्शन सेट होने के बाद ही शुरू होगा।",
  working: "हो रहा है…",
  fields: {
    name: "आपका नाम",
    nameOptional: "ज़रूरी नहीं",
    email: "ईमेल",
    emailPlaceholder: "you@example.com",
    password: "पासवर्ड",
    passwordHint: "कम से कम 8 अक्षर।",
    newPassword: "नया पासवर्ड",
    confirmPassword: "नया पासवर्ड दोबारा डालें",
  },
  login: {
    metaTitle: "लॉग इन",
    title: "फिर से स्वागत है",
    subtitle: "अपनी फ़ाइलों तक पहुँचने के लिए लॉग इन करें।",
    submit: "लॉग इन करें",
    forgotPassword: "पासवर्ड भूल गए?",
    newHere: "पहली बार आए हैं?",
    createAccount: "अकाउंट बनाएँ",
  },
  signup: {
    metaTitle: "अपना अकाउंट बनाएँ",
    title: "अपना अकाउंट बनाएँ",
    subtitle: "5 GB निजी स्टोरेज के साथ मुफ़्त में शुरू करें। कार्ड की ज़रूरत नहीं।",
    submit: "मेरा अकाउंट बनाएँ",
    agreement: "अकाउंट बनाकर आप हमारी {terms} और {privacy} से सहमत होते हैं।",
    haveAccount: "पहले से अकाउंट है?",
    login: "लॉग इन करें",
  },
  forgotPassword: {
    metaTitle: "पासवर्ड रीसेट करें",
    title: "पासवर्ड रीसेट करें",
    subtitle: "अपना ईमेल डालें, हम आपको नया पासवर्ड सेट करने का लिंक भेज देंगे।",
    submit: "रीसेट लिंक भेजें",
    backToLogin: "लॉग इन पर वापस जाएँ",
  },
  resetPassword: {
    metaTitle: "नया पासवर्ड चुनें",
    title: "नया पासवर्ड चुनें",
    subtitle: "ऐसा पासवर्ड चुनें जो आपने कहीं और इस्तेमाल न किया हो।",
    submit: "नया पासवर्ड सेव करें",
  },
  errors: {
    notConfigured:
      "अकाउंट अभी उपलब्ध नहीं हैं — यह डिप्लॉयमेंट अभी अपने डेटाबेस से नहीं जुड़ा है। कृपया थोड़ी देर बाद फिर देखें।",
    signUpMissing: "अपना ईमेल और एक पासवर्ड डालें।",
    passwordTooShort: "कम से कम 8 अक्षरों का पासवर्ड रखें।",
    signInMissing: "अपना ईमेल और पासवर्ड डालें।",
    signInFailed: "यह ईमेल और पासवर्ड मेल नहीं खाते।",
    emailMissing: "अपना ईमेल पता डालें।",
    passwordMismatch: "दोनों पासवर्ड एक जैसे नहीं हैं।",
    resetExpired: "इस रीसेट लिंक की समय-सीमा ख़त्म हो गई है। नया लिंक मँगाकर फिर से कोशिश करें।",
    passwordNotSaved: "यह पासवर्ड सेव नहीं हो सका। कोई दूसरा पासवर्ड आज़माएँ।",
  },
  notices: {
    confirmEmail: "अपना अकाउंट सेट अप पूरा करने के लिए अपने ईमेल में आया कन्फ़र्मेशन लिंक देखें।",
    resetSent: "अगर इस पते से कोई अकाउंट है, तो पासवर्ड रीसेट लिंक भेज दिया गया है।",
  },
};
