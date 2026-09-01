type ClerkErrorLike = {
  code?: unknown;
  message?: unknown;
  longMessage?: unknown;
  errors?: unknown;
};

function errorDetails(error: unknown): ClerkErrorLike[] {
  if (!error || typeof error !== 'object') return [];
  const value = error as ClerkErrorLike;
  const nested = Array.isArray(value.errors)
    ? value.errors.filter((item): item is ClerkErrorLike => Boolean(item && typeof item === 'object'))
    : [];
  return [value, ...nested];
}

function includesCode(codes: string[], ...needles: string[]) {
  return needles.some((needle) => codes.some((code) => code.includes(needle)));
}

export function authErrorCodes(error: unknown) {
  return errorDetails(error)
    .map((detail) => (typeof detail.code === 'string' ? detail.code.toLowerCase() : ''))
    .filter(Boolean);
}

function safeClerkLongMessage(details: ClerkErrorLike[]) {
  const candidate = details
    .map((detail) => detail.longMessage)
    .find((value): value is string => typeof value === 'string');
  if (!candidate) return null;

  const message = candidate.trim().replace(/\s+/g, ' ');
  return message.length > 0 && message.length <= 240 ? message : null;
}

function safePasswordMessage(details: ClerkErrorLike[]) {
  const candidate = details
    .map((detail) => detail.longMessage ?? detail.message)
    .find((value): value is string => typeof value === 'string');
  if (!candidate) return null;

  const message = candidate.trim().replace(/\s+/g, ' ');
  if (
    message.length === 0 ||
    message.length > 240 ||
    !/password/i.test(message) ||
    /internal|provider|request id|stack trace|clerk/i.test(message)
  ) {
    return null;
  }
  return message;
}

export function authErrorMessage(error: unknown, fallback: string) {
  const details = errorDetails(error);
  const codes = authErrorCodes(error);

  if (includesCode(codes, 'identifier_exists')) {
    return 'An account with this email already exists. Switch to sign in instead.';
  }
  if (includesCode(codes, 'password_pwned', 'password_compromised', 'password_breached')) {
    return 'Choose a different password. This one has appeared in a known security breach.';
  }
  if (includesCode(codes, 'password_already_used', 'password_reused', 'password_same_as_current')) {
    return 'Choose a new password that is different from your current or recently used password.';
  }
  if (
    includesCode(codes, 'password_length', 'password_too_short', 'password_minimum_length') ||
    codes.some((code) => code.includes('password') && code.includes('length'))
  ) {
    return 'Choose a longer password that meets the account security requirements.';
  }
  if (
    includesCode(
      codes,
      'password_not_strong_enough',
      'password_weak',
      'password_strength',
      'password_complexity',
      'password_requirements',
    )
  ) {
    return 'Choose a stronger password with a mix of letters, numbers, and symbols.';
  }
  if (includesCode(codes, 'captcha', 'bot')) {
    return 'The security check could not be completed. Refresh the page and try again.';
  }
  if (includesCode(codes, 'too_many', 'rate_limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (includesCode(codes, 'email_address_invalid', 'invalid_email')) {
    return 'Enter a valid email address and try again.';
  }
  if (includesCode(codes, 'phone_number_invalid', 'invalid_phone')) {
    return 'Enter a valid phone number in international format and try again.';
  }
  if (includesCode(codes, 'verification_code_invalid', 'invalid_code', 'incorrect_code')) {
    return 'That verification code is incorrect. Check the code and try again.';
  }
  if (includesCode(codes, 'verification_code_expired', 'code_expired')) {
    return 'That verification code has expired. Request a new code and try again.';
  }
  if (includesCode(codes, 'session_exists')) {
    return 'You are already signed in. Opening your account.';
  }
  if (includesCode(codes, 'session_expired', 'reset_expired', 'password_reset_expired')) {
    return 'This password reset session has expired. Start the reset again and request a new code.';
  }
  if (includesCode(codes, 'form_password_or_identifier_incorrect', 'password_or_identifier_incorrect')) {
    return 'The email or password was not accepted. If you just reset the password, use the new password and make sure this is the same account and environment.';
  }
  if (includesCode(codes, 'form_password_incorrect', 'password_incorrect')) {
    return 'The password was not accepted. If you just reset it, enter the new password and check that the email matches the account.';
  }
  if (includesCode(codes, 'form_identifier_not_found', 'identifier_not_found')) {
    return 'No account was found for this email. Check the address or use the same account and environment where you reset the password.';
  }
  if (codes.some((code) => code.includes('password'))) {
    return safePasswordMessage(details) ?? 'Your new password does not meet the account requirements. Choose a different password and try again.';
  }
  return safeClerkLongMessage(details) ?? fallback;
}

export function emailValidationMessage(email: string) {
  const value = email.trim();
  if (!value) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return 'Enter a valid email address and try again.';
  }
  return null;
}