import { getAuthToken } from './storage.js';

const API_BASE_URL = 'http://localhost:8080';

export async function apiRequest(endpoint, options = {}) {

    const token = getAuthToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,
            headers
        }
    );

    return response;
}