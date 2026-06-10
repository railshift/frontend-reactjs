import api from './api';

const authService = {
  /**
   * Register new user
   * @param {Object} userData - { employeeId, name, email, phone, password, division, designation, role }
   * @returns {Promise} - { user }
   */
  register: async (userData) => {
    const response = await api.post('api/v1/auth/register', userData);
    return response.data;
  },

  /**
   * Login user
   * @param {Object} credentials - { email, password }
   * @returns {Promise} - { user, accessToken, refreshToken }
   */
  login: async (credentials) => {
    const response = await api.post('api/v1/auth/login', credentials);
    return response.data.data;
  },

  /**
   * Logout user
   * @returns {Promise}
   */
  logout: async () => {
    const response = await api.post('api/v1/auth/logout');
    return response.data;
  },

  /**
   * Get current user
   * @returns {Promise} - user object
   */
  getCurrentUser: async () => {
    const response = await api.get('api/v1/auth/me');
    return response.data.data;
  },

  /**
   * Refresh access token
   * @param {string} refreshToken
   * @returns {Promise} - { accessToken }
   */
  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data.data;
  },
};

export default authService;
