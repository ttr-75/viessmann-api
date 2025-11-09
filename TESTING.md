# Viessmann API Client - Test & Verwendung

## Problem: OAuth2 Authorization Code Flow

Die Viessmann API verwendet den **Authorization Code Flow** statt Password Grant. Das bedeutet:

1. Sie müssen sich über einen Browser einloggen
2. Sie erhalten einen Authorization Code
3. Dieser Code wird gegen ein Access Token getauscht

## Manuelle Test-Schritte

### 1. Authorization Code erhalten

Öffnen Sie diese URL im Browser (ersetzen Sie `YOUR_CLIENT_ID` und `YOUR_REDIRECT_URI`):

```
https://iam.viessmann.com/idp/v3/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=IoT%20User%20offline_access&code_challenge=2e21faa1-db2c-4d0b-a10f-575fd372bc8c-575fd372bc8c&code_challenge_method=plain
```

Nach dem Login werden Sie zu Ihrer Redirect URI weitergeleitet mit einem `code` Parameter:
```
https://your-redirect-uri?code=AUTHORIZATION_CODE_HERE
```

### 2. Token aus Code erhalten

Mit diesem Code können Sie ein Access Token erhalten:

```bash
curl -X POST "https://iam.viessmann.com/idp/v3/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTHORIZATION_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "redirect_uri=YOUR_REDIRECT_URI" \
  -d "code_verifier=2e21faa1-db2c-4d0b-a10f-575fd372bc8c-575fd372bc8c"
```

### 3. Access Token verwenden

Speichern Sie das Access Token in Ihrer `.env` Datei:

```
VIESSMANN_ACCESS_TOKEN=eyJhbGc...
```

## Vereinfachter Test mit bestehendem Token

Erstellen Sie eine `test-with-token.ts`:

```typescript
import { ViessmannClient } from './src/client';
import * as dotenv from 'dotenv';

dotenv.config();

// Token direkt setzen (nachdem Sie es manuell erhalten haben)
const client = new ViessmannClient({
  clientId: process.env.VIESSMANN_CLIENT_ID!,
  clientSecret: process.env.VIESSMANN_CLIENT_SECRET!,
  username: process.env.VIESSMANN_USERNAME!,
  password: process.env.VIESSMANN_PASSWORD!
});

// Token manuell setzen
(client as any).token = {
  access_token: process.env.VIESSMANN_ACCESS_TOKEN!,
  token_type: 'Bearer',
  expires_in: 3600
};
(client as any).updateAuthHeader();

async function test() {
  try {
    const installations = await client.getInstallations();
    console.log('Installationen:', installations);
  } catch (error) {
    console.error('Fehler:', error);
  }
}

test();
```

## Empfehlung: PyViCare als Referenz

Für die korrekte Implementierung des Authorization Code Flow schauen Sie sich das offizielle Python-Projekt an:
https://github.com/somm15/PyViCare

Dies zeigt die vollständige OAuth2-Implementierung mit PKCE (Proof Key for Code Exchange).

## Alternative: Viessmann Developer Portal

1. Gehen Sie zu https://developer.viessmann.com/
2. Erstellen Sie eine Application
3. Konfigurieren Sie die Redirect URI
4. Verwenden Sie den Authorization Code Flow wie dokumentiert

## Credentials überprüfen

Stellen Sie sicher, dass:
- ✅ Client ID korrekt ist
- ✅ Client Secret korrekt ist  
- ✅ Die Application im Developer Portal den richtigen Grant Type unterstützt
- ✅ Die Redirect URI konfiguriert ist
