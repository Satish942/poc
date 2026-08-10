import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },  // Ramp up to 5 users
    { duration: '1m', target: 20 }, // Ramp up to 20 users (still enough to trigger scale up)
    { duration: '1m', target: 20 }, // Stay at 20 users to trigger HPA scale-up
    { duration: '30s', target: 5 },  // Ramp down to 5 users to observe scale-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8080';

export default function () {
  const res = http.get(BASE_URL);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(0.1); // Small delay between requests per virtual user
}
