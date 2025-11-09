export interface ViessmannConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  apiUrl?: string;
}

export interface AuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface Installation {
  id: number;
  description: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  gateways: Gateway[];
}

export interface Gateway {
  serial: string;
  version: string;
  devices: Device[];
}

export interface Device {
  id: string;
  boilerSerial: string;
  modelId: string;
  status: string;
}

export interface Feature {
  feature: string;
  gatewayId: string;
  deviceId: string;
  isEnabled: boolean;
  isReady: boolean;
  properties: {
    value?: {
      type: string;
      value: any;
      unit?: string;
    };
  };
  commands?: string[];
}
