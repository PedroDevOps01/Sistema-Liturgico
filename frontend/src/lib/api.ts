import axios from 'axios'
import { getToken, removeToken, removeUser } from './auth'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    // Auto-unwrap { data: payload, message: '...' } from Laravel responses
    if (
      response.data &&
      typeof response.data === 'object' &&
      'data' in response.data &&
      'message' in response.data &&
      response.config.responseType !== 'blob'
    ) {
      response.data = response.data.data
    }
    return response
  },
  (error) => {
    // Only redirect on 401 if NOT on the login page (avoids loop) and NOT the login request itself
    if (
      error.response?.status === 401 &&
      !window.location.pathname.includes('/login') &&
      !error.config?.url?.includes('/login')
    ) {
      removeToken()
      removeUser()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
