import { ViessmannClient } from './src/client';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const client = new ViessmannClient({
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET,
  });

  try {
    await client.authenticateWithBrowser();
    
    const installationId = 2983348;
    const gatewaySerial = '7952592029011257';
    const deviceId = '0'; // Wärmepumpe
    
    console.log('🏠 === VIESSMANN WÄRMEPUMPE - STATUS ===\n');
    
    // Hilfsfunktion zum sicheren Abrufen von Features
    async function getFeatureSafe(name: string): Promise<any> {
      try {
        const result = await client.getDeviceFeature(installationId, gatewaySerial, deviceId, name);
        return result.data;
      } catch (error) {
        return null;
      }
    }
    
    // ==========================================
    // TEMPERATUREN
    // ==========================================
    console.log('🌡️  TEMPERATUREN');
    console.log('─────────────────────────────────────');
    
    const outsideTemp = await getFeatureSafe('heating.sensors.temperature.outside');
    if (outsideTemp) {
      console.log(`   Außentemperatur:          ${outsideTemp.properties.value.value}°C`);
    }
    
    const supplyTemp = await getFeatureSafe('heating.circuits.0.sensors.temperature.supply');
    if (supplyTemp) {
      console.log(`   Vorlauftemperatur:        ${supplyTemp.properties.value.value}°C`);
    }
    
    const returnTemp = await getFeatureSafe('heating.circuits.0.sensors.temperature.return');
    if (returnTemp?.properties?.value) {
      console.log(`   Rücklauftemperatur:       ${returnTemp.properties.value.value}°C`);
    }
    
    const roomTemp = await getFeatureSafe('heating.circuits.0.sensors.temperature.room');
    if (roomTemp?.properties?.value) {
      console.log(`   Raumtemperatur:           ${roomTemp.properties.value.value}°C`);
    }
    
    const dhwTemp = await getFeatureSafe('heating.dhw.sensors.temperature.hotWaterStorage');
    if (dhwTemp?.properties?.value) {
      console.log(`   Warmwasserspeicher:       ${dhwTemp.properties.value.value}°C`);
    }
    
    const dhwOutlet = await getFeatureSafe('heating.dhw.sensors.temperature.outlet');
    if (dhwOutlet?.properties?.value) {
      console.log(`   Warmwasser Ausgang:       ${dhwOutlet.properties.value.value}°C`);
    }
    
    // ==========================================
    // BETRIEBSMODUS & PROGRAMME
    // ==========================================
    console.log('\n⚙️  BETRIEBSMODUS');
    console.log('─────────────────────────────────────');
    
    const activeMode = await getFeatureSafe('heating.circuits.0.operating.modes.active');
    if (activeMode?.properties?.value) {
      console.log(`   Aktueller Modus:          ${activeMode.properties.value.value}`);
    }
    
    const activeProgram = await getFeatureSafe('heating.circuits.0.operating.programs.active');
    if (activeProgram?.properties?.value) {
      console.log(`   Aktives Programm:         ${activeProgram.properties.value.value}`);
    }
    
    const comfortTemp = await getFeatureSafe('heating.circuits.0.operating.programs.comfort');
    if (comfortTemp?.properties?.temperature) {
      console.log(`   Komfort-Solltemperatur:   ${comfortTemp.properties.temperature.value}°C`);
    }
    
    const normalTemp = await getFeatureSafe('heating.circuits.0.operating.programs.normal');
    if (normalTemp?.properties?.temperature) {
      console.log(`   Normal-Solltemperatur:    ${normalTemp.properties.temperature.value}°C`);
    }
    
    const reducedTemp = await getFeatureSafe('heating.circuits.0.operating.programs.reduced');
    if (reducedTemp?.properties?.temperature) {
      console.log(`   Reduziert-Solltemperatur: ${reducedTemp.properties.temperature.value}°C`);
    }
    
    // ==========================================
    // WARMWASSER
    // ==========================================
    console.log('\n🚿 WARMWASSER');
    console.log('─────────────────────────────────────');
    
    const dhwActive = await getFeatureSafe('heating.dhw.active');
    if (dhwActive?.properties?.value) {
      console.log(`   Warmwasser aktiv:         ${dhwActive.properties.value.value ? 'Ja' : 'Nein'}`);
    }
    
    const dhwMode = await getFeatureSafe('heating.dhw.operating.modes.active');
    if (dhwMode?.properties?.value) {
      console.log(`   Betriebsmodus:            ${dhwMode.properties.value.value}`);
    }
    
    const dhwTargetTemp = await getFeatureSafe('heating.dhw.temperature.main');
    if (dhwTargetTemp?.properties?.value) {
      console.log(`   Solltemperatur:           ${dhwTargetTemp.properties.value.value}°C`);
    }
    
    const dhwCharging = await getFeatureSafe('heating.dhw.charging.active');
    if (dhwCharging?.properties?.value) {
      console.log(`   Wird gerade geladen:      ${dhwCharging.properties.value.value ? 'Ja' : 'Nein'}`);
    }
    
    // ==========================================
    // KOMPRESSOR & LEISTUNG
    // ==========================================
    console.log('\n⚡ KOMPRESSOR & LEISTUNG');
    console.log('─────────────────────────────────────');
    
    const compressorActive = await getFeatureSafe('heating.compressors.0.active');
    if (compressorActive?.properties?.value) {
      console.log(`   Kompressor aktiv:         ${compressorActive.properties.value.value ? 'Ja' : 'Nein'}`);
    }
    
    const compressorPhase = await getFeatureSafe('heating.compressors.0.phase');
    if (compressorPhase?.properties?.value) {
      console.log(`   Kompressor Phase:         ${compressorPhase.properties.value.value}`);
    }
    
    const powerConsumption = await getFeatureSafe('heating.power.consumption.total');
    if (powerConsumption?.properties?.value) {
      console.log(`   Stromverbrauch gesamt:    ${powerConsumption.properties.value.value} ${powerConsumption.properties.value.unit}`);
    }
    
    const powerConsumptionDhw = await getFeatureSafe('heating.power.consumption.dhw');
    if (powerConsumptionDhw?.properties?.value) {
      console.log(`   Stromverbrauch WW:        ${powerConsumptionDhw.properties.value.value} ${powerConsumptionDhw.properties.value.unit}`);
    }
    
    const powerConsumptionHeating = await getFeatureSafe('heating.power.consumption.heating');
    if (powerConsumptionHeating?.properties?.value) {
      console.log(`   Stromverbrauch Heizung:   ${powerConsumptionHeating.properties.value.value} ${powerConsumptionHeating.properties.value.unit}`);
    }
    
    // ==========================================
    // STATISTIKEN
    // ==========================================
    console.log('\n📊 STATISTIKEN');
    console.log('─────────────────────────────────────');
    
    const hoursTotal = await getFeatureSafe('heating.compressors.0.statistics.hours');
    if (hoursTotal?.properties?.value) {
      console.log(`   Betriebsstunden:          ${hoursTotal.properties.value.value} h`);
    }
    
    const starts = await getFeatureSafe('heating.compressors.0.statistics.starts');
    if (starts?.properties?.value) {
      console.log(`   Anzahl Starts:            ${starts.properties.value.value}`);
    }
    
    // ==========================================
    // SYSTEM STATUS
    // ==========================================
    console.log('\n🔧 SYSTEM STATUS');
    console.log('─────────────────────────────────────');
    
    const circulation = await getFeatureSafe('heating.circuits.0.circulation.pump');
    if (circulation?.properties?.status) {
      console.log(`   Zirkulationspumpe:        ${circulation.properties.status.value}`);
    }
    
    const heatingCircuitPump = await getFeatureSafe('heating.circuits.0.circulation.pump');
    if (heatingCircuitPump?.properties?.status) {
      console.log(`   Heizkreispumpe Status:    ${heatingCircuitPump.properties.status.value}`);
    }
    
    const frostProtection = await getFeatureSafe('heating.circuits.0.frostprotection');
    if (frostProtection?.properties?.status) {
      console.log(`   Frostschutz:              ${frostProtection.properties.status.value}`);
    }
    
    // ==========================================
    // GERÄTE-INFO
    // ==========================================
    console.log('\n📱 GERÄTE-INFORMATIONEN');
    console.log('─────────────────────────────────────');
    
    const brand = await getFeatureSafe('device.brand');
    if (brand?.properties?.value) {
      console.log(`   Marke:                    ${brand.properties.value.value}`);
    }
    
    const modelId = await getFeatureSafe('device.modelId');
    if (modelId?.properties?.value) {
      console.log(`   Modell-ID:                ${modelId.properties.value.value}`);
    }
    
    const serial = await getFeatureSafe('device.serial');
    if (serial?.properties?.value) {
      console.log(`   Seriennummer:             ${serial.properties.value.value}`);
    }
    
    // ==========================================
    // WLAN
    // ==========================================
    console.log('\n📶 NETZWERK');
    console.log('─────────────────────────────────────');
    
    const wifi = await getFeatureSafe('tcu.wifi');
    if (wifi) {
      console.log(`   WLAN SSID:                ${wifi.properties.ssid?.value || 'N/A'}`);
      console.log(`   WLAN Qualität:            ${wifi.properties.quality?.value || 'N/A'}`);
      console.log(`   WLAN Status:              ${wifi.properties.status?.value || 'N/A'}`);
    }
    
    console.log('\n✅ Daten erfolgreich abgerufen!\n');
    
  } catch (error: any) {
    console.error('❌ Fehler:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
