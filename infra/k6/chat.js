import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * Carga sobre el chat (RNF-02/03: 5.000 usuarios concurrentes en chat).
 * Cada envío pasa por la clasificación previa de moderación, así que este
 * escenario mide justamente ese costo (7.3: objetivo < 300 ms).
 *
 * Uso:
 *   k6 run -e BASE_URL=... -e TOKEN=... -e CONVERSATION_ID=... infra/k6/chat.js
 *
 * Con SMOKE=1 corre 10 s con 5 lectores y 5 envíos por segundo: valida guion
 * y entorno sin inundar una conversación real. Los umbrales no cambian.
 */
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/v1';
const TOKEN = __ENV.TOKEN || '';
const CONVERSATION_ID = __ENV.CONVERSATION_ID || '';
const SMOKE = __ENV.SMOKE === '1';

const moderationLatency = new Trend('moderation_latency', true);
const deliveredRate = new Rate('messages_delivered');

const FULL_SCENARIOS = {
  reading: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 50 },
      { duration: '2m', target: 150 },
      { duration: '30s', target: 0 },
    ],
    exec: 'readConversation',
  },
  sending: {
    executor: 'constant-arrival-rate',
    rate: 30,
    timeUnit: '1s',
    duration: '2m',
    preAllocatedVUs: 50,
    maxVUs: 200,
    exec: 'sendMessage',
  },
};

const SMOKE_SCENARIOS = {
  reading: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [{ duration: '10s', target: 5 }],
    exec: 'readConversation',
  },
  sending: {
    executor: 'constant-arrival-rate',
    rate: 5,
    timeUnit: '1s',
    duration: '10s',
    preAllocatedVUs: 5,
    maxVUs: 20,
    exec: 'sendMessage',
  },
};

export const options = {
  scenarios: SMOKE ? SMOKE_SCENARIOS : FULL_SCENARIOS,
  thresholds: {
    'http_req_duration{endpoint:messages_read}': ['p(95)<400'],
    // Moderación previa: objetivo de latencia del pipeline (7.3).
    'http_req_duration{endpoint:messages_send}': ['p(95)<800', 'p(50)<300'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// Sin token o sin conversación todo serían 401/404: cortar antes de arrancar.
export function setup() {
  if (!TOKEN) throw new Error('Falta TOKEN (-e TOKEN=<jwt>).');
  if (!CONVERSATION_ID) throw new Error('Falta CONVERSATION_ID (-e CONVERSATION_ID=<id>).');
}

const SAFE_MESSAGES = [
  '¿Qué libro de la Biblia estás leyendo esta semana?',
  'Me gustó mucho lo que compartiste del retiro.',
  '¿Vas a la vigilia del viernes?',
  'Gracias por orar por mi familia 🙏',
];

export function readConversation() {
  const response = http.get(`${BASE_URL}/connections/conversations/${CONVERSATION_ID}/messages`, {
    headers,
    tags: { endpoint: 'messages_read' },
  });
  check(response, { 'historial responde 200': (r) => r.status === 200 });
  sleep(2);
}

export function sendMessage() {
  const body = JSON.stringify({
    body: SAFE_MESSAGES[Math.floor(Math.random() * SAFE_MESSAGES.length)],
  });
  const response = http.post(
    `${BASE_URL}/connections/conversations/${CONVERSATION_ID}/messages`,
    body,
    { headers, tags: { endpoint: 'messages_send' } },
  );
  moderationLatency.add(response.timings.duration);
  const delivered = response.status === 201 && response.json('moderationStatus') === 'APPROVED';
  deliveredRate.add(delivered);
  check(response, {
    'mensaje aceptado': (r) => r.status === 201,
    'contenido sano se entrega': () => delivered,
  });
}
