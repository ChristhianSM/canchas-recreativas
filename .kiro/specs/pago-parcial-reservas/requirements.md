# Documento de Requisitos

## Introducción

El sistema de reservas de canchas deportivas (CanchaGo) actualmente procesa el 100% del pago online al momento de reservar, vía Yape o Plin. El nuevo flujo de **pago parcial** permite que el usuario pague únicamente un adelanto del 20% al reservar online, y abone el 80% restante directamente en la cancha el día del partido.

Este cambio afecta el flujo de reserva, la página de pago, el panel de administración, el panel de admin-cancha y la lógica de cancelaciones con penalidades, el usuario que hace la reserva con el 20% pierde todo lo abonado de la reserva.

---

## Glosario

- **Sistema**: La aplicación web CanchaGo (Next.js + Supabase).
- **Usuario**: Persona que realiza una reserva, puede estar registrada o actuar como invitado.
- **Admin**: Administrador general con acceso al panel `/admin`.
- **Admin_Cancha**: Administrador de cancha con acceso al panel `/admin-cancha`.
- **Reserva**: Registro que vincula un usuario, una cancha, una fecha y una hora.
- **Adelanto**: El 20% del precio total de la reserva, pagado online al momento de reservar.
- **Saldo_Pendiente**: El 80% restante del precio total, pagado presencialmente en la cancha.
- **Pago_Total**: Suma del Adelanto más el Saldo_Pendiente; equivale al precio completo de la hora.
- **Modo_Pago**: Configuración de la reserva que indica si se usa pago completo (100%) o pago parcial (20% adelanto).
- **Comprobante**: Captura de pantalla del pago Yape/Plin subida por el usuario.
- **Penalidad**: Monto retenido al cancelar una reserva confirmada.
- **Devolucion**: En reservas con `modo_pago = 'parcial'`, no hay devolución — el adelanto se pierde en su totalidad al cancelar. En reservas con `modo_pago = 'completo'`, aplican las reglas de devolución existentes.

---

## Requisitos

### Requisito 1: Selección del modo de pago al reservar

**User Story:** Como usuario, quiero elegir entre pagar el 100% online o solo el 20% de adelanto, para decidir cuánto dinero comprometer al momento de reservar.

#### Criterios de Aceptación

1. WHEN el usuario llega a la página de pago (`/pago`), THE Sistema SHALL mostrar dos opciones de Modo_Pago: "Pago completo (100%)" y "Pago con adelanto (20%)".
2. THE Sistema SHALL mostrar el monto correspondiente a cada opción calculado sobre el precio de la hora seleccionada.
3. WHEN el usuario selecciona "Pago con adelanto (20%)", THE Sistema SHALL actualizar el resumen de pago mostrando el Adelanto a pagar online y el Saldo_Pendiente a pagar en cancha.
4. WHEN el usuario selecciona "Pago completo (100%)", THE Sistema SHALL mantener el flujo actual sin cambios.
5. THE Sistema SHALL establecer "Pago completo (100%)" como opción seleccionada por defecto.

---

### Requisito 2: Cálculo y presentación del adelanto

**User Story:** Como usuario, quiero ver claramente cuánto pago ahora y cuánto pago en la cancha, para entender el desglose antes de confirmar.

#### Criterios de Aceptación

1. WHEN el usuario selecciona el Modo_Pago de adelanto, THE Sistema SHALL calcular el Adelanto como el 20% del Pago_Total (precio hora + extras seleccionados − descuento de cupón).
2. WHEN el usuario selecciona el Modo_Pago de adelanto, THE Sistema SHALL calcular el Saldo_Pendiente como el 80% del Pago_Total.
3. THE Sistema SHALL mostrar en el resumen de pago: precio base, extras, descuento (si aplica), Adelanto a pagar ahora y Saldo_Pendiente a pagar en cancha.
4. IF el Pago_Total incluye un descuento de cupón, THEN THE Sistema SHALL aplicar el descuento al Pago_Total antes de calcular el Adelanto y el Saldo_Pendiente.
5. THE Sistema SHALL redondear el Adelanto al entero más cercano en soles (sin decimales).

---

