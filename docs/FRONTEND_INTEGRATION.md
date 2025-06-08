# OpenLearn API - Frontend Integration Guide

## Quick Start for Frontend Developers

This guide provides everything you need to integrate with the OpenLearn backend API from your React frontend.

### Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

---

## Essential API Endpoints

### 1. User Registration
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "student@college.edu",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "role": "PIONEER"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token",
      "expiresIn": 900
    }
  }
}
```

### 2. User Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@college.edu",
  "password": "SecurePassword123!"
}
```

### 3. Protected API Calls
```bash
GET /api/auth/profile
Authorization: Bearer your-jwt-token
```

### 4. Token Refresh
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

---

## Complete React Integration

### 1. Install Dependencies
```bash
npm install axios
# or
npm install fetch (built-in)
```

### 2. API Client Setup

```typescript
// src/api/client.ts
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  roles: Array<{
    name: string;
    level: number;
  }>;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  role?: string;
}

class ApiClient {
  private baseUrl = 'http://localhost:3000/api';
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    // Handle token expiration
    if (response.status === 401 && data.error?.code === 'TOKEN_EXPIRED') {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        headers.Authorization = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, { ...options, headers });
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  async refreshTokens(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        this.setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    this.clearTokens();
    return false;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Auth methods
  async register(userData: RegisterData) {
    const response = await this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success) {
      this.setTokens(
        response.data.tokens.accessToken,
        response.data.tokens.refreshToken
      );
    }

    return response;
  }

  async login(credentials: LoginData) {
    const response = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success) {
      this.setTokens(
        response.data.tokens.accessToken,
        response.data.tokens.refreshToken
      );
    }

    return response;
  }

  async getProfile() {
    return this.request<{ success: boolean; data: User }>('/auth/profile');
  }

  async logout() {
    if (this.refreshToken) {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
    }
    this.clearTokens();
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

export const apiClient = new ApiClient();
```

### 3. React Auth Hook

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect, createContext, useContext } from 'react';
import { apiClient, User, LoginData, RegisterData } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginData) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (apiClient.isAuthenticated()) {
        try {
          const response = await apiClient.getProfile();
          if (response.success) {
            setUser(response.data);
          }
        } catch (error) {
          console.error('Failed to load profile:', error);
          apiClient.clearTokens();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginData) => {
    const response = await apiClient.login(credentials);
    if (response.success) {
      setUser(response.data.user);
    }
  };

  const register = async (userData: RegisterData) => {
    const response = await apiClient.register(userData);
    if (response.success) {
      setUser(response.data.user);
    }
  };

  const logout = async () => {
    await apiClient.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 4. Login Component

```tsx
// src/components/LoginForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData);
      // Redirect handled by auth state change
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Email
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Password
        </label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="mb-4 text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};

export default LoginForm;
```

### 5. Registration Component

```tsx
// src/components/RegisterForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: 'PIONEER',
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            First Name
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Last Name
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Email
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Username
        </label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Password
        </label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
        />
        <p className="text-gray-600 text-xs mt-1">
          Must be 8+ characters with uppercase, lowercase, number, and special character
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Confirm Password
        </label>
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="mb-4 text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? 'Creating Account...' : 'Register'}
      </button>
    </form>
  );
};

export default RegisterForm;
```

### 6. Protected Route Component

```tsx
// src/components/ProtectedRoute.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requireEmailVerification?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requireEmailVerification = false,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p>Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  if (requireEmailVerification && !user.emailVerified) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Email Verification Required</h2>
          <p>Please verify your email to access this page.</p>
        </div>
      </div>
    );
  }

  if (requiredRole && !user.roles.some(role => role.name === requiredRole)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

### 7. App Setup

```tsx
// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginForm />} 
      />
      <Route 
        path="/register" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterForm />} 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute requireEmailVerification>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
```

---

## Error Handling

### Common Error Response Format
```json
{
  "success": false,
  "message": "Human readable error message",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Error Handling Example
```typescript
try {
  await apiClient.login(credentials);
} catch (error: any) {
  // Handle specific error codes
  if (error.message.includes('Invalid credentials')) {
    setError('Invalid email or password');
  } else if (error.message.includes('Rate limit exceeded')) {
    setError('Too many attempts. Please try again later.');
  } else {
    setError('Login failed. Please try again.');
  }
}
```

---

## Testing Your Integration

### 1. Test User Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 2. Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### 3. Test Protected Endpoint
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Next Steps

1. **Start your backend**: `npm run dev`
2. **Create your React app**: `npx create-react-app frontend --template typescript`
3. **Copy the code above** into your React app
4. **Install dependencies**: `npm install`
5. **Start your frontend**: `npm start`

