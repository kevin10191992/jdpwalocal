import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jdownloader = require('jdownloader-api');

dotenv.config();

const app = express();
const port = 4000;

const JD_EMAIL = process.env.MYJD_USER;
const JD_PASSWORD = process.env.MYJD_PASSWORD;
const JD_DEVICE = process.env.MYJD_DEVICE || 'NAS';

if (!JD_EMAIL || !JD_PASSWORD) {
  console.error('Error: MYJD_USER and MYJD_PASSWORD must be set in .env file');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Servir archivos estáticos de la PWA
app.use(express.static('public'));

// Variables globales para almacenar el estado de la conexión
let isConnected = false;
let availableDevices = [];
let targetDeviceId = null;

// Test connection on startup
async function testConnection() {
  try {
    console.log('🔌 Connecting to JDownloader...');
    await jdownloader.connect(JD_EMAIL, JD_PASSWORD);
    console.log('✅ Connected to JDownloader');
    
    // Lista los dispositivos disponibles
    const devices = await jdownloader.listDevices();
    availableDevices = devices;
    console.log('📱 Available devices:', devices.map(d => d.name).join(', '));
    
    if (devices.length === 0) {
      console.warn('⚠️  No devices found in your JDownloader account');
      return false;
    }
    
    // Busca el dispositivo específico o usa el primero disponible
    const targetDevice = devices.find(d => d.name === JD_DEVICE) || devices[0];
    targetDeviceId = targetDevice.id;
    console.log(`🎯 Using device: ${targetDevice.name} (ID: ${targetDeviceId})`);
    
    if (JD_DEVICE && !devices.find(d => d.name === JD_DEVICE)) {
      console.warn(`⚠️  Device "${JD_DEVICE}" not found, using "${targetDevice.name}"`);
    }
    
    isConnected = true;
    return true;
  } catch (error) {
    console.error('❌ Error connecting to JDownloader:', error.message);
    isConnected = false;
    throw error;
  }
}

// Add download link
app.post('/add', async (req, res) => {
  try {
    const { link, autostart = true } = req.body;
    if (!link) {
      return res.status(400).json({ error: 'Link is required' });
    }

    if (!isConnected || !targetDeviceId) {
      return res.status(503).json({ error: 'Not connected to JDownloader or no device available' });
    }

    console.log(`📥 Adding download: ${link}`);
    const result = await jdownloader.addLinks(link, targetDeviceId, autostart);
    res.json({ success: true, message: 'Download added successfully', result });
  } catch (error) {
    console.error('Error adding download:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get list of downloads
app.get('/downloads', async (req, res) => {
  try {
    if (!isConnected || !targetDeviceId) {
      return res.status(503).json({ error: 'Not connected to JDownloader or no device available' });
    }

    const result = await jdownloader.queryLinks(targetDeviceId);
    // La API devuelve los datos dentro de result.data
    const downloads = result.data || result;
    res.json(downloads);
  } catch (error) {
    console.error('Error getting downloads:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get devices list
app.get('/devices', async (req, res) => {
  try {
    if (!isConnected) {
      return res.status(503).json({ error: 'Not connected to JDownloader' });
    }
    
    res.json({ devices: availableDevices, current: targetDeviceId });
  } catch (error) {
    console.error('Error getting devices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get packages status
app.get('/packages', async (req, res) => {
  try {
    if (!isConnected || !targetDeviceId) {
      return res.status(503).json({ error: 'Not connected to JDownloader or no device available' });
    }

    // Primero obtenemos los links para conseguir los UUIDs de paquetes
    const linksResult = await jdownloader.queryLinks(targetDeviceId);
    const links = linksResult.data || linksResult;
    const packageUUIDs = [...new Set(links.map(link => link.packageUUID))].join(',');
    
    if (packageUUIDs) {
      const packagesResult = await jdownloader.queryPackages(targetDeviceId, packageUUIDs);
      const packages = packagesResult.data || packagesResult;
      res.json(packages);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error getting packages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(port, async () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  try {
    await testConnection();
  } catch (error) {
    console.error('Failed to initialize JDownloader connection:', error.message);
  }
});
