import { request, post } from '../../lib/apiClient'

export const fetchTeams = (userId) => request(`/teams?userId=${encodeURIComponent(userId)}`)

export const createTeamApi = (name, userId) => post('/teams', { name, userId })
