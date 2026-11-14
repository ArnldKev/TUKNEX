export const registrationPasswordMin = 12;
export const registrationPasswordMax = 128;
export const registrationPasswordHelp = `Usa entre ${registrationPasswordMin} y ${registrationPasswordMax} caracteres.`;

export function registrationPasswordIssue(password: string): string | undefined {
  if (!password) return 'Escribe una contraseña.';
  if (password.length < registrationPasswordMin) return `Usa al menos ${registrationPasswordMin} caracteres.`;
  if (password.length > registrationPasswordMax) return `Usa como máximo ${registrationPasswordMax} caracteres.`;
}

export function registrationConfirmationIssue(password: string, confirmation: string): string | undefined {
  if (!confirmation) return 'Confirma tu contraseña.';
  if (confirmation !== password) return 'Las contraseñas no coinciden.';
}
