import { ViessmannClient } from "./src/client";
import axios from "axios";
import * as dotenv from "dotenv";
import * as path from "path";

/**
 * Test verschiedene API v2 Endpoints um die Struktur zu verstehen
 */

async function discoverApiStructure() {
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
		clientId: clientId,
	});

	try {
    console.log('🔐 Authentifizierung...\n');
		await client.authenticateWithBrowser();

		const installationId = 2983348; // Ihre Installation ID

		// Test verschiedene Endpoints
		const endpoints = [
			`/iot/v2/equipment/installations/${installationId}`,
			`/iot/v2/equipment/installations/${installationId}/gateways`,
			`/iot/v2/features/installations/${installationId}`,
			`/iot/v2/features/installations/${installationId}/gateways`,
		];

		for (const endpoint of endpoints) {
			console.log(`\n📡 Teste: ${endpoint}`);
			try {
				const response = await axios.get(
					`https://api.viessmann.com${endpoint}`,
					{
						headers: {
              'Authorization': `Bearer ${(client as any).token.access_token}`,
              'Content-Type': 'application/json'
            }
          }
				);
        console.log('✅ Erfolg!');
				console.log(JSON.stringify(response.data, null, 2));

				// Speichere Antwort
        const fs = require('fs');
        const filename = `api-response-${endpoint.replace(/\//g, '-')}.json`;
				fs.writeFileSync(filename, JSON.stringify(response.data, null, 2));
				console.log(`💾 Gespeichert in: ${filename}`);
			} catch (error: any) {
				if (error.response) {
          console.log(`❌ Fehler ${error.response.status}: ${error.response.statusText}`);
					if (error.response.data) {
						console.log(JSON.stringify(error.response.data, null, 2));
					}
				} else {
					console.log(`❌ Fehler: ${error.message}`);
				}
			}
		}

	} catch (error) {
    console.error('❌ Fehler:', error);
	}
}

discoverApiStructure();
