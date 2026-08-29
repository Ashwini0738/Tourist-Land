import { isValidEmail } from "./roles.ts";

export type VendorApplicationInput = {
  businessName: string;
  businessType: string;
  contactName: string;
  phone: string;
  email: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
};

export type VendorApplicationField = keyof VendorApplicationInput;
export type VendorApplicationFieldErrors = Partial<Record<VendorApplicationField, string>>;

const FIELD_RULES: Record<VendorApplicationField, { label: string; maxLength: number }> = {
  businessName: { label: "Business name", maxLength: 200 },
  businessType: { label: "Business type", maxLength: 100 },
  contactName: { label: "Contact person", maxLength: 200 },
  phone: { label: "Phone number", maxLength: 40 },
  email: { label: "Email address", maxLength: 320 },
  description: { label: "Business description", maxLength: 4000 },
  address: { label: "Business address", maxLength: 500 },
  city: { label: "City", maxLength: 100 },
  state: { label: "State / region", maxLength: 100 },
  country: { label: "Country", maxLength: 100 },
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateVendorApplicationInput(value: unknown): {
  input: VendorApplicationInput | null;
  fieldErrors: VendorApplicationFieldErrors;
} {
  const fieldErrors: VendorApplicationFieldErrors = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { input: null, fieldErrors: { businessName: "Complete the application fields below." } };
  }

  const body = value as Record<string, unknown>;
  const clean: Partial<Record<VendorApplicationField, string>> = {};
  for (const [key, rule] of Object.entries(FIELD_RULES) as Array<[VendorApplicationField, { label: string; maxLength: number }]>) {
    const raw = body[key];
    if (typeof raw !== "string" || raw.trim().length === 0) {
      fieldErrors[key] = `${rule.label} is required.`;
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed.length > rule.maxLength) {
      fieldErrors[key] = `${rule.label} must be ${rule.maxLength} characters or fewer.`;
      continue;
    }
    clean[key] = trimmed;
  }

  if (!fieldErrors.email && clean.email && !isValidEmail(clean.email)) {
    fieldErrors.email = "Enter a valid email address, such as you@business.com.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { input: null, fieldErrors };
  }
  return { input: { ...clean, email: normalizeEmail(clean.email!) } as VendorApplicationInput, fieldErrors };
}

export function parseVendorApplicationInput(value: unknown): VendorApplicationInput | null {
  return validateVendorApplicationInput(value).input;
}
