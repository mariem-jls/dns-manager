import client from './client'

export async function fetchUsers(){
  const response = await client.get('/api/users')
  return response.data
}

export async function inviteUser(payload: { email: string; role: string }){
  const response = await client.post('/api/users/invite', payload)
  return response.data
}