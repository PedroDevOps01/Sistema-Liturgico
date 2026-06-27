import axios from 'axios'
import { getMembroToken, removeMembroToken, removeMembroUser } from './membroAuth'

const membroApi = axios.create({
  baseURL: '/api/membro',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

membroApi.interceptors.request.use((config) => {
  const token = getMembroToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

membroApi.interceptors.response.use(
  (response) => {
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
    if (
      error.response?.status === 401 &&
      !window.location.pathname.includes('/membro/login') &&
      !error.config?.url?.includes('/login')
    ) {
      removeMembroToken()
      removeMembroUser()
      window.location.href = '/membro/login'
    }
    return Promise.reject(error)
  }
)

export default membroApi
