export function validateEmailInstitucional(email: string): boolean {
  return /^[^@\s]+@unimayor\.edu\.co$/i.test(email);
}