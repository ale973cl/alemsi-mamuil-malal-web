'use client';

import { useState } from 'react';

type Modalidad = 'DIA_COMPLETO' | 'HORAS_EXACTAS' | 'CORTE_DIA_ANTERIOR';

type ReglasForm = {
  modalidad_cierre?: Modalidad;
  anticipacion_reserva_horas?: number;
  anticipacion_oficina_horas?: number;
  anticipacion_otros_horas?: number;
  hora_corte_dia_anterior?: number;
  ventana_maxima_dias?: number;
  cancelacion_directa_horas?: number;
  max_dias_consecutivos?: number;
  excepciones_habilitadas?: number;
};

const descripciones: Record<Modalidad, { titulo: string; resumen: string; ejemplo: string }> = {
  DIA_COMPLETO: {
    titulo: 'Cierre a medianoche',
    resumen: 'La fecha se bloquea al comenzar el mismo día del servicio.',
    ejemplo: 'Ejemplo: la reserva del martes se puede realizar hasta el lunes a las 23:59.',
  },
  HORAS_EXACTAS: {
    titulo: 'Horas antes del servicio',
    resumen: 'Cada servicio cierra según la cantidad de horas de anticipación configurada.',
    ejemplo: 'Ejemplo: con 12 horas, una cena de las 20:00 cierra a las 08:00 del mismo día.',
  },
  CORTE_DIA_ANTERIOR: {
    titulo: 'Hora fija del día anterior',
    resumen: 'Al llegar la hora indicada se bloquean todos los servicios del día siguiente.',
    ejemplo: 'Ejemplo: con 15:00, el martes completo cierra el lunes a las 15:00.',
  },
};

export default function ReglasReservaForm({
  reglas,
  action,
}: {
  reglas: ReglasForm;
  action: (formData: FormData) => Promise<void>;
}) {
  const [modalidad, setModalidad] = useState<Modalidad>(reglas.modalidad_cierre ?? 'DIA_COMPLETO');
  const descripcion = descripciones[modalidad];

  return (
    <section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5">
      <h2 className="text-xl font-black">Reglas de reserva</h2>
      <p className="mt-1 text-sm text-[#6B7570]">Elige una modalidad. Solo se mostrarán los campos que utiliza esa modalidad.</p>

      <form action={action} className="mt-5 space-y-5">
        <fieldset>
          <legend className="text-sm font-black text-[#0E2A23]">1. ¿Cuándo deben cerrarse las reservas?</legend>
          <div className="mt-2 grid gap-3 lg:grid-cols-3">
            {(Object.entries(descripciones) as [Modalidad, typeof descripcion][]).map(([value, item]) => {
              const activa = modalidad === value;
              return (
                <label key={value} className={`cursor-pointer rounded-xl border-2 p-4 ${activa ? 'border-[#0E2A23] bg-[#EAF4F1]' : 'border-[#A6B0AA]/35 bg-white'}`}>
                  <span className="flex items-start gap-3">
                    <input type="radio" name="modalidad" value={value} checked={activa} onChange={() => setModalidad(value)} className="mt-1" />
                    <span>
                      <span className="block font-black text-[#0E2A23]">{item.titulo}</span>
                      <span className="mt-1 block text-sm text-[#56635E]">{item.resumen}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="rounded-xl border border-[#1DB954]/40 bg-[#F0FAF6] p-4">
          <p className="text-xs font-black uppercase tracking-wider text-[#087A46]">Modalidad seleccionada</p>
          <p className="mt-1 font-black text-[#0E2A23]">{descripcion.titulo}</p>
          <p className="mt-1 text-sm text-[#40504A]">{descripcion.ejemplo}</p>
        </div>

        <fieldset className="rounded-xl border border-[#A6B0AA]/30 p-4">
          <legend className="px-2 text-sm font-black text-[#0E2A23]">2. Configuración de esta modalidad</legend>

          {modalidad === 'DIA_COMPLETO' ? (
            <p className="text-sm text-[#56635E]">Esta modalidad no necesita una hora adicional: siempre cierra a las 00:00 del día del servicio.</p>
          ) : null}

          {modalidad === 'HORAS_EXACTAS' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-bold">Anticipación ALEMSI Administrativos (horas)
                <input type="number" min="0" name="oficina" defaultValue={reglas.anticipacion_oficina_horas ?? reglas.anticipacion_reserva_horas ?? 24} className="mt-1 w-full rounded-lg border p-2" />
              </label>
              <label className="text-sm font-bold">Anticipación demás comensales (horas)
                <input type="number" min="0" name="otros" defaultValue={reglas.anticipacion_otros_horas ?? reglas.anticipacion_reserva_horas ?? 48} className="mt-1 w-full rounded-lg border p-2" />
              </label>
            </div>
          ) : (
            <>
              <input type="hidden" name="oficina" value={reglas.anticipacion_oficina_horas ?? reglas.anticipacion_reserva_horas ?? 24} />
              <input type="hidden" name="otros" value={reglas.anticipacion_otros_horas ?? reglas.anticipacion_reserva_horas ?? 48} />
            </>
          )}

          {modalidad === 'CORTE_DIA_ANTERIOR' ? (
            <label className="block max-w-sm text-sm font-bold">Hora límite del día anterior
              <select name="hora_corte_dia_anterior" defaultValue={String(reglas.hora_corte_dia_anterior ?? 15)} className="mt-1 w-full rounded-lg border bg-white p-2">
                {Array.from({ length: 24 }, (_, hora) => <option key={hora} value={hora}>{String(hora).padStart(2, '0')}:00</option>)}
              </select>
              <span className="mt-1 block font-normal text-[#56635E]">Esta hora se aplica en horario de Chile.</span>
            </label>
          ) : (
            <input type="hidden" name="hora_corte_dia_anterior" value={reglas.hora_corte_dia_anterior ?? 15} />
          )}
        </fieldset>

        <fieldset className="rounded-xl border border-[#A6B0AA]/30 p-4">
          <legend className="px-2 text-sm font-black text-[#0E2A23]">3. Reglas generales</legend>
          <p className="mb-3 text-sm text-[#56635E]">Estas reglas se aplican sin importar la modalidad de cierre seleccionada.</p>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm font-bold">Ventana máxima futura (días)
              <input type="number" min="1" name="ventana" defaultValue={reglas.ventana_maxima_dias ?? 31} className="mt-1 w-full rounded-lg border p-2" />
            </label>
            <label className="text-sm font-bold">Plazo para cancelar (horas)
              <input type="number" min="0" name="c" defaultValue={reglas.cancelacion_directa_horas ?? 12} className="mt-1 w-full rounded-lg border p-2" />
            </label>
            <label className="text-sm font-bold">Máximo de días corridos por reserva
              <input type="number" min="1" name="m" defaultValue={reglas.max_dias_consecutivos ?? 7} className="mt-1 w-full rounded-lg border p-2" />
            </label>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="e" defaultChecked={Number(reglas.excepciones_habilitadas) === 1} />
            Permitir excepciones autorizadas
          </label>
        </fieldset>

        <button className="w-full rounded-xl bg-[#149F91] px-4 py-3 font-extrabold text-white">Guardar reglas</button>
      </form>
    </section>
  );
}
