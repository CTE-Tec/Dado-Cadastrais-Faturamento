export function formatCNPJ(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  return cleanValue
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5')
    .substring(0, 18);
}

export function formatPhone(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length <= 10) {
    return cleanValue
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/^(\((\d{2})\)\s\d{4})(\d)/, '$1-$3')
      .substring(0, 14);
  }
  return cleanValue
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/^(\((\d{2})\)\s\d{5})(\d)/, '$1-$3')
    .substring(0, 15);
}

export function formatCEP(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  return cleanValue
    .replace(/^(\d{5})(\d)/, '$1-$2')
    .substring(0, 9);
}

export function cleanNumeric(value: string): string {
  return value.replace(/\D/g, '');
}
