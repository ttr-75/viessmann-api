# Viessmann API Client

Ein Node.js TypeScript Client für die Viessmann API zur Steuerung und Überwachung von Viessmann Wärmepumpen.

## Features

✅ **Vollständiger OAuth2 Authorization Code Flow mit PKCE**
✅ **Automatische Token-Verwaltung** (Speichern, Laden, Erneuern)
✅ **Browser-basierte Authentifizierung** - kein manuelles Token-Handling
✅ **Lokaler Callback-Server** für OAuth-Redirect
✅ **TypeScript Support** mit vollständigen Type Definitions
✅ **Einfache API** für alle Viessmann IoT Endpoints

## Installation

Installieren Sie die erforderlichen Abhängigkeiten:

```bash
npm install
```

## Voraussetzungen

- Node.js (v16 oder höher)
- Ein Viessmann Developer Account mit Client ID
- Viessmann Wärmepumpe mit IoT-Anbindung

## Viessmann Developer Account

1. Registrieren Sie sich unter https://developer.viessmann.com/
2. Erstellen Sie eine neue Applikation
3. Konfigurieren Sie die Redirect URI: `http://localhost:4200/`
4. Notieren Sie sich die Client ID

## Schnellstart

### Einfache Authentifizierung mit Browser

Die einfachste Methode - der Browser öffnet sich automatisch für den Login:

```typescript
import { ViessmannClient } from './src/client';

const client = new ViessmannClient({
  clientId: 'YOUR_CLIENT_ID'
});

// Browser öffnet sich automatisch, Token wird gespeichert
await client.authenticateWithBrowser();

// Jetzt können Sie die API verwenden
const installations = await client.getInstallations();
console.log(installations);
```

**Beispiel ausführen:**
```bash
npm run auth
```

Beim ersten Aufruf:
1. 🌐 Browser öffnet sich automatisch
2. 🔐 Sie loggen sich mit Ihren Viessmann-Credentials ein
3. ✅ Token wird automatisch gespeichert in `.viessmann-token.json`
4. 📡 API-Aufrufe funktionieren sofort

Bei weiteren Aufrufen:
- ✅ Verwendet automatisch den gespeicherten Token
- ✅ Kein erneuter Login nötig
- 🔄 Token wird automatisch erneuert wenn abgelaufen

## Verwendung

### Basis-Konfiguration

```typescript
import { ViessmannClient } from './src/client';

// Nur Client ID erforderlich für OAuth2 Flow
const client = new ViessmannClient({
  clientId: 'YOUR_CLIENT_ID'
});

// ODER: Mit vorhandenem Access Token
const client = new ViessmannClient({
  clientId: 'YOUR_CLIENT_ID',
  accessToken: 'YOUR_ACCESS_TOKEN',
  refreshToken: 'YOUR_REFRESH_TOKEN' // Optional
});
```

### Authentifizierung

#### Option 1: Browser-basiert (Empfohlen)

```typescript
// Vollautomatisch - Browser öffnet sich, Token wird gespeichert
await client.authenticateWithBrowser();
```

#### Option 2: Mit vorhandenem Token

```typescript
// Token direkt im Constructor übergeben
const client = new ViessmannClient({
  clientId: 'YOUR_CLIENT_ID',
  accessToken: 'YOUR_ACCESS_TOKEN'
});
```

### Installationen abrufen

```typescript
// Alle Installationen abrufen
const installations = await client.getInstallations();
console.log(installations);

// Einzelne Installation abrufen
const installation = await client.getInstallation(installationId);
```

### Device Features abrufen

```typescript
// Alle Features eines Geräts abrufen
const features = await client.getFeatures(
  installationId,
  gatewaySerial,
  deviceId
);

// Einzelnes Feature abrufen
const feature = await client.getFeature(
  installationId,
  gatewaySerial,
  deviceId,
  'heating.circuits.0.operating.programs.active'
);
```

### Heizungstemperatur

```typescript
// Aktuelle Temperatur abrufen
const temperature = await client.getHeatingTemperature(
  installationId,
  gatewaySerial,
  deviceId
);

// Temperatur setzen
await client.setHeatingTemperature(
  installationId,
  gatewaySerial,
  deviceId,
  22.0
);
```

### Befehle ausführen

```typescript
// Allgemeine Befehlsausführung
await client.executeCommand(
  installationId,
  gatewaySerial,
  deviceId,
  'heating.circuits.0.operating.programs.comfort',
  'setTemperature',
  { temperature: 22.0 }
);
```

## Vollständiges Beispiel

```typescript
import { ViessmannClient } from './src/client';

async function main() {
  const client = new ViessmannClient({
    clientId: 'YOUR_CLIENT_ID'
  });

  try {
    // Authentifizieren (Browser öffnet sich beim ersten Mal)
    await client.authenticateWithBrowser();

    // Installationen abrufen
    const installations = await client.getInstallations();
    const installation = installations[0];
    
    console.log(`Installation: ${installation.description}`);
    console.log(`Adresse: ${installation.address.city}`);

    // Features abrufen (falls Gateways vorhanden)
    if (installation.gateways?.[0]?.devices?.[0]) {
      const gateway = installation.gateways[0];
      const device = gateway.devices[0];

      const features = await client.getFeatures(
        installation.id,
        gateway.serial,
        device.id
      );

      console.log(`${features.length} Features gefunden`);

      // Heizungs-Features anzeigen
      const heatingFeatures = features.filter(f => 
        f.feature.includes('heating') && f.properties.value
      );

      heatingFeatures.forEach(feature => {
        const value = feature.properties.value;
        console.log(`${feature.feature}: ${value?.value}${value?.unit || ''}`);
      });
    }
  } catch (error) {
    console.error('Fehler:', error);
  }
}

main();
```

