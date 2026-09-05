export function formatOperationNumber(date: Date, sequence: number): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(5, '0');
  return `MB-${yyyy}${mm}${dd}-${seq}`;
}

export function formatMerchantCode(sequence: number): string {
  return `MB-COM-${String(sequence).padStart(5, '0')}`;
}
