import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

/**
 * Carga sobre Descubrir (RNF-02: p95 < 400 ms; RNF-03: 50.000 usuarios
 * registrados). Descubrir es la consulta más cara del sistema: filtro mutuo
 * de edad, PostGIS y puntaje de afinidad.
 *
 * Uso:
 *   k6 run -e BASE_URL=https://staging.yugo.do/v1 -e TOKEN=<jwt> infra/k6/discover.js
 */
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/v1';
const TOKEN = __ENV.TOKEN || '';

const discoverLatency = new Trend('discover_latency', true);

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // rampa
    { duration: '2m', target: 100 }, // carga sostenida
    { duration: '1m', target: 200 }, // pico
    { duration: '30s', target: 0 }, // enfriamiento
  ],
  thresholds: {
    // RNF-02: percentil 95 por debajo de 400 ms en lectura de Descubrir.
    'http_req_duration{endpoint:discover}': ['p(95)<400'],
    'http_req_duration{endpoint:profile}': ['p(95)<400'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

export default function () {
  // La primera lectura del día genera la lista; las siguientes vienen de la
  // caché de Redis, que es el caso dominante en producción.
  const discover = http.get(`${BASE_URL}/discover`, {
    headers,
    tags: { endpoint: 'discover' },
  });
  discoverLatency.add(discover.timings.duration);
  check(discover, {
    'discover responde 200': (r) => r.status === 200,
    'discover devuelve como máximo 60 perfiles': (r) => {
      if (r.status !== 200) return false;
      const body = r.json();
      return Array.isArray(body.items) && body.items.length <= 60;
    },
    'discover expone el contador de intereses': (r) =>
      r.status === 200 && r.json('interests') !== null,
  });

  sleep(1);

  const summary = http.get(`${BASE_URL}/profiles/me`, {
    headers,
    tags: { endpoint: 'profile' },
  });
  check(summary, { 'perfil responde 200': (r) => r.status === 200 });

  sleep(2);
}
