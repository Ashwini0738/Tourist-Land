type ClerkErrorLike = {
  code?: string;
};

export function authErrorMessage(error: unknown, fallback: string) {
  const clerkError = error as ClerkErrorLike | null;
  const code = clerkError?.code?.toLowerCase() ?? '';
  if (code.includes('identifier_exists')) {
    return 'An account with this email already exists. Switch to sign in instead.';
  }
  if (code.includes('password_pwned') || code.includes('password_compromised')) {
    return 'Choose a different password. This one has appeared in a known security breach.';
  }
  if (code.includes('password_length') || (code.includes('password') && code.includes('length'))) {
    return 'Choose a longer password that meets the account security requirements.';
  }
  if (code.includes('captcha') || code.includes('bot')) {
    return 'The security check could not be completed. Refresh the page and try again.';
  }
  if (code.includes('too_many') || code.includes('rate_limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (code.includes('email_address_invalid') || code.includes('invalid_email')) {
    return 'Enter a valid email address and try again.';
  }
  if (code.includes('phone_number_invalid') || code.includes('invalid_phone')) {
    return 'Enter a valid phone number in international format and try again.';
  }
  if (code.includes('verification_code_invalid') || code.includes('invalid_code') || code.includes('incorrect_code')) {
    return 'That verification code is incorrect. Check the code and try again.';
  }
  if (code.includes('verification_code_expired') || code.includes('code_expired')) {
    return 'That verification code has expired. Request a new code and try again.';
  }
  if (code.includes('form_password_incorrect') || code.includes('form_identifier_not_found')) {
    return 'Those sign-in details were not recognized. Check them and try again.';
  }
  return fallback;
}

export function emailValidationMessage(email: string) {
  const value = email.trim();
  if (!value) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return 'Enter a valid email address and try again.';
  }
  return null;
}