const BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api' : 'http://backend:3000/api');

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function handleSessionExpired() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('micaela_token');
    localStorage.removeItem('micaela_refresh_token');
    localStorage.removeItem('micaela_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login?expired=1';
    }
  }
}

export async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('micaela_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Si el servidor responde 401 Unauthorized y no es una llamada de login o refresh
  if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('micaela_refresh_token') : null;

    if (refreshToken) {
      if (isRefreshing) {
        // Si ya hay una renovación en curso, encolar peticiones concurrentes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            headers['Authorization'] = `Bearer ${newToken}`;
            return fetch(`${BASE_URL}${endpoint}`, { ...options, headers }).then((r) => {
              if (!r.ok) throw new Error(`Error HTTP ${r.status}`);
              return r.json();
            });
          })
          .catch((err) => {
            throw err;
          });
      }

      isRefreshing = true;

      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const newTokens = await refreshRes.json();
          if (typeof window !== 'undefined') {
            localStorage.setItem('micaela_token', newTokens.accessToken);
            if (newTokens.refreshToken) {
              localStorage.setItem('micaela_refresh_token', newTokens.refreshToken);
            }
          }
          isRefreshing = false;
          processQueue(null, newTokens.accessToken);

          // Reintentar la petición original con el nuevo token
          headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
          const retryRes = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers,
          });

          if (!retryRes.ok) {
            const errData = await retryRes.json().catch(() => ({}));
            throw new Error(errData.message || `Error HTTP ${retryRes.status}`);
          }
          return retryRes.json();
        } else {
          isRefreshing = false;
          processQueue(new Error('Sesión expirada'), null);
          handleSessionExpired();
          throw new Error('Su sesión ha expirado. Redirigiendo al inicio de sesión...');
        }
      } catch (err) {
        isRefreshing = false;
        processQueue(err, null);
        handleSessionExpired();
        throw new Error('Su sesión ha expirado. Redirigiendo al inicio de sesión...');
      }
    } else {
      handleSessionExpired();
      throw new Error('No autorizado para acceder a este recurso. Redirigiendo al inicio de sesión...');
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Error HTTP ${res.status}`);
  }

  return res.json();
}

export function getExcelDownloadUrl(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  return `${BASE_URL}/exports/excel?${params.toString()}`;
}

export function getCsvDownloadUrl(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  return `${BASE_URL}/exports/csv?${params.toString()}`;
}