### Requisito 3: Registro de la reserva con pago parcial

**User Story:** Como usuario, quiero que mi reserva quede registrada correctamente indicando que pagué solo el adelanto, para que la cancha sepa que debo el saldo restante.

#### Criterios de Aceptación

1. WHEN el usuario confirma una reserva con Modo_Pago de adelanto, THE Sistema SHALL crear la Reserva con los campos: `monto_adelanto` (20%), `saldo_pendiente` (80%), `precio_total` (100%) y `modo_pago = 'parcial'`.
2. WHEN el usuario confirma una reserva con Modo_Pago completo, THE Sistema SHALL crear la Reserva con `modo_pago = 'completo'`, `monto_adelanto = precio_total` y `saldo_pendiente = 0`.
3. THE Sistema SHALL almacenar el `comprobante_url` del pago del Adelanto en la Reserva.
4. THE Sistema SHALL asignar el estado inicial `'pendiente'` a toda Reserva recién creada, independientemente del Modo_Pago.
5. IF faltan los campos `monto_adelanto`, `saldo_pendiente` o `modo_pago` en la solicitud de creación, THEN THE Sistema SHALL retornar un error 400 con un mensaje descriptivo.

---

### Requisito 4: Visualización del estado de pago en "Mis Reservas"

**User Story:** Como usuario, quiero ver en mis reservas si tengo un saldo pendiente por pagar en la cancha, para no olvidar llevar el dinero el día del partido.

#### Criterios de Aceptación

1. WHEN el usuario visualiza una Reserva con `modo_pago = 'parcial'` y estado `'confirmada'`, THE Sistema SHALL mostrar una etiqueta "Saldo pendiente en cancha: S/ {saldo_pendiente}".
2. WHEN el usuario visualiza una Reserva con `modo_pago = 'completo'`, THE Sistema SHALL mostrar el precio total sin indicador de saldo pendiente.
3. THE Sistema SHALL mostrar en el detalle de la Reserva: el Adelanto pagado online, el Saldo_Pendiente a pagar en cancha y el Pago_Total.
4. WHEN la Reserva tiene `modo_pago = 'parcial'` y estado `'pendiente'`, THE Sistema SHALL mostrar el mensaje "Adelanto enviado — pendiente de confirmación".

---

### Requisito 5: Panel Admin — visualización y gestión del pago parcial

**User Story:** Como Admin, quiero ver en el panel de reservas qué reservas tienen pago parcial y cuánto saldo queda pendiente, para hacer seguimiento de los cobros en cancha.

#### Criterios de Aceptación

1. THE Sistema SHALL mostrar en el listado de reservas del panel Admin una columna o indicador que distinga reservas con `modo_pago = 'parcial'` de las de `modo_pago = 'completo'`.
2. WHEN el Admin visualiza el detalle de una Reserva con `modo_pago = 'parcial'`, THE Sistema SHALL mostrar: Adelanto cobrado online, Saldo_Pendiente en cancha y Pago_Total.
3. THE Sistema SHALL permitir al Admin filtrar reservas por `modo_pago` (completo / parcial).
4. WHEN el Admin confirma una Reserva con `modo_pago = 'parcial'`, THE Sistema SHALL mantener el `saldo_pendiente` visible en el panel para seguimiento.

---

### Requisito 6: Panel Admin-Cancha — registro del cobro del saldo en cancha

**User Story:** Como Admin_Cancha, quiero poder marcar que el saldo pendiente fue cobrado presencialmente, para que el sistema refleje que la reserva está completamente pagada.

#### Criterios de Aceptación

1. WHEN el Admin_Cancha visualiza una Reserva con `modo_pago = 'parcial'` y `saldo_cobrado = false`, THE Sistema SHALL mostrar un botón "Marcar saldo cobrado".
2. WHEN el Admin_Cancha presiona "Marcar saldo cobrado", THE Sistema SHALL actualizar la Reserva con `saldo_cobrado = true` y registrar la fecha y hora del cobro en `saldo_cobrado_en`.
3. WHEN una Reserva tiene `saldo_cobrado = true`, THE Sistema SHALL mostrar el indicador "Pago completo ✓" en el panel Admin_Cancha.
4. THE Sistema SHALL mostrar en el listado de reservas del Admin_Cancha el Saldo_Pendiente de cada reserva con `modo_pago = 'parcial'` y `saldo_cobrado = false`.
5. IF el Admin_Cancha intenta marcar como cobrado el saldo de una Reserva con `modo_pago = 'completo'`, THEN THE Sistema SHALL retornar un error 400 indicando que la reserva ya está completamente pagada.

