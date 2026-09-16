import client from './client'

export interface LoginPayload {
  username: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'operator' | 'viewer'
}

export interface LoginResponse {
  token: string
  refresh_token: string
  expires_at: number
  user: AuthUser
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const params = new URLSearchParams()
  params.append('username', payload.username)
  params.append('password', payload.password)

  const response = await client.post('/api/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return response.data
}

export async function logout(): Promise<void> {
  await client.post('/api/auth/logout')
}

export async function fetchMe(): Promise<AuthUser> {
  const response = await client.get('/api/auth/me')
  return response.data.user
}