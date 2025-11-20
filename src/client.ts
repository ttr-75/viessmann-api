import axios, { AxiosInstance } from 'axios';
import { ViessmannConfig, AuthToken, Installation, Feature } from './types';
import { generatePKCE, generateState, buildAuthorizationURL, startCallbackServer, openBrowser } from './oauth';
import { TokenStorage } from './storage';

export class ViessmannClient {
  private config: ViessmannConfig;
  private axiosInstance: AxiosInstance;
  private token: AuthToken | null = null;
  private tokenExpiry: Date | null = null;
  private tokenStorage: TokenStorage;
  private redirectUri: string = 'http://localhost:4200/';
  private scope: string = 'IoT User offline_access';

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

    this.tokenStorage = new TokenStorage();

    // If access token is provided, use it directly
    if (config.accessToken) {
      this.token = {
        access_token: config.accessToken,
        refresh_token: config.refreshToken || '',
        expires_in: 3600,
        token_type: 'Bearer'
      };
      // Set expiry far in the future to avoid automatic refresh attempts
      this.tokenExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      this.updateAuthHeader();
    }
  }

  /**
   * Authenticate with browser using OAuth2 Authorization Code Flow with PKCE
   */
  async authenticateWithBrowser(): Promise<void> {
    console.log('🔐 Starting OAuth2 authentication flow...\n');

    // Check if we have a stored token
    const storedToken = await this.tokenStorage.loadToken();
    if (storedToken && !this.tokenStorage.isTokenExpired(storedToken)) {
      console.log('✅ Using stored token');
      this.token = storedToken;
      this.tokenExpiry = new Date(storedToken.created_at + storedToken.expires_in * 1000);
      this.updateAuthHeader();
      return;
    }

    // If we have a refresh token, try to refresh
    if (storedToken?.refresh_token) {
      console.log('🔄 Token expired, attempting refresh...');
      try {
        this.token = storedToken;
        await this.refreshToken();
        return;
      } catch (error) {
        console.log('⚠️  Token refresh failed, starting new authentication');
        await this.tokenStorage.deleteToken();
      }
    }

    // Start new OAuth flow
    const pkce = generatePKCE();
    const state = generateState();

    const authUrl = buildAuthorizationURL(
      {
        clientId: this.config.clientId,
        redirectUri: this.redirectUri,
        scope: this.scope,
        state
      },
      pkce.codeChallenge
    );

    console.log('🌐 Opening browser for authentication...');
    console.log('   If the browser doesn\'t open, visit this URL:');
    console.log(`   ${authUrl}\n`);

    // Start callback server and open browser
    const [code] = await Promise.all([
      startCallbackServer(4200, state),
      openBrowser(authUrl).catch(() => {
        console.log('   Could not open browser automatically');
      })
    ]);

    console.log('✅ Authorization code received, exchanging for token...\n');

    // Exchange code for token
    await this.exchangeCodeForToken(code, pkce.codeVerifier);

    // Save token
    if (this.token) {
      await this.tokenStorage.saveToken(this.token);
      console.log('✅ Token saved successfully\n');
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(code: string, codeVerifier: string): Promise<void> {
    try {
      const params: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier
      };

      const response = await axios.post(
        'https://iam.viessmann-climatesolutions.com/idp/v3/token',
        new URLSearchParams(params),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.token = response.data;
      this.tokenExpiry = new Date(Date.now() + this.token!.expires_in * 1000);
      this.updateAuthHeader();
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Token exchange failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Token exchange failed: ${error}`);
    }
  }

  /**
   * Authenticate with Viessmann API using OAuth2 password grant
   */
  async authenticate(): Promise<void> {
    if (!this.config.username || !this.config.password || !this.config.clientSecret) {
      throw new Error('Username, password, and client secret are required for authentication');
    }

    try {
      const params: Record<string, string> = {
        grant_type: 'password',
        username: this.config.username,
        password: this.config.password,
        client_id: this.config.clientId
      };

      const response = await axios.post(
        'https://iam.viessmann-climatesolutions.com/idp/v3/token',
        new URLSearchParams(params),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')
          }
        }
      );

      this.token = response.data;
      this.tokenExpiry = new Date(Date.now() + this.token!.expires_in * 1000);
      this.updateAuthHeader();
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Authentication failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
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
    if (!this.config.clientSecret) {
      throw new Error('Client secret is required for token refresh');
    }

    try {
      const params: Record<string, string> = {
        grant_type: 'refresh_token',
        refresh_token: this.token.refresh_token,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      };

      const response = await axios.post(
        'https://iam.viessmann-climatesolutions.com/idp/v3/token',
        new URLSearchParams(params),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.token = response.data;
      this.tokenExpiry = new Date(Date.now() + this.token!.expires_in * 1000);
      this.updateAuthHeader();

      // Save refreshed token
      if (this.token) {
        await this.tokenStorage.saveToken(this.token);
      }
    } catch (error: any) {
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
  async getInstallations(includeGateways = false): Promise<any> {
    await this.ensureAuthenticated();
    const params = includeGateways ? { includeGateways: 'true' } : {};
    const response = await this.axiosInstance.get('/iot/v2/equipment/installations', { params });
    return response.data;
  }

  /**
   * Get specific installation by ID
   */
  async getInstallation(installationId: number, includeGateways = true): Promise<any> {
    await this.ensureAuthenticated();
    const params = includeGateways ? { includeGateways: 'true' } : {};
    const response = await this.axiosInstance.get(
      `/iot/v2/equipment/installations/${installationId}`,
      { params }
    );
    return response.data;
  }

  /**
   * Get gateways for an installation
   */
  async getGateways(installationId: number, includeDevices = true): Promise<any> {
    await this.ensureAuthenticated();
    const params = includeDevices ? { includeDevices: 'true' } : {};
    const response = await this.axiosInstance.get(
      `/iot/v2/equipment/installations/${installationId}/gateways`,
      { params }
    );
    return response.data;
  }

  /**
   * Get specific gateway
   */
  async getGateway(installationId: number, gatewaySerial: string): Promise<any> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.get(
      `/iot/v2/equipment/installations/${installationId}/gateways/${gatewaySerial}`
    );
    return response.data;
  }

  /**
   * Get devices for a gateway
   */
  async getDevices(installationId: number, gatewaySerial: string): Promise<any> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.get(
      `/iot/v2/equipment/installations/${installationId}/gateways/${gatewaySerial}/devices`
    );
    return response.data;
  }

  /**
   * Get gateway status
   */
  async getGatewayStatus(installationId: number, gatewaySerial: string): Promise<any> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.get(
      `/iot/v2/equipment/installations/${installationId}/gateways/${gatewaySerial}/status`
    );
    return response.data;
  }

  /**
   * Get installation status
   */
  async getInstallationStatus(installationId: number): Promise<any> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.get(
      `/iot/v2/equipment/installations/${installationId}/status`
    );
    return response.data;
  }

  // ============================================
  // FEATURES API - IoT Data & Control
  // ============================================

  /**
   * Get all features for installation (all devices combined)
   */
  async getInstallationFeatures(
    installationId: number,
    options?: {
      regex?: string;
      filter?: string[];
      skipDisabled?: boolean;
    }
  ): Promise<any> {
    await this.ensureAuthenticated();
    const params: any = {};
    if (options?.regex) params.regex = options.regex;
    if (options?.filter) params.filter = options.filter;
    if (options?.skipDisabled) params.skipDisabled = 'true';

    const response = await this.axiosInstance.get(
      `/iot/v2/features/installations/${installationId}/features`,
      { params }
    );
    return response.data;
  }

  /**
   * Get specific feature from installation
   */
  async getInstallationFeature(
    installationId: number,
    featureName: string
  ): Promise<any> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.get(
      `/iot/v2/features/installations/${installationId}/features/${featureName}`
    );
    return response.data;
  }

  /**
   * Get all features for a gateway (includes all devices on gateway)
   */
  async getGatewayFeatures(
    installationId: number,
    gatewaySerial: string,
    options?: {
      regex?: string;
      filter?: string[];
      skipDisabled?: boolean;
      includeDevicesFeatures?: boolean;
    }
  ): Promise<any> {
    await this.ensureAuthenticated();
    const params: any = {};
    if (options?.regex) params.regex = options.regex;
    if (options?.filter) params.filter = options.filter;
    if (options?.skipDisabled) params.skipDisabled = 'true';
    if (options?.includeDevicesFeatures) params.includeDevicesFeatures = 'true';

    const response = await this.axiosInstance.get(
      `/iot/v2/features/installations/${installationId}/gateways/${gatewaySerial}/features`,
      { params }
    );
    return response.data;
  }

  /**
   * Get specific feature from gateway
   */
  async getGatewayFeature(
    installationId: number,
    gatewaySerial: string,
    featureName: string
  ): Promise<any> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.get(
      `/iot/v2/features/installations/${installationId}/gateways/${gatewaySerial}/features/${featureName}`
    );
    return response.data;
  }

  /**
   * Execute command on gateway feature
   */
  async executeGatewayFeatureCommand(
    installationId: number,
    gatewaySerial: string,
    featureName: string,
    commandName: string,
    data?: any
  ): Promise<any> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.post(
      `/iot/v2/features/installations/${installationId}/gateways/${gatewaySerial}/features/${featureName}/commands/${commandName}`,
      data || {}
    );
    return response.data;
  }

  /**
   * Get all features for a specific device
   */
  async getDeviceFeatures(
    installationId: number,
    gatewaySerial: string,
    deviceId: string,
    options?: {
      regex?: string;
      filter?: string[];
      skipDisabled?: boolean;
    }
  ): Promise<any> {
    await this.ensureAuthenticated();
    const params: any = {};
    if (options?.regex) params.regex = options.regex;
    if (options?.filter) params.filter = options.filter;
    if (options?.skipDisabled) params.skipDisabled = 'true';

    const response = await this.axiosInstance.get(
      `/iot/v2/features/installations/${installationId}/gateways/${gatewaySerial}/devices/${deviceId}/features`,
      { params }
    );
    return response.data;
  }

  /**
   * Get specific feature from device
   */
  async getDeviceFeature(
    installationId: number,
    gatewaySerial: string,
    deviceId: string,
    featureName: string
  ): Promise<any> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.get(
      `/iot/v2/features/installations/${installationId}/gateways/${gatewaySerial}/devices/${deviceId}/features/${featureName}`
    );
    return response.data;
  }

  /**
   * Execute command on device feature
   */
  async executeDeviceFeatureCommand(
    installationId: number,
    gatewaySerial: string,
    deviceId: string,
    featureName: string,
    commandName: string,
    data?: any
  ): Promise<any> {
    await this.ensureAuthenticated();
    const response = await this.axiosInstance.post(
      `/iot/v2/features/installations/${installationId}/gateways/${gatewaySerial}/devices/${deviceId}/features/${featureName}/commands/${commandName}`,
      data || {}
    );
    return response.data;
  }

  // ============================================
  // CONVENIENCE METHODS - Common Operations
  // ============================================

  /**
   * Get current heating temperature
   */
  async getHeatingTemperature(
    installationId: number,
    gatewaySerial: string,
    deviceId: string
  ): Promise<number> {
    const feature = await this.getDeviceFeature(
      installationId,
      gatewaySerial,
      deviceId,
      'heating.circuits.0.operating.programs.active'
    );
    return feature.data?.properties?.value?.value;
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
    await this.executeDeviceFeatureCommand(
      installationId,
      gatewaySerial,
      deviceId,
      'heating.circuits.0.operating.programs.comfort',
      'setTemperature',
      { temperature }
    );
  }
}
