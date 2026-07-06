// ABN / ACN checksum validation per Australian Business Register rules.

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
const ACN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 1];

export function cleanDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidAbn(value: string): boolean {
  const digits = cleanDigits(value);
  if (digits.length !== 11) return false;
  const sum = ABN_WEIGHTS.reduce((acc, weight, i) => {
    const digit = Number(digits[i]) - (i === 0 ? 1 : 0);
    return acc + digit * weight;
  }, 0);
  return sum % 89 === 0;
}

export function isValidAcn(value: string): boolean {
  const digits = cleanDigits(value);
  if (digits.length !== 9) return false;
  const sum = ACN_WEIGHTS.reduce((acc, weight, i) => acc + Number(digits[i]) * weight, 0);
  const check = (10 - (sum % 10)) % 10;
  return check === Number(digits[8]);
}

export function formatAbn(value: string): string {
  const d = cleanDigits(value);
  return d.length === 11 ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : value;
}

export function formatAcn(value: string): string {
  const d = cleanDigits(value);
  return d.length === 9 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : value;
}
