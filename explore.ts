import { ViessmannClient } from "./src/client";
import * as dotenv from "dotenv";
import * as path from "path";

/**
 * Erkunde deine Viessmann Installation
 * Zeigt alle verfügbaren Gateways und Geräte
 */

async function exploreInstallation() {
	dotenv.config({ path: path.resolve(process.cwd(), ".env") });

	const clientId = process.env.VIESSMANN_CLIENT_ID;
	if (!clientId) {
		console.error(
			"Missing CLIENT_ID in .env (set VIESSMANN_CLIENT_ID or CLIENT_ID).",
		);
		process.exit(1);
	}

  const client = new ViessmannClient({
		clientId: clientId,
  });

  try {
    console.log('🔐 Authentifizierung...\n');
    await client.authenticateWithBrowser();

    console.log('📡 Lade Installation-Details...\n');
    const installations = await client.getInstallations();

    if (installations.length === 0) {
      console.log('❌ Keine Installationen gefunden');
      return;
    }

    for (const installation of installations) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 Installation: ${installation.description}`);
      console.log(`   ID: ${installation.id}`);
      console.log(`   Adresse: ${installation.address.street}, ${installation.address.postalCode} ${installation.address.city}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Detaillierte Installation abrufen
      const detailedInstallation = await client.getInstallation(installation.id);
      
      console.log('🔍 Vollständige Installation-Daten:');
      console.log(JSON.stringify(detailedInstallation, null, 2));
      console.log('\n');

      // Gateways prüfen
      if (!detailedInstallation.gateways || detailedInstallation.gateways.length === 0) {
        console.log('⚠️  Keine Gateways in dieser Installation gefunden\n');
        console.log('💡 Mögliche Gründe:');
        console.log('   - Die Wärmepumpe ist noch nicht mit dem Viessmann IoT verbunden');
        console.log('   - Die Installation ist noch nicht vollständig eingerichtet');
        console.log('   - Die API-Berechtigung ist eingeschränkt\n');
        continue;
      }

      // Gateways durchgehen
      for (const gateway of detailedInstallation.gateways) {
        console.log(`🔌 Gateway: ${gateway.serial}`);
        console.log(`   Version: ${gateway.version}`);
        console.log(`   Geräte: ${gateway.devices?.length || 0}\n`);

        if (!gateway.devices || gateway.devices.length === 0) {
          console.log('   ⚠️  Keine Geräte an diesem Gateway\n');
          continue;
        }

        // Geräte durchgehen
        for (const device of gateway.devices) {
          console.log(`   🌡️  Gerät: ${device.id}`);
          console.log(`      Model: ${device.modelId}`);
          console.log(`      Serial: ${device.boilerSerial}`);
          console.log(`      Status: ${device.status}\n`);

          // Features abrufen
          try {
            console.log('      📊 Lade Features...');
            const features = await client.getFeatures(
              installation.id,
              gateway.serial,
              device.id
            );

            console.log(`      ✅ ${features.length} Features gefunden\n`);

            // Kategorisiere Features
            const categories = {
              heating: features.filter(f => f.feature.includes('heating')),
              dhw: features.filter(f => f.feature.includes('dhw')), // Domestic Hot Water
              sensors: features.filter(f => f.feature.includes('sensors')),
              operating: features.filter(f => f.feature.includes('operating')),
              temperature: features.filter(f => f.feature.includes('temperature'))
            };

            // Zeige Heizungs-Features
            if (categories.heating.length > 0) {
              console.log('      🔥 Heizungs-Features:');
              categories.heating.slice(0, 10).forEach(feature => {
                const value = feature.properties.value;
                if (value) {
                  console.log(`         ${feature.feature}`);
                  console.log(`            Wert: ${value.value}${value.unit ? ' ' + value.unit : ''} (${value.type})`);
                  if (feature.commands && feature.commands.length > 0) {
                    console.log(`            Befehle: ${feature.commands.join(', ')}`);
                  }
                } else {
                  console.log(`         ${feature.feature} (kein Wert)`);
                }
              });
              console.log('');
            }

            // Zeige Warmwasser-Features
            if (categories.dhw.length > 0) {
              console.log('      💧 Warmwasser-Features:');
              categories.dhw.slice(0, 5).forEach(feature => {
                const value = feature.properties.value;
                if (value) {
                  console.log(`         ${feature.feature}: ${value.value}${value.unit ? ' ' + value.unit : ''}`);
                }
              });
              console.log('');
            }

            // Zeige Temperatur-Sensoren
            if (categories.sensors.length > 0) {
              console.log('      🌡️  Sensoren:');
              categories.sensors.slice(0, 5).forEach(feature => {
                const value = feature.properties.value;
                if (value) {
                  console.log(`         ${feature.feature}: ${value.value}${value.unit ? ' ' + value.unit : ''}`);
                }
              });
              console.log('');
            }

            // Speichere alle Features in eine Datei zur Analyse
            const fs = require('fs');
            const filename = `features-${installation.id}-${gateway.serial}-${device.id}.json`;
            fs.writeFileSync(filename, JSON.stringify(features, null, 2));
            console.log(`      💾 Alle Features gespeichert in: ${filename}\n`);

          } catch (error) {
            console.log(`      ❌ Fehler beim Laden der Features: ${error}\n`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

exploreInstallation();
