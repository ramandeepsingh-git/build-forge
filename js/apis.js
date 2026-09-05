import { getAuthToken } from './storage.js';

const API_BASE_URL = 'https://build-forge.onrender.com';

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