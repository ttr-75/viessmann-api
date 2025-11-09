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
    // Authenticate with browser (uses saved token if valid)
    await client.authenticateWithBrowser();
    
    console.log('Lade Installationen...\n');
    
    // Installations mit Gateways abrufen
    const installations = await client.getInstallations(true);
    console.log('Installationen:', JSON.stringify(installations, null, 2));
    
    if (installations.data && installations.data.length > 0) {
      const installation = installations.data[0];
      const installationId = installation.id;
      
      console.log(`\n=== Installation ${installationId}: ${installation.description} ===\n`);
      
      // Gateways für diese Installation abrufen
      console.log('Lade Gateways...\n');
      const gateways = await client.getGateways(installationId, true);
      console.log('Gateways:', JSON.stringify(gateways, null, 2));
      
      // Speichere vollständige Daten
      fs.writeFileSync(
        'installation-complete.json',
        JSON.stringify({ installation, gateways }, null, 2)
      );
      console.log('\n✓ Daten gespeichert in installation-complete.json');
      
      // Für jedes Gateway die Devices und Status abrufen
      if (gateways.data && gateways.data.length > 0) {
        for (const gateway of gateways.data) {
          console.log(`\n--- Gateway ${gateway.serial} ---`);
          
          // Gateway Details
          const gatewayDetail = await client.getGateway(installationId, gateway.serial);
          console.log('Gateway Details:', JSON.stringify(gatewayDetail, null, 2));
          
          // Devices
          const devices = await client.getDevices(installationId, gateway.serial);
          console.log('Devices:', JSON.stringify(devices, null, 2));
          
          // Gateway Status
          const status = await client.getGatewayStatus(installationId, gateway.serial);
          console.log('Gateway Status:', JSON.stringify(status, null, 2));
          
          // Speichere Gateway-spezifische Daten
          fs.writeFileSync(
            `gateway-${gateway.serial}.json`,
            JSON.stringify({ gateway: gatewayDetail, devices, status }, null, 2)
          );
          console.log(`✓ Gateway-Daten gespeichert in gateway-${gateway.serial}.json`);
        }
      } else {
        console.log('\n⚠️  Keine Gateways gefunden für diese Installation.');
        console.log('Mögliche Gründe:');
        console.log('- Gateway ist nicht mit der Installation verbunden');
        console.log('- Gateway ist noch nicht registriert');
        console.log('- Gateway hat keine Internetverbindung');
      }
      
      // Installation Status
      console.log('\nLade Installation Status...');
      const installationStatus = await client.getInstallationStatus(installationId);
      console.log('Installation Status:', JSON.stringify(installationStatus, null, 2));
      
    } else {
      console.log('Keine Installationen gefunden.');
    }
    
  } catch (error: any) {
    console.error('Fehler:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
  }
}

main();
