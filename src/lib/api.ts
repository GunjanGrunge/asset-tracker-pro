import { auth } from './firebase'

// Utility functions for the Asset Tracker application

/**
 * Format currency amount in Indian Rupees (INR)
 */
export const formatCurrency = (amount: number): string => {
  // Handle NaN, null, undefined, or invalid numbers
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0'
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date in a readable format
 */
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * API base URL for backend communication
 */
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:5000/api'

/**
 * Make authenticated API requests
 */
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  
  // Get Firebase auth token
  let authToken: string | null = null
  if (auth.currentUser) {
    try {
      authToken = await auth.currentUser.getIdToken()
    } catch (error) {
      console.error('Failed to get auth token:', error)
    }
  }
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error(`API Request failed for ${endpoint}:`, error)
    throw error
  }
}
