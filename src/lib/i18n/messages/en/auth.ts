/** English auth copy — the base language; defines the shape for hi and bn. */
export const auth = {
  /** Shown on the auth screens while the deployment has no database. */
  notConfigured:
    "Accounts are not switched on for this deployment yet. The site is live for preview, but sign-up opens once the database connection is configured.",
  working: "Working…",
  fields: {
    name: "Your name",
    nameOptional: "Optional",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordHint: "At least 8 characters.",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
  },
  login: {
    metaTitle: "Log in",
    title: "Welcome back",
    subtitle: "Log in to get to your files.",
    submit: "Log in",
    forgotPassword: "Forgot your password?",
    newHere: "New here?",
    createAccount: "Create an account",
  },
  signup: {
    metaTitle: "Create your account",
    title: "Create your account",
    subtitle: "Create your account, then subscribe to Creator for 100 GB of private storage.",
    submit: "Create my account",
    /** {terms} and {privacy} become links to the legal pages. */
    agreement: "By creating an account you agree to our {terms} and {privacy}.",
    haveAccount: "Already have an account?",
    login: "Log in",
  },
  forgotPassword: {
    metaTitle: "Reset your password",
    title: "Reset your password",
    subtitle: "Enter your email and we will send you a link to set a new password.",
    submit: "Send reset link",
    backToLogin: "Back to login",
  },
  resetPassword: {
    metaTitle: "Choose a new password",
    title: "Choose a new password",
    subtitle: "Pick something you have not used elsewhere.",
    submit: "Save new password",
  },
  /** Returned by the server actions in src/app/actions/auth.ts. */
  errors: {
    notConfigured:
      "Accounts are not available yet — this deployment is not connected to its database. Please check back shortly.",
    signUpMissing: "Enter your email and a password.",
    passwordTooShort: "Use a password of at least 8 characters.",
    signInMissing: "Enter your email and password.",
    signInFailed: "That email and password combination did not work.",
    emailMissing: "Enter your email address.",
    passwordMismatch: "Those passwords do not match.",
    resetExpired: "This reset link has expired. Request a new one and try again.",
    passwordNotSaved: "That password could not be saved. Try a different one.",
  },
  notices: {
    confirmEmail: "Check your email for a confirmation link to finish setting up your account.",
    resetSent: "If an account exists for that address, a password reset link is on its way.",
  },
};

export type AuthMessages = typeof auth;