## Build & Scripts

```bash
# TypeScript kompilieren
npm run build

# Test ausführen (mit vorhandenem Token)
npm test

# OAuth2 Authentifizierung mit Browser
npm run auth

# Watch-Modus für Entwicklung
npm run watch
```

## Token-Verwaltung

### Automatische Token-Speicherung

Tokens werden automatisch in `.viessmann-token.json` gespeichert:

```typescript
await client.authenticateWithBrowser(); // Token wird automatisch gespeichert
```

### Manuelles Token-Management

```typescript
import { TokenStorage } from './src/storage';

const storage = new TokenStorage();

// Token speichern
await storage.saveToken(token);

// Token laden
const token = await storage.loadToken();

// Token löschen
await storage.deleteToken();

// Prüfen ob Token abgelaufen ist
const isExpired = storage.isTokenExpired(token);
```

## API Referenz

### ViessmannClient

#### Constructor

```typescript
new ViessmannClient(config: ViessmannConfig)
```

**ViessmannConfig:**
- `clientId` (required): Client ID aus dem Viessmann Developer Portal
- `clientSecret` (optional): Client Secret (nur für Password Grant)
- `username` (optional): Viessmann Benutzername (nur für Password Grant)
- `password` (optional): Viessmann Passwort (nur für Password Grant)
- `accessToken` (optional): Vorhandener Access Token
- `refreshToken` (optional): Vorhandener Refresh Token
- `apiUrl` (optional): API Basis-URL (Standard: https://api.viessmann.com)

#### Methoden

**Authentifizierung:**
- `authenticateWithBrowser()`: OAuth2 Flow mit Browser (empfohlen)
- `authenticate()`: OAuth2 Password Grant (deprecated)
- `refreshToken()`: Aktualisiert den Access Token

**Installationen:**
- `getInstallations()`: Ruft alle Installationen ab
- `getInstallation(installationId)`: Ruft eine spezifische Installation ab

**Features:**
- `getFeatures(installationId, gatewaySerial, deviceId)`: Ruft alle Features ab
- `getFeature(installationId, gatewaySerial, deviceId, featureName)`: Ruft ein spezifisches Feature ab

**Befehle:**
- `executeCommand(installationId, gatewaySerial, deviceId, featureName, command, data?)`: Führt einen Befehl aus

**Convenience-Methoden:**
- `getHeatingTemperature(installationId, gatewaySerial, deviceId)`: Ruft aktuelle Heiztemperatur ab
- `setHeatingTemperature(installationId, gatewaySerial, deviceId, temperature)`: Setzt die Heiztemperatur

### TokenStorage

```typescript
const storage = new TokenStorage(tokenPath?: string);

await storage.saveToken(token: AuthToken): Promise<void>
await storage.loadToken(): Promise<StoredToken | null>
await storage.hasToken(): Promise<boolean>
await storage.deleteToken(): Promise<void>
storage.isTokenExpired(token: StoredToken): boolean
```

## Projektstruktur

```
viessmann-api/
├── src/
│   ├── client.ts      # Haupt-API-Client
│   ├── oauth.ts       # OAuth2 Helper (PKCE, Callback-Server)
│   ├── storage.ts     # Token-Speicherung
│   ├── types.ts       # TypeScript Interfaces
│   └── index.ts       # Module Exports
├── auth-example.ts    # Beispiel für OAuth2 Authentifizierung
├── test.ts           # Test-Script
├── package.json
├── tsconfig.json
└── README.md
```

## Sicherheitshinweise

- ✅ `.viessmann-token.json` ist in `.gitignore` und wird nicht committed
- ✅ `.env` Datei ist in `.gitignore` und wird nicht committed
- ✅ Verwenden Sie NIEMALS Ihre Credentials direkt im Code
- ✅ Verwenden Sie Umgebungsvariablen für sensitive Daten
- ✅ Der OAuth2 Flow mit PKCE ist sicherer als Password Grant

## Fehlerbehebung

### Browser öffnet sich nicht automatisch

Falls der Browser nicht automatisch öffnet, kopieren Sie die angezeigte URL und öffnen Sie sie manuell:

```
🌐 Opening browser for authentication...
   If the browser doesn't open, visit this URL:
   https://iam.viessmann.com/idp/v3/authorize?client_id=...
```

### Token abgelaufen

Tokens werden automatisch erneuert. Falls ein Fehler auftritt:

```bash
# Token-Datei löschen und neu authentifizieren
rm .viessmann-token.json
npm run auth
```

### Port 4200 bereits belegt

Der OAuth-Callback läuft auf Port 4200. Falls dieser Port belegt ist, müssen Sie:
1. Den Port im Code ändern (`src/client.ts`: `private redirectUri`)
2. Die Redirect URI im Viessmann Developer Portal anpassen

## Lizenz

MIT

## Hinweise

Dieses Projekt ist ein inoffizieller Client und steht in keiner Verbindung zu Viessmann. Die Nutzung erfolgt auf eigene Verantwortung.

## Links

- Viessmann Developer Portal: https://developer.viessmann.com/
- API Dokumentation: https://api.viessmann-climatesolutions.com/documentation
- GitHub Repository: https://github.com/ttr-75/viessmann-api
