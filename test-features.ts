import { ViessmannClient } from './src/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function main() {
  const client = new ViessmannClient({
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET,
  });

  try {
    // Authenticate
    await client.authenticateWithBrowser();
    
    // Diese Werte aus dem vorherigen explore-v2 Ergebnis
    const installationId = 2983348;
    const gatewaySerial = '7952592029011257';
    const deviceId = '0'; // Die Wärmepumpe (E3_Vitocal)
    
    console.log('=== Features testen ===\n');
    
    // 1. Alle Features der Installation abrufen (kann sehr groß sein!)
    console.log('1. Installation Features (gefiltert nach heating)...');
    const installationFeatures = await client.getInstallationFeatures(installationId, {
      filter: ['heating.*'],
      skipDisabled: true
    });
    console.log(`   Gefunden: ${installationFeatures.data?.length || 0} Features`);
    fs.writeFileSync('features-installation.json', JSON.stringify(installationFeatures, null, 2));
    console.log('   Gespeichert in: features-installation.json\n');
    
    // 2. Gateway Features abrufen (mit allen Devices)
    console.log('2. Gateway Features (alle Geräte)...');
    const gatewayFeatures = await client.getGatewayFeatures(installationId, gatewaySerial, {
      includeDevicesFeatures: true,
      skipDisabled: true
    });
    console.log(`   Gefunden: ${gatewayFeatures.data?.length || 0} Features`);
    fs.writeFileSync('features-gateway.json', JSON.stringify(gatewayFeatures, null, 2));
    console.log('   Gespeichert in: features-gateway.json\n');
    
    // 3. Device Features abrufen (nur Wärmepumpe)
    console.log('3. Device Features (Wärmepumpe)...');
    const deviceFeatures = await client.getDeviceFeatures(installationId, gatewaySerial, deviceId, {
      skipDisabled: true
    });
    console.log(`   Gefunden: ${deviceFeatures.data?.length || 0} Features`);
    fs.writeFileSync('features-device.json', JSON.stringify(deviceFeatures, null, 2));
    console.log('   Gespeichert in: features-device.json\n');
    
    // 4. Interessante Features ausgeben
    console.log('=== Interessante Features ===\n');
    
    if (deviceFeatures.data) {
      // Kategorisiere Features
      const categories: { [key: string]: any[] } = {};
      
      deviceFeatures.data.forEach((feature: any) => {
        const category = feature.feature.split('.')[0];
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(feature);
      });
      
      // Zeige Kategorien
      Object.keys(categories).sort().forEach(category => {
        console.log(`\n📁 ${category.toUpperCase()} (${categories[category].length} Features)`);
        
        // Zeige erste 5 Features jeder Kategorie
        categories[category].slice(0, 5).forEach((feature: any) => {
          const value = feature.properties?.value?.value;
          const unit = feature.properties?.value?.unit;
          const status = feature.properties?.status?.value;
          
          console.log(`   - ${feature.feature}`);
          if (value !== undefined) console.log(`     Wert: ${value} ${unit || ''}`);
          if (status !== undefined) console.log(`     Status: ${status}`);
          if (feature.commands && feature.commands.length > 0) {
            console.log(`     Commands: ${feature.commands.join(', ')}`);
          }
        });
        
        if (categories[category].length > 5) {
          console.log(`   ... und ${categories[category].length - 5} weitere`);
        }
      });
    }
    
    // 5. Teste ein spezifisches Feature
    console.log('\n\n=== Spezifisches Feature testen ===\n');
    
    // Beispiel: Außentemperatur
    try {
      const outsideTemp = await client.getDeviceFeature(
        installationId,
        gatewaySerial,
        deviceId,
        'heating.sensors.temperature.outside'
      );
      console.log('Außentemperatur:');
      console.log(JSON.stringify(outsideTemp, null, 2));
    } catch (error: any) {
      console.log('Außentemperatur nicht verfügbar:', error.response?.status);
    }
    
    console.log('\n✅ Features erfolgreich abgerufen!');
    console.log('\n💡 Tipp: Schaue in die JSON-Dateien für alle Details');
    console.log('   - features-installation.json');
    console.log('   - features-gateway.json');
    console.log('   - features-device.json');
    
  } catch (error: any) {
    console.error('Fehler:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
