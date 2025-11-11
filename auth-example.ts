import { ViessmannClient } from "./src/client";
import { ViessmannConfig, AuthToken, Installation, Feature } from "./src/types";
import * as dotenv from "dotenv";
import * as path from "path";

/**
 * Beispiel: OAuth2 Authentifizierung mit Browser
 * 
 * Dieses Script zeigt, wie Sie den vollständigen OAuth2 Flow verwenden:
 * 1. Browser wird automatisch geöffnet
 * 2. Sie loggen sich bei Viessmann ein
 * 3. Token wird automatisch gespeichert
 * 4. Bei erneutem Aufruf wird der gespeicherte Token verwendet
 * 5. Abgelaufene Tokens werden automatisch erneuert
 */

async function main() {
  console.log('🏠 Viessmann API Client - OAuth2 Beispiel\n');

  // Client initialisieren (nur Client ID erforderlich)
	dotenv.config({ path: path.resolve(process.cwd(), ".env") });

	const clientId = process.env.VIESSMANN_CLIENT_ID;
	if (!clientId) {
		console.error(
			"Missing CLIENT_ID in .env (set VIESSMANN_CLIENT_ID or CLIENT_ID).",
		);
		process.exit(1);
	}

  const client = new ViessmannClient({
		clientId,
  });

  try {
    // Authentifizierung mit Browser
    // Beim ersten Aufruf: Browser öffnet sich für Login
    // Bei weiteren Aufrufen: Verwendet gespeicherten Token
    await client.authenticateWithBrowser();

    // Jetzt können Sie die API verwenden
    console.log('📡 Lade Installationen...\n');
    const installations = await client.getInstallations();

    console.log(`✅ ${installations.length} Installation(en) gefunden:\n`);
    
    installations.forEach((installation, index) => {
      console.log(`📍 Installation ${index + 1}:`);
      console.log(`   ID: ${installation.id}`);
      console.log(`   Beschreibung: ${installation.description}`);
      console.log(`   Adresse: ${installation.address.street}, ${installation.address.postalCode} ${installation.address.city}`);
      console.log(`   Gateways: ${installation.gateways?.length || 0}\n`);
    });

    // Beispiel: Features abrufen (falls vorhanden)
    if (installations[0]?.gateways?.[0]?.devices?.[0]) {
      const installation = installations[0];
      const gateway = installation.gateways[0];
      const device = gateway.devices[0];

      console.log('📊 Lade Features...\n');
      const features = await client.getFeatures(
        installation.id,
        gateway.serial,
        device.id
      );

      console.log(`✅ ${features.length} Features gefunden`);
      
      // Zeige einige interessante Features
      const heatingFeatures = features.filter(f => 
        f.feature.includes('heating') && f.properties.value
      ).slice(0, 5);

      if (heatingFeatures.length > 0) {
        console.log('\n🔥 Heizungs-Features:');
        heatingFeatures.forEach(feature => {
          const value = feature.properties.value;
          console.log(`   ${feature.feature}: ${value?.value}${value?.unit || ''}`);
        });
      }
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  }
}

main();
