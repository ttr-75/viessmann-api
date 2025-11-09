import * as crypto from 'crypto';
import * as http from 'http';
import { URL } from 'url';

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
}

export interface AuthorizationURLParams {
  clientId: string;
  redirectUri: string;
  scope: string;
  state?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE(): PKCEChallenge {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return {
    codeVerifier,
    codeChallenge
  };
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('base64url');
}

/**
 * Build authorization URL for Viessmann OAuth2
 */
export function buildAuthorizationURL(
  params: AuthorizationURLParams,
  codeChallenge: string
): string {
  const url = new URL('https://iam.viessmann.com/idp/v3/authorize');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', params.scope);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  
  if (params.state) {
    url.searchParams.set('state', params.state);
  }

  return url.toString();
}

/**
 * Start a local HTTP server to receive the OAuth callback
 */
export function startCallbackServer(
  port: number,
  expectedState?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${port}`);
      
      // Check if this is the callback
      if (url.pathname === '/') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>❌ Authentication Error</h1>
                <p>${error}: ${url.searchParams.get('error_description')}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        // Verify state if provided
        if (expectedState && state !== expectedState) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>❌ Security Error</h1>
                <p>State parameter mismatch. Possible CSRF attack.</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          reject(new Error('State mismatch'));
          return;
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>✅ Authentication Successful!</h1>
                <p>You can close this window and return to your application.</p>
                <script>window.close()</script>
              </body>
            </html>
          `);
          server.close();
          resolve(code);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>❌ No Authorization Code</h1>
                <p>No code parameter received.</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          reject(new Error('No code received'));
        }
      }
    });

    server.listen(port, () => {
      console.log(`🔐 Waiting for OAuth callback on http://localhost:${port}/`);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authentication timeout'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Open URL in default browser
 */
export async function openBrowser(url: string): Promise<void> {
  const { default: open } = await import('open');
  await open(url);
}
