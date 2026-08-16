import api from './api';

export async function getDashboardStats() {
  const { data } = await api.get('/admin/dashboard');
  return data;
}

export async function listImages(params = {}) {
  const { data } = await api.get('/admin/images', { params });
  return data;
}

export async function createImage(payload) {
  const { data } = await api.post('/admin/images', payload);
  return data.image;
}

export async function updateImage(id, payload) {
  const { data } = await api.put(`/admin/images/${id}`, payload);
  return data.image;
}

export async function deleteImage(id) {
  await api.delete(`/admin/images/${id}`);
}

export async function uploadImageFile(file) {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post('/admin/images/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.imageUrl;
}
