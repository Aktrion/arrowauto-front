/**
 * Utility for generating various IDs and codes
 */

export function generateJobNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `JOB-${year}${month}-${random}`;
}

export function generateId(): string {
  return crypto.randomUUID();
}
