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
        'https://iam.viessmann.com/idp/v3/token',
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
        'https://iam.viessmann.com/idp/v3/token',
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
        'https://iam.viessmann.com/idp/v3/token',
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
