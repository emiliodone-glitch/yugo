-- Entrada personal con código (RF-EVE-06): cada asistente que va a asistir
-- puede pedir un código corto que enseña en la puerta; la iglesia lo valida
-- desde el portal y queda registrado el check-in.
ALTER TABLE "EventAttendance" ADD COLUMN "ticketCode" TEXT;

CREATE UNIQUE INDEX "EventAttendance_ticketCode_key" ON "EventAttendance"("ticketCode");
