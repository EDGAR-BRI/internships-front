# Plan: fusionar "Horas completas (días reales)" con el modo estándar de exportación

**Objetivo:** Eliminar la opción extra "Horas completas (días reales)" de la modal de exportación. El modo estándar incorpora automáticamente sus funcionalidades (horas por día y totales acumulados reales) **solo cuando existe algún día con más de 8h**. La modal queda con 2 opciones: estándar y "Días de 8h + acumulado (45 días)".

**Contexto:** La modal solo se abre cuando hay días con >8h (`showExtraExportOptions`). Sin >8h se exporta directo (flujo actual). Las diferencias actuales entre "estándar" y "días reales" son:
- Estándar: todos los registros, sin horas por día, sin totales.
- Días reales: solo días con `hours > 0`, muestra `(6h)`/`(10h)` junto a la fecha cuando difieren de 8h, y escribe total acumulado real `X días / Yh` por hoja.

---

## 1. `src/utils/exportAttendanceDocx.ts`

- [ ] Cambiar el tipo `AttendanceExportMode` de `'standard' | 'complete' | 'days8'` a `'standard' | 'days8'`.
- [ ] En `generateAttendanceDocx`, reemplazar el cálculo de `weeks`:
  ```ts
  const weeks =
    mode === 'days8'
      ? buildDays8Weeks(data.attendances, data.settings)
      : buildStandardWeeks(data.attendances, data.settings)
  ```
  (desaparece el filtro `hours > 0` del modo `complete`).
- [ ] Añadir flag: `const showRealData = mode !== 'days8' && data.attendances.some((a) => a.hours > 8)`.
- [ ] En `sheetOpts`, usar `showDayHours: showRealData`.
- [ ] En el loop de hojas, cambiar los totales por hoja:
  - `days8`: `[min(days, 45) días, days*8h]` (sin cambios).
  - `showRealData`: `[N días, Mh]` acumulado real, donde `N` cuenta solo días con `hours > 0` y `M` suma las horas de esos días (no inflar con registros de 0h).
  - Sin `showRealData` y sin `days8`: `totalLines = null` (cuadro simple, como hoy).
- [ ] Verificar que no queden referencias a `'complete'` en el archivo (`grep -n "complete" src/utils/exportAttendanceDocx.ts`).

## 2. `src/components/AttendanceExportModal.vue`

- [ ] Quitar la prop `showExtraOptions` del `defineProps`.
- [ ] Eliminar el botón "Horas completas (días reales)" (`@click="pick('complete')"`) y su bloque `v-if="showExtraOptions"`.
- [ ] Quitar el `v-if="showExtraOptions"` del botón "Días de 8h + acumulado (45 días)" (la modal solo se abre con >8h, siempre se muestra).
- [ ] Actualizar la descripción de la opción estándar, p.ej.:
  > "Formato semanal con la jornada configurada. Cuando hay días con horas reales (p.ej. 10h) muestra las horas por día y el total acumulado de días y horas."
- [ ] Eliminar el `<p v-if="!showExtraOptions">` ("Las opciones de doble jornada aparecen cuando algún día supera las 8 horas.").

## 3. `src/components/AttendanceSection.vue`

- [ ] Quitar `:show-extra-options="showExtraExportOptions"` del `<AttendanceExportModal>`.
- [ ] `handleExport` se mantiene igual: sin días >8h exporta directo (`doExport('standard')`); con >8h abre la modal.

## 4. Verificación

- [ ] `pnpm typecheck` → 0 errores.
- [ ] Repro headless (usuario `ai-pro@example.com` / `password123`, sin asistencias):
  - Clic en "Exportar asistencia" → descarga directa `control-asistencia.docx`, **sin** modal, 0 excepciones.
- [ ] Repro headless con usuario que tenga días >8h (ej. `test-comunidad@example.com`, tiene un día de 10h):
  - Clic en "Exportar asistencia" → modal con exactamente 2 opciones (estándar y 45 días).
  - Elegir estándar → descargar el docx, descomprimir (`unzip -p control-asistencia.docx word/document.xml`) y confirmar:
    - La fecha del día de 10h muestra `(10h)`.
    - La celda de totales contiene `X días / Yh` acumulado real.
  - Elegir "Días de 8h + acumulado (45 días)" → sin cambios vs. comportamiento actual.
- [ ] Sin >8h: el docx estándar NO debe tener horas por día ni totales (comportamiento previo intacto).

## Notas

- No tocar `buildDays8Weeks` ni el modo `days8`.
- No cambiar el flujo de "sin >8h → exportar directo" (ya implementado en `AttendanceSection.handleExport`).
- Textos de la modal en español, coherentes con el resto de la app.