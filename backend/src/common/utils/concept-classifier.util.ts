export function isAlcabalaConcept(code?: string, name?: string): boolean {
  const c = (code || '').toUpperCase();
  const n = (name || '').toUpperCase();
  return (
    c === 'ALCABALA' ||
    c.startsWith('ALCABALA') ||
    c.includes('MANTENIMIENTO') ||
    c.includes('CUOTA_SOCIAL') ||
    n.includes('ALCABALA') ||
    n.includes('MANTENIMIENTO') ||
    n.includes('CUOTA SOCIAL')
  );
}

export function isWaterConcept(code?: string, name?: string): boolean {
  const c = (code || '').toUpperCase();
  const n = (name || '').toUpperCase();
  return (
    c === 'AGUA' ||
    c.includes('AGUA') ||
    n.includes('AGUA') ||
    n.includes('POTABLE')
  );
}

export function isAssemblyConcept(code?: string, name?: string): boolean {
  const c = (code || '').toUpperCase();
  const n = (name || '').toUpperCase();
  return (
    c.includes('ASAMBLEA') ||
    c.includes('MULTA') ||
    c.includes('REUNION') ||
    n.includes('ASAMBLEA') ||
    n.includes('MULTA') ||
    n.includes('REUNIÓN')
  );
}

export function isSanitaryConcept(code?: string, name?: string): boolean {
  const c = (code || '').toUpperCase();
  const n = (name || '').toUpperCase();
  return (
    c.includes('SSHH') ||
    c.includes('HIGIEN') ||
    c.includes('MICCIONARIO') ||
    c.includes('RETRETE') ||
    n.includes('HIGIÉNICO') ||
    n.includes('HIGIENICO') ||
    n.includes('BAÑO') ||
    n.includes('SSHH') ||
    n.includes('MICCIONARIO') ||
    n.includes('RETRETE')
  );
}
