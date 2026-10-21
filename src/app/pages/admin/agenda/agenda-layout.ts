export interface IntervaloAgenda {
  inicio: number;
  fin: number;
}

export function fechaAgenda(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

export function parseFechaAgenda(fecha: string): Date {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d, 12);
}

export function semanaAgenda(fecha: string): string[] {
  const lunes = parseFechaAgenda(fecha);
  lunes.setDate(lunes.getDate() - (lunes.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(lunes);
    dia.setDate(dia.getDate() + i);
    return fechaAgenda(dia);
  });
}

export function minutosAgenda(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0;
}

// Separate columns for every connected group of overlapping appointments.
export function distribuirAgenda<T extends IntervaloAgenda>(items: T[]): (T & { columna: number; columnas: number })[] {
  const ordenados = [...items].sort((a, b) => a.inicio - b.inicio || a.fin - b.fin);
  const resultado: (T & { columna: number; columnas: number })[] = [];
  let grupo: (T & { columna: number; columnas: number })[] = [];
  let finales: number[] = [];
  let finGrupo = -1;
  const cerrar = () => {
    grupo.forEach(item => { item.columnas = finales.length; resultado.push(item); });
    grupo = []; finales = []; finGrupo = -1;
  };
  for (const item of ordenados) {
    if (item.inicio >= finGrupo) cerrar();
    let columna = finales.findIndex(fin => fin <= item.inicio);
    if (columna < 0) columna = finales.length;
    finales[columna] = item.fin;
    finGrupo = Math.max(finGrupo, item.fin);
    grupo.push({ ...item, columna, columnas: 1 });
  }
  cerrar();
  return resultado;
}
