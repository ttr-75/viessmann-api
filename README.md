# Viessmann API Client

Ein Node.js TypeScript Client für die Viessmann API zur Steuerung und Überwachung von Viessmann Wärmepumpen.

## Installation

Installieren Sie die erforderlichen Abhängigkeiten:

```bash
npm install
```

## Voraussetzungen

- Node.js (v16 oder höher)
- Ein Viessmann Developer Account mit Client ID und Client Secret
- Viessmann Wärmepumpe mit IoT-Anbindung

## Viessmann Developer Account

1. Registrieren Sie sich unter https://developer.viessmann.com/
2. Erstellen Sie eine neue Applikation
3. Notieren Sie sich Client ID und Client Secret

## Verwendung

### Basis-Konfiguration

```typescript
import { ViessmannClient } from './src/client';

const client = new ViessmannClient({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  username: 'YOUR_VIESSMANN_USERNAME',
  password: 'YOUR_VIESSMANN_PASSWORD'
});
```

### Authentifizierung

```typescript
// Authentifizierung durchführen
await client.authenticate();
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

## Beispiel

```typescript
import { ViessmannClient } from './src/client';

async function main() {
  const client = new ViessmannClient({
    clientId: process.env.VIESSMANN_CLIENT_ID!,
    clientSecret: process.env.VIESSMANN_CLIENT_SECRET!,
    username: process.env.VIESSMANN_USERNAME!,
    password: process.env.VIESSMANN_PASSWORD!
  });

  try {
    // Authentifizieren
    await client.authenticate();

    // Installationen abrufen
    const installations = await client.getInstallations();
    const installation = installations[0];
    
    const gateway = installation.gateways[0];
    const device = gateway.devices[0];

    // Aktuelle Temperatur abrufen
    const temp = await client.getHeatingTemperature(
      installation.id,
      gateway.serial,
      device.id
    );
    console.log(`Aktuelle Temperatur: ${temp}°C`);

    // Temperatur ändern
    await client.setHeatingTemperature(
      installation.id,
      gateway.serial,
      device.id,
      22.0
    );
    console.log('Temperatur auf 22°C gesetzt');
  } catch (error) {
    console.error('Fehler:', error);
  }
}

main();
```

## Build

```bash
npm run build
```

Die kompilierten Dateien befinden sich im `dist/` Verzeichnis.

## API Referenz

### ViessmannClient

#### Constructor

```typescript
new ViessmannClient(config: ViessmannConfig)
```

**ViessmannConfig:**
- `clientId`: Client ID aus dem Viessmann Developer Portal
- `clientSecret`: Client Secret aus dem Viessmann Developer Portal
- `username`: Ihr Viessmann Benutzername
- `password`: Ihr Viessmann Passwort
- `apiUrl` (optional): API Basis-URL (Standard: https://api.viessmann.com)

#### Methoden

- `authenticate()`: Authentifizierung mit OAuth2
- `refreshToken()`: Aktualisiert den Access Token
- `getInstallations()`: Ruft alle Installationen ab
- `getInstallation(installationId)`: Ruft eine spezifische Installation ab
- `getFeatures(installationId, gatewaySerial, deviceId)`: Ruft alle Features ab
- `getFeature(installationId, gatewaySerial, deviceId, featureName)`: Ruft ein spezifisches Feature ab
- `executeCommand(installationId, gatewaySerial, deviceId, featureName, command, data?)`: Führt einen Befehl aus
- `getHeatingTemperature(installationId, gatewaySerial, deviceId)`: Ruft aktuelle Heiztemperatur ab
- `setHeatingTemperature(installationId, gatewaySerial, deviceId, temperature)`: Setzt die Heiztemperatur

## Sicherheitshinweise

- Speichern Sie Ihre Zugangsdaten niemals im Code
- Verwenden Sie Umgebungsvariablen für sensitive Daten
- Erstellen Sie eine `.env` Datei für lokale Entwicklung (nicht in Git committen)

## Lizenz

MIT

## Hinweise

Dieses Projekt ist ein inoffizieller Client und steht in keiner Verbindung zu Viessmann. Die Nutzung erfolgt auf eigene Verantwortung.
