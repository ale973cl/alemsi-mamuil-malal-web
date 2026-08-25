import 'server-only';
import { query } from '@/lib/db/pool';

export type ConfiguracionBancariaActiva = {
  titular: string;
  rut: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  correoComprobantes: string;
};

function valor(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v !== null && v !== undefined && String(v).trim()) return String(v).trim();
  }
  return '';
}

function activo(row: Record<string, unknown>): boolean {
  const raw = row.activo ?? row.activa ?? row.habilitado ?? row.habilitada;
  if (raw === undefined || raw === null || raw === '') return true;
  if (typeof raw === 'boolean') return raw;
  const text = String(raw).trim().toLowerCase();
  return !['0', 'false', 'no', 'inactivo', 'inactiva', 'deshabilitado', 'deshabilitada'].includes(text);
}

export async function obtenerConfiguracionBancariaActiva(): Promise<ConfiguracionBancariaActiva | null> {
  try {
    const rows = await query<Record<string, unknown>>('SELECT * FROM configuracion_bancaria LIMIT 20');
    const row = rows.find(activo) ?? rows[0];
    if (!row) return null;
    return {
      titular: valor(row, ['titular', 'nombre_titular', 'razon_social']),
      rut: valor(row, ['rut', 'rut_titular']),
      banco: valor(row, ['banco', 'nombre_banco']),
      tipoCuenta: valor(row, ['tipo_cuenta', 'tipocuenta', 'tipoCuenta']),
      numeroCuenta: valor(row, ['numero_cuenta', 'nro_cuenta', 'cuenta', 'numeroCuenta']),
      correoComprobantes: valor(row, ['correo_comprobantes', 'correo_comprobante', 'email_comprobantes']),
    };
  } catch (error) {
    console.error('CONFIG_BANCARIA_READ_ERROR', error instanceof Error ? error.message : 'unknown');
    return null;
  }
}

function normalizar(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('es-CL');
}

function separarCorreos(value: unknown): string[] {
  return String(value ?? '')
    .split(/[;,\s]+/)
    .map((x) => x.trim().toLowerCase())
    .filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
}

export async function obtenerDestinatariosConfigurados(area: string): Promise<string[]> {
  try {
    const rows = await query<Record<string, unknown>>('SELECT * FROM configuracion_correos LIMIT 100');
    const objetivo = normalizar(area);
    const coincidentes = rows.filter((row) => {
      const campos = ['area', 'modulo', 'módulo', 'evento', 'tipo', 'nombre', 'clave', 'categoria'];
      return campos.some((key) => normalizar(row[key]) === objetivo);
    });
    const result = new Set<string>();
    for (const row of coincidentes) {
      for (const key of ['correo', 'correos', 'destinatarios', 'para', 'to', 'email', 'emails']) {
        for (const mail of separarCorreos(row[key])) result.add(mail);
      }
    }
    return [...result];
  } catch (error) {
    console.error('CONFIG_CORREOS_READ_ERROR', error instanceof Error ? error.message : 'unknown');
    return [];
  }
}
