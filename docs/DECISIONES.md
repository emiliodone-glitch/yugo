# Lo que Yugo decide no construir

## Para qué sirve este documento

Un producto se define tanto por lo que hace como por lo que se niega a hacer. La
diferencia es que lo primero está en el código, donde cualquiera lo ve, y lo
segundo no está en ninguna parte — así que a los seis meses nadie recuerda si
una ausencia fue una decisión o un olvido, y la primera persona que pregunte
«¿por qué no tenemos rachas?» va a recibir un encogimiento de hombros.

Este documento es para esa persona. Cada decisión trae tres cosas:

- **Qué no se hace**, en una frase.
- **Qué cuesta**, dicho sin adornos. Todas estas decisiones tienen un costo
  real y medible; una lista de decisiones donde todo sale gratis es una lista de
  excusas.
- **Qué me haría cambiar de opinión**, concreto. Sin esto, una decisión de
  producto es una convicción, y las convicciones no se revisan.

Nada de esto es sagrado. Lo que sí se pide es que quien lo cambie sepa que lo
está cambiando.

---

## A. Mecánicas que no se construyen

### A1. Sin deslizar infinito ni feed infinito

Descubrir es una lista curada y finita: 30 perfiles al día (60 en Oro), 8
intereses gratis diarios. Se acaba. No hay mazo de tarjetas ni scroll sin fondo,
y no se usa ninguna librería de swipe.

**Qué cuesta.** Las métricas de sesión y de retorno diario van a ser peores que
las de cualquier competidor. Un mazo infinito es, medido en minutos, el mejor
producto de citas que existe. Si alguien compara Yugo con Tinder en un panel de
engagement, Yugo pierde y va a seguir perdiendo.

**Qué me haría cambiar de opinión.** Que los datos muestren que la gente se
queda sin lista y **no vuelve al día siguiente** en una proporción alta, y que
al entrevistarlos digan que se fueron por falta de opciones y no por falta de
tiempo. Ojo: «piden más perfiles» no basta. La gente pide más de todo. Lo que
contaría es que la lista corta esté causando abandono, medido en la cohorte, no
en una encuesta.

### A2. Sin rachas, en ninguna parte

El devocional cuenta **constancia** —«leíste 18 de los últimos 30 días»—, un
número que sube y baja sin castigar. No existe el momento «perdiste tu racha», y
ninguna cadena de la interfaz menciona los días que alguien faltó. Hay pruebas
que fallan si alguien introduce una.

**Qué cuesta.** Las rachas son, con diferencia, la mecánica de retención más
efectiva que se ha inventado. Renunciar a ellas es renunciar a puntos enteros de
retención mensual, no a decimales.

**Qué me haría cambiar de opinión.** Nada que se me ocurra hoy, y conviene decir
por qué en vez de fingir apertura: esto es una disciplina espiritual, y quien
faltó tres días es exactamente la persona a quien más le conviene volver. Una
mecánica que le añade culpa a esa persona en ese momento está trabajando en
contra del propósito del producto, aunque suba el número. Si alguien quiere
reabrirlo, el argumento tendría que ser que la culpa no ocurre — y eso se mide
preguntándole a gente que dejó de leer, no mirando la retención de quien siguió.

### A3. Sin optimizar tiempo en pantalla como métrica

No se persigue el minuto. La razón práctica, más allá de la filosófica: **en una
app cuyo propósito declarado es el matrimonio, quien más horas acumula es
desproporcionadamente quien la está usando mal.** Optimizar tiempo en pantalla
optimiza exactamente a la población que la validación de propósito existe para
detectar. Son dos sistemas tirando en direcciones contrarias.

Lo que sí se persigue es que la app **valga la pena abrirla**: por eso existen el
devocional y el muro de oración, que le sirven a alguien aunque nunca conozca a
nadie aquí. La distinción no es retórica. Una mecánica que retiene sin dar nada
—una racha, una notificación fabricada, un mazo sin fondo— está fuera. Algo que
alguien abriría aunque no lo empujáramos, está dentro.

**Qué cuesta.** Es más difícil de construir y mucho más lento de demostrar. Un
feed infinito se implementa en una semana; una razón real para volver hay que
inventarla.

**Qué me haría cambiar de opinión.** Nada sobre la métrica en sí. Sobre casos
concretos, todo: si aparece una función que la gente usa mucho **y** que empuja
vínculos hacia adelante, entra sin discusión.

### A4. Sin videollamadas dentro de la app

**Qué cuesta.** Es lo que más piden las apps de citas después del chat, y sin
ella la primera vez que dos personas se ven la cara es en persona — que tiene su
propio riesgo, el que el plan del primer encuentro intenta cubrir.

