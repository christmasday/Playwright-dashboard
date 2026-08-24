import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

class WebhookService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async handleGitHubWebhook(payload: any) {
    return this.client.post('/webhooks/github', payload);
  }

  async handleGitLabWebhook(payload: any) {
    return this.client.post('/webhooks/gitlab', payload);
  }

  async handleJenkinsWebhook(payload: any) {
    return this.client.post('/webhooks/jenkins', payload);
  }

  getWebhookStatus() {
    return this.client.get('/webhooks/status');
  }
}

export const webhookService = new WebhookService();
export default webhookService;
