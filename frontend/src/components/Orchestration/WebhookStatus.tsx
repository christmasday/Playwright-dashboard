import React, { useState, useEffect } from 'react';
import webhookService from '../../services/webhook';

interface WebhookStatus {
  github: boolean;
  gitlab: boolean;
  jenkins: boolean;
}

const WebhookStatus: React.FC = () => {
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus>({
    github: false,
    gitlab: false,
    jenkins: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await webhookService.getWebhookStatus();
        setWebhookStatus(response.data);
      } catch (error) {
        console.error('Error fetching webhook status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const getStatusIndicator = (enabled: boolean) => {
    if (enabled) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-sm text-green-600">Enabled</span>
        </div>
      );
    }
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
        <span className="text-sm text-gray-600">Disabled</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">Webhook Status</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="text-lg font-medium text-gray-900">GitHub</h4>
            <p className="text-sm text-gray-600">Configure webhook for GitHub events</p>
          </div>
          {getStatusIndicator(webhookStatus.github)}
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="text-lg font-medium text-gray-900">GitLab</h4>
            <p className="text-sm text-gray-600">Configure webhook for GitLab events</p>
          </div>
          {getStatusIndicator(webhookStatus.gitlab)}
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="text-lg font-medium text-gray-900">Jenkins</h4>
            <p className="text-sm text-gray-600">Configure webhook for Jenkins events</p>
          </div>
          {getStatusIndicator(webhookStatus.jenkins)}
        </div>
      </div>
      {loading ? (
        <div className="text-center text-gray-500 mt-4">Loading status...</div>
      ) : (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            Configure environment variables for webhooks:
          </p>
          <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
            <li>GITHUB_WEBHOOK_SECRET</li>
            <li>GITLAB_WEBHOOK_TOKEN</li>
            <li>JENKINS_WEBHOOK_TOKEN</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default WebhookStatus;
