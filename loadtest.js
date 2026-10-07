
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 25 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 150 },
    { duration: '30s', target: 200 },
    { duration: '30s', target: 0 },
  ],

  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://war-room-two-rho.vercel.app';

export default function () {
  const response = http.get(`${BASE_URL}/api/system/state`, {
    headers: {
      'Accept': 'application/json',
    },
    tags: {
      endpoint: 'system_state',
    },
    timeout: '15s',
  });

  check(response, {
    'Status is 200': (r) => r.status === 200,
    'Response is not empty': (r) => r.body && r.body.length > 0,
  });

  sleep(2);
}
