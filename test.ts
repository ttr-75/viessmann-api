import { ViessmannClient } from './src/client';
import * as dotenv from 'dotenv';

// Lade Umgebungsvariablen aus .env Datei
dotenv.config();

async function testViessmannClient() {
  console.log('🔧 Viessmann API Client Test\n');

  // Client mit Access Token initialisieren
  const client = new ViessmannClient({
    clientId: process.env.VIESSMANN_CLIENT_ID!,
    clientSecret: process.env.VIESSMANN_CLIENT_SECRET,
    accessToken: process.env.VIESSMANN_ACCESS_TOKEN,
    username: process.env.VIESSMANN_USERNAME,
    password: process.env.VIESSMANN_PASSWORD
  });

  try {
    // Wenn kein Access Token vorhanden, authentifizieren
    if (!process.env.VIESSMANN_ACCESS_TOKEN) {
      console.log('1️⃣ Authentifizierung...');
      await client.authenticate();
      console.log('✅ Erfolgreich authentifiziert\n');
    } else {
      console.log('1️⃣ Verwende vorhandenen Access Token\n');
    }

    // 2. Installationen abrufen
    console.log('2️⃣ Installationen abrufen...');
    const installations = await client.getInstallations();
    console.log(`✅ ${installations.length} Installation(en) gefunden:`);
    
    installations.forEach((installation, index) => {
      console.log(`\n📍 Installation ${index + 1}:`);
      console.log(`   ID: ${installation.id}`);
      console.log(`   Beschreibung: ${installation.description}`);
      console.log(`   Adresse: ${installation.address.street}, ${installation.address.postalCode} ${installation.address.city}`);
      console.log(`   Gateways: ${installation.gateways?.length || 0}`);
      
      if (!installation.gateways || installation.gateways.length === 0) {
        console.log('   ⚠️  Keine Gateways gefunden');
        return;
      }
      
      installation.gateways.forEach((gateway, gIndex) => {
        console.log(`\n   🔌 Gateway ${gIndex + 1}:`);
        console.log(`      Serial: ${gateway.serial}`);
        console.log(`      Version: ${gateway.version}`);
        console.log(`      Geräte: ${gateway.devices.length}`);
        
        gateway.devices.forEach((device, dIndex) => {
          console.log(`\n      🌡️  Gerät ${dIndex + 1}:`);
          console.log(`         ID: ${device.id}`);
          console.log(`         Serial: ${device.boilerSerial}`);
          console.log(`         Model: ${device.modelId}`);
          console.log(`         Status: ${device.status}`);
        });
      });
    });

    // 3. Features des ersten Geräts abrufen (falls vorhanden)
    if (installations.length > 0 && installations[0].gateways?.length > 0 && installations[0].gateways[0].devices?.length > 0) {
      const installation = installations[0];
      const gateway = installation.gateways[0];
      const device = gateway.devices[0];

      console.log('\n\n3️⃣ Features abrufen...');
      const features = await client.getFeatures(
        installation.id,
        gateway.serial,
        device.id
      );
      
      console.log(`✅ ${features.length} Features gefunden\n`);
      
      // Zeige die ersten 10 Features
      const displayFeatures = features.slice(0, 10);
      displayFeatures.forEach((feature, index) => {
        console.log(`\n   Feature ${index + 1}: ${feature.feature}`);
        console.log(`   Status: ${feature.isEnabled ? '✅ Aktiviert' : '❌ Deaktiviert'} | ${feature.isReady ? '✅ Bereit' : '⏳ Nicht bereit'}`);
        
        if (feature.properties.value) {
          const value = feature.properties.value;
          console.log(`   Wert: ${value.value}${value.unit ? ' ' + value.unit : ''} (${value.type})`);
        }
        
        if (feature.commands && feature.commands.length > 0) {
          console.log(`   Befehle: ${feature.commands.join(', ')}`);
        }
      });

      if (features.length > 10) {
        console.log(`\n   ... und ${features.length - 10} weitere Features`);
      }

      // 4. Spezifisches Feature abrufen (Beispiel: Heizkreis Temperatur)
      console.log('\n\n4️⃣ Heizkreis-Features suchen...');
      const heatingFeatures = features.filter(f => 
        f.feature.includes('heating.circuits')
      );
      
      if (heatingFeatures.length > 0) {
        console.log(`✅ ${heatingFeatures.length} Heizkreis-Features gefunden:`);
        heatingFeatures.slice(0, 5).forEach(feature => {
          console.log(`\n   🔥 ${feature.feature}`);
          if (feature.properties.value) {
            const value = feature.properties.value;
            console.log(`      Wert: ${value.value}${value.unit ? ' ' + value.unit : ''}`);
          }
        });
      } else {
        console.log('ℹ️  Keine Heizkreis-Features gefunden');
      }
    }

    console.log('\n\n✅ Test erfolgreich abgeschlossen!');

  } catch (error) {
    console.error('\n❌ Fehler beim Test:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
    }
  }
}

// Test ausführen
testViessmannClient();
