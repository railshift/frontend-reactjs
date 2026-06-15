import api from './api';

const alertService = {

  /**
   * Get all alert notifications
   * @returns {Promise} - List of alert notifications
   */
  getAllAlertNotifications: async () => {
    const response = await api.get('api/v1/alerts');
    return response.data.data;
  },
}


export default alertService;
