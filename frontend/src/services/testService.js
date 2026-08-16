import api from './api';

export async function startTest() {
  const { data } = await api.post('/test/start');
  if (data.guestToken) {
    localStorage.setItem('cvd_guest_token', data.guestToken);
  }
  return data;
}

export async function getSession(sessionId) {
  const { data } = await api.get(`/test/${sessionId}`);
  return data;
}

export async function submitAnswer(sessionId, { answer, isSkip }) {
  const { data } = await api.post(`/test/${sessionId}/answer`, { answer, isSkip });
  return data;
}

export async function completeTest(sessionId) {
  const { data } = await api.post(`/test/${sessionId}/complete`);
  return data.result;
}