**Qué me haría cambiar de opinión.** Poco: esto es sobre todo alcance, no
principio. Está fuera del MVP en la sección 3.2 de los requerimientos y entra
cuando haya presupuesto de moderación para vídeo en vivo — que es el verdadero
bloqueo, no el WebRTC. Moderar texto es barato; moderar vídeo en vivo no, y
lanzar un canal sin moderar en un producto con esta promesa sería peor que no
tenerlo.

---

## B. Lo que el dinero no compra

Yugo se vende (Plus y Oro). Hay tres cosas que ningún plan desbloquea, y son
tres porque cada una rompería algo distinto.

### B1. El rango mutuo de edad

La consulta de Descubrir filtra **en las dos direcciones** dentro del SQL: el
candidato cae en mi rango y yo caigo en el suyo. Ningún nivel de pago lo relaja
(RF-PLU-09), y el cliente nunca es la única barrera.

**Qué cuesta.** Un porcentaje de ingresos real. «Ver a más gente» es lo primero
que se le ocurre vender a cualquiera, y es lo que la competencia vende.

**Qué me haría cambiar de opinión.** Nada. Un hombre de 45 pagando por aparecer
ante mujeres de 22 que pusieron su tope en 30 es precisamente lo que este
producto no puede permitir, y la regla vive en SQL en vez de en la pantalla para
que no se pueda relajar por accidente al cambiar un componente.

### B2. La insignia «Perfil con propósito»

Se gana con comportamiento sostenido —conversaciones reales, vínculos que
avanzaron— y no está a la venta.

**Qué cuesta.** Es la insignia más vendible del producto.

**Qué me haría cambiar de opinión.** Nada. Vender la señal de confianza empuja a
la gente hacia los perfiles que pagaron en vez de hacia los que se comportaron,
que es lo contrario de para qué existe. Por la misma razón el filtro de
respaldados por su iglesia es gratis.

### B3. Saltarse la moderación previa

Todo el texto y las imágenes de todos los miembros pasan por revisión **antes**
de publicarse, en todos los planes. Si el clasificador falla, el contenido queda
retenido, nunca se entrega sin revisar.

**Qué cuesta.** Latencia en el chat y una factura de moderación que crece con el
uso, sin un plan que la compense.

**Qué me haría cambiar de opinión.** Nada sobre la moderación previa. Sobre el
umbral y la latencia, todo: son parámetros y están para ajustarse con datos.

---

## C. Números que no se muestran

### C1. El puntaje de propósito

Existe y ordena una cola de revisión humana. **Ningún miembro ve un puntaje**:
ni el suyo ni el de nadie. `GET /proposito/mio` devuelve solo si ganó la
insignia y qué le falta; el juicio completo, con sus explicaciones, lo devuelve
`GET /proposito/:userId`, restringido por rol a moderación y administración.
Esa restricción es la decisión: quien juzga a una persona necesita ver el
razonamiento, y quien es juzgado no necesita un marcador.

**Qué cuesta.** Se pierde el efecto educativo de «tu puntaje bajó porque marcas
interés y no escribes». Sería útil.

**Qué me haría cambiar de opinión.** Casi nada, y por una razón que se repite en
todo este documento: **un número visible se convierte en un juego.** La gente
aprende a mover el número, no a comportarse, y entonces el número deja de medir
lo que medía. La versión que sí consideraría es un mensaje privado, cualitativo
y sin cifra — que es lo que hoy hace `nudge`, una vez cada 30 días como máximo.

### C2. El porcentaje de compatibilidad en las conversaciones que importan

Las respuestas de las doce preguntas se muestran lado a lado, sin puntaje.

**Qué cuesta.** Un número es más compartible y más satisfactorio de mirar.

**Qué me haría cambiar de opinión.** Nada. Dos personas que no coinciden en cómo
manejan el dinero no están «mal emparejadas al 62%»: están informadas, que es
todo lo que esta función promete. Un porcentaje convertiría una conversación en
un veredicto, y el veredicto llegaría antes de la conversación.

Nótese que la afinidad de Descubrir **sí** muestra su desglose. La diferencia es
que ahí el número ordena una lista y explicarlo es honesto; aquí no ordenaría
nada, solo juzgaría a una persona concreta que la otra ya conoce.

### C3. El cero al lado de una petición de oración

Cuando nadie ha acompañado una petición, dice «Sé el primero en acompañar», no
«0 personas orando».

**Qué cuesta.** Se pierde precisión en la interfaz, y hay que mantener una
función de texto en vez de imprimir la variable.

