import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30_000,
})

export function clearAuthStorage() {
  localStorage.removeItem('dns_token')
  localStorage.removeItem('dns_user')
  sessionStorage.clear()
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('dns_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthStorage()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client