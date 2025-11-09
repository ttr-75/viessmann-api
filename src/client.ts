import axios, { AxiosInstance } from 'axios';
import { ViessmannConfig, AuthToken, Installation, Feature } from './types';

export class ViessmannClient {
  private config: ViessmannConfig;
  private axiosInstance: AxiosInstance;
  private token: AuthToken | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: ViessmannConfig) {
    this.config = {
      ...config,
      apiUrl: config.apiUrl || 'https://api.viessmann.com'
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Authenticate with Viessmann API using OAuth2 password grant
   */
  async authenticate(): Promise<void> {
    try {
      const response = await axios.post(
        `${this.config.apiUrl}/iot/v1/auth/token`,
        new URLSearchParams({
          grant_type: 'password',
          username: this.config.username,
          password: this.config.password,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.token = response.data;
      this.tokenExpiry = new Date(Date.now() + this.token!.expires_in * 1000);
      this.updateAuthHeader();
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshToken(): Promise<void> {
    if (!this.token?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(
        `${this.config.apiUrl}/iot/v1/auth/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.token.refresh_token,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.token = response.data;
      this.tokenExpiry = new Date(Date.now() + this.token!.expires_in * 1000);
      this.updateAuthHeader();
    } catch (error) {
      throw new Error(`Token refresh failed: ${error}`);
    }
  }

  /**
   * Check if token is expired or about to expire (within 5 minutes)
   */
  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry.getTime() - 5 * 60 * 1000;
  }

  /**
   * Ensure valid authentication before API calls
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.token) {
      await this.authenticate();
    } else if (this.isTokenExpired()) {
      await this.refreshToken();
    }
  }

  /**
   * Update authorization header with current token
   */
  private updateAuthHeader(): void {
    if (this.token) {
      this.axiosInstance.defaults.headers.common['Authorization'] = 
        `Bearer ${this.token.access_token}`;
    }
  }

  /**
   * Get all installations for the authenticated user
   */
  async getInstallations(): Promise<Installation[]> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.get('/iot/v1/equipment/installations');
    return response.data.data;
  }

  /**
   * Get specific installation by ID
   */
  async getInstallation(installationId: number): Promise<Installation> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.get(
      `/iot/v1/equipment/installations/${installationId}`
    );
    return response.data.data;
  }

  /**
   * Get all features for a device
   */
  async getFeatures(
    installationId: number,
    gatewaySerial: string,
    deviceId: string
  ): Promise<Feature[]> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.get(
      `/iot/v1/equipment/installations/${installationId}/gateways/${gatewaySerial}/devices/${deviceId}/features`
    );
    return response.data.data;
  }

  /**
   * Get a specific feature
   */
  async getFeature(
    installationId: number,
    gatewaySerial: string,
    deviceId: string,
    featureName: string
  ): Promise<Feature> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.get(
      `/iot/v1/equipment/installations/${installationId}/gateways/${gatewaySerial}/devices/${deviceId}/features/${featureName}`
    );
    return response.data.data;
  }

  /**
   * Execute a command on a feature
   */
  async executeCommand(
    installationId: number,
    gatewaySerial: string,
    deviceId: string,
    featureName: string,
    command: string,
    data?: any
  ): Promise<void> {
    await this.ensureAuthenticated();
    await this.axiosInstance.post(
      `/iot/v1/equipment/installations/${installationId}/gateways/${gatewaySerial}/devices/${deviceId}/features/${featureName}/commands/${command}`,
      data
    );
  }

  /**
   * Get current heating temperature
   */
  async getHeatingTemperature(
    installationId: number,
    gatewaySerial: string,
    deviceId: string
  ): Promise<number> {
    const feature = await this.getFeature(
      installationId,
      gatewaySerial,
      deviceId,
      'heating.circuits.0.operating.programs.active'
    );
    return feature.properties.value?.value;
  }

  /**
   * Set heating temperature
   */
  async setHeatingTemperature(
    installationId: number,
    gatewaySerial: string,
    deviceId: string,
    temperature: number
  ): Promise<void> {
    await this.executeCommand(
      installationId,
      gatewaySerial,
      deviceId,
      'heating.circuits.0.operating.programs.comfort',
      'setTemperature',
      { temperature }
    );
  }
}