**Qué me haría cambiar de opinión.** Nada. Quien lee ese cero es exactamente la
persona que peor la está pasando.

---

## D. Datos que no viajan

Estas cuatro no son preferencias de diseño: son invariantes con pruebas que
fallan si alguien las rompe, y cada una está escrita en el servidor y no en la
pantalla.

| Invariante | Dónde se cumple | Qué la rompería |
| --- | --- | --- |
| Los padrinos ven la etapa del vínculo, **nunca** el chat | 403 en lectura y en escritura, no un filtro de UI | Añadir el chat al payload de acompañamiento |
| Nadie ve la respuesta del otro antes de escribir la suya | `theirAnswer` llega en `null`, el texto no sale del servidor | Mandarlo y ocultarlo con CSS |
| De una petición anónima no sale ni el nombre ni la iglesia | `churchId` se guarda en `null`; el autor no se serializa | Guardarlo «solo para ordenar» |
| La edad se valida en el servidor y el intento menor se audita | 403 desde el servicio, con registro previo en `AuditLog` | Un 400 desde un esquema que corta antes de auditar |

La tercera merece una nota porque su costo es el menos obvio: **una petición
anónima no aparece en la vista «mi iglesia»**, lo que le quita alcance justo a
las peticiones que más lo necesitarían. Se acepta porque en una congregación de
cuarenta personas «esto es de tu iglesia» reduce el anonimato a un puñado de
candidatos, y la congregación es precisamente ante quien alguien elige no
firmar. Sin ese anonimato, esas peticiones no se escriben — y entonces no hay
alcance que repartir.

---

## E. Por qué el embudo termina en matrimonios

El reporte principal del panel de administración va:

> Registrados → Perfil completo → Verificados nivel 2+ → Con al menos una
> conexión → Conversando → En un vínculo que avanzó → En noviazgo o compromiso →
> **Casados**

Las suscripciones son un reporte **aparte**, no el último escalón de este.

Esto no es cosmético. El embudo principal es lo que un equipo mira todos los
lunes, y con el tiempo un equipo optimiza lo que mira. Si el último escalón
fuera «suscritos», en dos años Yugo sería una máquina de vender suscripciones
que además tiene perfiles — y lo sería sin que nadie lo hubiera decidido, solo
por gravedad.

Tiene un costo grande y honesto: **el escalón final tarda años en moverse.** Un
matrimonio no ocurre en un trimestre. Durante mucho tiempo esa fila va a decir
números pequeños, y va a ser tentador dejar de mirarla. Los escalones
intermedios —«conversando», «un vínculo que avanzó»— existen para eso: se mueven
en semanas y apuntan al mismo sitio.

**Qué me haría cambiar de opinión.** Añadir escalones intermedios, sí, cuantos
hagan falta. Mover el dinero al final de este embudo, no.

---

## F. Lo que sí se construyó estando fuera del MVP

En la otra dirección, para que el registro sea completo. La sección 3.2 de los
requerimientos deja fuera del MVP «programa de mentoría o acompañamiento
prematrimonial» y «devocionales diarios y planes de lectura compartidos». Los
dos están construidos.

- **Acompañamiento (padrinos).** Se adelantó porque es lo que distingue este
  producto de una app de citas con versículos. Un matrimonio que acompaña a una
  pareja desde que declaran amistad intencional es la función que aparece en la
  única historia publicada como la razón por la que funcionó.
- **Devocional diario.** Se adelantó porque el producto no tenía ninguna razón
  para abrirse un martes en que no hubiera nadie nuevo. No es el «plan de
  lectura compartido en pareja» de 3.2 —eso sigue fuera—: es un texto al día
  igual para toda la comunidad, que es lo que permite decir «27 personas de tu
  iglesia lo leyeron hoy».

Ambos añaden superficie que mantener y moderar, y ninguno estaba presupuestado.
Se dice aquí para que quien planifique lo siguiente lo sepa.

---

## Cómo proponer un cambio

1. Di cuál de estas decisiones estás cambiando y por qué. Si no está en la
   lista, añádela con el mismo formato.
2. Trae el dato, no la intuición. Casi todas estas decisiones cuestan métricas a
   corto plazo **a propósito**, así que «esto subiría la retención» no es un
   argumento en contra de ninguna: ya lo sabemos.
3. Si el cambio toca algo de la sección D, la prueba que lo protege tiene que
   fallar primero. Si no falla, la invariante no estaba protegida y ese es un
   problema aparte que hay que arreglar igual.

---

Ver también: `README.md` (principios en corto), `docs/ARCHITECTURE.md`
(decisiones técnicas y sus porqués), `docs/CHANGELOG.md` (qué se decidió en cada
hito).
