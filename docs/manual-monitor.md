# Manual Rápido del Monitor — DApp Lab IUCMC

> **Versión:** 1.0 — Julio 2026
> **Propósito:** Guía rápida para monitores del Laboratorio de Física y Sistemas Embebidos.
> **RO-05:** El monitor cambia cada semestre; este manual cubre sus funciones centrales.

---

## ¿Quién es el Monitor?

El Monitor es el rol encargado de:
- ✅ **Aprobar préstamos** después de verificar físicamente el material.
- ✅ **Registrar devoluciones** tras inspeccionar que todo esté completo y en buen estado.
- ✅ **Registrar nuevos activos** en el inventario digital.

**No puede:** auto-aprobarse préstamos a sí mismo ni marcar devoluciones sin verificación física.

---

## 1. Inicio de Sesión

1. Abrir la aplicación web en el navegador (URL provista por el administrador).
2. Ingresar con tu **correo institucional** (ej: `nombre@iucmc.edu.co`).
3. Si es tu primer acceso, el sistema te pedirá completar tus datos maestros:
   - Nombre completo
   - Cédula
   - Código estudiantil
   - Teléfono
   - Programa académico

> ⚠️ Solo los monitores autorizados por el Administrador tendrán acceso a las funciones de aprobación.

---

## 2. Aprobar un Préstamo (RF-09)

### Flujo paso a paso:

1. El estudiante arma su "bolsa" de materiales (escanea QRs + agrega consumibles).
2. El estudiante te muestra el material físicamente.
3. En tu panel de Monitor, verás la solicitud como **"Pendiente de aprobación"**.
4. **Verifica físicamente** que el material coincide con lo que aparece en pantalla.
5. Si todo está bien, presiona el botón **"Aprobar Préstamo"**.
6. El sistema automáticamente:
   - Firma la transacción en blockchain (no necesitas hacer nada extra).
   - Cambia el estado de los activos a "Prestado".
   - Envía un correo de confirmación al estudiante.

> ⚠️ **Importante:** Nunca apruebes sin verificar físicamente el material. Tú eres el control de calidad del laboratorio.

---

## 3. Registrar una Devolución (RF-11)

1. El estudiante trae el material de vuelta.
2. En tu panel, busca el contrato activo del estudiante.
3. **Inspecciona físicamente** cada activo:
   - ¿Está completo?
   - ¿Está en buen estado?
   - ¿Falta algo?
4. Escanea los códigos QR de los activos trazables para confirmar devolución.
5. Si falta algún consumible (LEDs, cables, resistencias), deja **constancia en el campo de observaciones** indicando qué faltó.
6. Si un activo está dañado, márcalo como **"Dañado"** en el inventario.
7. Presiona **"Confirmar Devolución"**.
8. El sistema sella la devolución en blockchain y libera los activos.

> ⚠️ **Regla importante (Regla 6):** Solo puedes cerrar un contrato cuando TODOS los activos trazables fueron escaneados de vuelta. Si falta un consumible, déjalo por escrito en observaciones.

---

## 4. Registrar un Nuevo Activo (RF-16)

1. Ve a la sección **"Inventario > Registrar Activo"**.
2. Llena los campos:
   - **Nombre** (ej: "Arduino Uno R3")
   - **Descripción** (ej: "Microcontrolador ATmega328P, 14 pines digitales")
   - **Categoría** (selecciona del árbol)
   - **Tipo**: Trazable (tiene QR) o Consumible (por stock)
   - **Ícono** (elige uno representativo)
   - **Cantidad inicial** (para consumibles: ej. 50 resistencias)
3. Si es **Trazable**, el sistema genera automáticamente un código QR.
4. **Descarga el QR**, imprímelo y pégalo en el activo físico.
5. Guarda el registro.

> ⚠️ El sistema valida que no haya duplicados (mismo nombre o código serial).

---

## 5. Cambiar Estado de un Activo (RF-07)

1. Busca el activo en el catálogo.
2. Haz click en **"Cambiar Estado"**.
3. Opciones:
   - 🟢 **Disponible** — listo para préstamo
   - 🔵 **Prestado** — actualmente en préstamo (automático)
   - 🔴 **Dañado** — fuera de servicio, requiere reparación
   - 🟠 **En Mantenimiento** — en revisión técnica
4. Confirma el cambio.

---

## 6. Panel del Monitor (Dashboard)

Tu dashboard muestra:
- 📋 **Solicitudes pendientes**: préstamos que esperan tu aprobación.
- 📦 **Préstamos activos**: material que está fuera del lab.
- ⚠️ **Alertas de mora**: estudiantes con material vencido (+8 días).
- 📊 **Estadísticas rápidas**: uso del laboratorio este semestre.

---

## Preguntas Frecuentes

**P: ¿Necesito MetaMask o alguna wallet de criptomonedas?**
R: No. Todo ocurre automáticamente en el servidor. Tú solo haces click en "Aprobar" o "Devolver".

**P: ¿Qué pasa si el QR está dañado y no escanea?**
R: Puedes buscar el activo manualmente en el catálogo digital (RO-02).

**P: ¿Puedo aprobar mi propio préstamo?**
R: No. El sistema bloquea la auto-aprobación. Otro monitor o el administrador debe aprobarlo.

**P: ¿Cómo sé si un estudiante tiene mora?**
R: El panel muestra automáticamente los estudiantes con préstamos vencidos (resaltados en rojo).

---

## Contacto

- **Administrador del sistema:** Dionizio
- **Soporte técnico:** [equipo de desarrollo]
- **Manual completo:** `docs/guia-despliegue.md`