---

### Requisito 7: Política de cancelación adaptada al pago parcial

**User Story:** Como usuario, quiero saber qué pasa con mi adelanto si cancelo una reserva con pago parcial, para tomar una decisión informada antes de cancelar.

#### Criterios de Aceptación

1. WHEN el usuario cancela una Reserva con `modo_pago = 'parcial'`, THE Sistema SHALL retener el 100% del `monto_adelanto` como penalidad, sin ninguna devolución al usuario.
2. WHEN el usuario cancela una Reserva con `modo_pago = 'completo'`, THE Sistema SHALL mantener el cálculo actual de Devolucion y Penalidad sobre el precio total (reglas existentes: 85% con >4h, 60% entre 2-4h, 30% entre 1-2h, 0% con <1h).
3. WHEN el usuario visualiza la pantalla de cancelación de una Reserva con `modo_pago = 'parcial'`, THE Sistema SHALL mostrar el mensaje: "Al cancelar una reserva con adelanto, perderás el monto abonado (S/ {monto_adelanto}). No hay devolución."
4. THE Sistema SHALL incluir en la notificación de cancelación el mensaje de que el adelanto fue retenido y no habrá devolución.
5. WHEN se cancela una Reserva con `modo_pago = 'parcial'`, THE Sistema SHALL registrar en la Reserva: `devolucion_calculada = 0` y `penalidad_aplicada = monto_adelanto`.

---

### Requisito 8: Beneficios del pago completo

**User Story:** Como usuario, quiero ver claramente qué ventajas obtengo al pagar el 100% online, para tomar una decisión informada al elegir el modo de pago.

#### Criterios de Aceptación

1. WHEN el usuario visualiza las opciones de Modo_Pago en la página de pago, THE Sistema SHALL mostrar la opción "Pago completo (100%)" con una etiqueta visual destacada (ej. "Recomendado" o "✓ Reserva garantizada").
2. THE Sistema SHALL mostrar junto a la opción de pago completo los beneficios: "Cancelación con devolución de hasta el 85%" y "Reserva garantizada".
3. THE Sistema SHALL mostrar junto a la opción de pago con adelanto una advertencia: "⚠ Sin devolución al cancelar".
4. WHEN el usuario selecciona "Pago completo (100%)", THE Sistema SHALL resaltar visualmente esa opción como la selección activa con un estilo diferenciado (borde, color o ícono).
5. THE Sistema SHALL mostrar en el resumen final de la reserva con pago completo el texto "Reserva garantizada ✓" como confirmación del beneficio obtenido.
6. WHEN el usuario visualiza una Reserva con `modo_pago = 'completo'` en "Mis Reservas", THE Sistema SHALL mostrar el badge "Pago completo ✓" junto al estado de la reserva.

---

### Requisito 9: Migración de base de datos

**User Story:** Como desarrollador, quiero que la base de datos soporte los nuevos campos de pago parcial sin romper las reservas existentes, para garantizar compatibilidad hacia atrás.

#### Criterios de Aceptación

1. THE Sistema SHALL agregar a la tabla `reservas` los campos: `modo_pago` (text, default `'completo'`), `monto_adelanto` (int), `saldo_pendiente` (int, default 0), `saldo_cobrado` (boolean, default false) y `saldo_cobrado_en` (timestamptz, nullable).
2. THE Sistema SHALL establecer valores por defecto que preserven el comportamiento actual para todas las reservas existentes (`modo_pago = 'completo'`, `saldo_pendiente = 0`, `saldo_cobrado = false`).
3. WHEN se ejecuta la migración, THE Sistema SHALL asignar `monto_adelanto = precio` a todas las reservas existentes que no tengan valor en ese campo.
