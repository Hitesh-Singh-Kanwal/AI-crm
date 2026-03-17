'use client'

import { getToken, logout } from './auth'

/**
 * Build API URL: prefer NEXT_PUBLIC_API_BASE_URL when provided, otherwise use relative paths
 */
function getApiBaseUrl() {
  const base = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || 'http://localhost:8080'
  return base.replace(/\/$/, '')
}

/**
 * Centralized API client for making authenticated requests
 */
class ApiClient {
  constructor() {
    this.baseUrl = getApiBaseUrl()
  }

  /**
   * Build full URL from path
   */
  buildUrl(path) {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${this.baseUrl}${normalizedPath}`
  }

  /**
   * Build headers with authentication token
   */
  buildHeaders(customHeaders = {}) {
    const token = getToken()
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  /**
   * Handle API response
   */
  async handleResponse(response) {
    const data = await response.json().catch(() => null)

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        logout()
      }
      return {
        success: false,
        error: data?.message || 'Session expired. Please sign in again.',
        status: 401,
      }
    }

    if (response.ok && data && data.success) {
      return {
        success: true,
        data: data.data,
        message: data.message,
        pagination: data.pagination,
      }
    }

    return {
      success: false,
      error: data?.message || `Request failed with status ${response.status}`,
      status: response.status,
    }
  }

  /**
   * Make API request
   */
  async request(path, options = {}) {
    try {
      const url = this.buildUrl(path)
      const headers = this.buildHeaders(options.headers)

      const isFormData =
        typeof FormData !== 'undefined' && options?.body && options.body instanceof FormData
      if (isFormData) {
        // Let the browser set multipart boundaries.
        delete headers['Content-Type']
      }

      const response = await fetch(url, {
        ...options,
        headers,
      })

      return await this.handleResponse(response)
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Network error. Please try again.',
      }
    }
  }

  /**
   * GET request
   */
  async get(path, options = {}) {
    return this.request(path, {
      method: 'GET',
      ...options,
    })
  }

  /**
   * POST request
   */
  async post(path, data, options = {}) {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    })
  }

  /**
   * PUT request
   */
  async put(path, data, options = {}) {
    return this.request(path, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    })
  }

  /**
   * DELETE request
   */
  async delete(path, options = {}) {
    return this.request(path, {
      method: 'DELETE',
      ...options,
    })
  }
}

// Export singleton instance
const api = new ApiClient()

export default api

// Also export convenience methods
export const apiGet = (path, options) => api.get(path, options)
export const apiPost = (path, data, options) => api.post(path, data, options)
export const apiPut = (path, data, options) => api.put(path, data, options)
export const apiDelete = (path, options) => api.delete(path, options)
