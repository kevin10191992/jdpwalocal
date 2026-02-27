// server.js
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

let isConnected = false;
let availableDevices = [];
let targetDeviceId = null;

async function connectToJDownloader() {
  try {
    console.log('🔌 Connecting to JDownloader...');
    // Check if already connected
    if (isConnected) {
      console.log('✅ Already connected to JDownloader');
    return true;
  }

    await jdownloader.connect(JD_EMAIL, JD_PASSWORD);
    console.log('✅ Connected to JDownloader');

    const devices = await jdownloader.listDevices();
    availableDevices = devices;
    console.log('📱 Available devices:', devices.map(d => d.name).join(', '));

    if (devices.length === 0) {
      console.warn('⚠️ No devices found in your JDownloader account');
      return false;
}

    const targetDevice = devices.find(d => d.name === JD_DEVICE) || devices[0];
    targetDeviceId = targetDevice.id;
    console.log(`🎯 Using device: ${targetDevice.name} (ID: ${targetDeviceId})`);

    if (JD_DEVICE && !devices.find(d => d.name === JD_DEVICE)) {
      console.warn(`⚠️ Device "${JD_DEVICE}" not found, using "${targetDevice.name}"`);
    }

    isConnected = true;
    return true;
  } catch (error) {
    console.error('❌ Error connecting to JDownloader:', error.message);
    isConnected = false;
    throw error;
  }
}

async function monitorConnection() {
  try {
    await connectToJDownloader();
    setTimeout(monitorConnection, 60000); // Reintentar cada minuto
  } catch (error) {
    console.error('❌ Connection lost. Retrying in 1 minute...', error.message);
    setTimeout(monitorConnection, 60000); // Reintentar cada minuto
  }
}

app.post('/add', async (req, res) => {
  try {
    const { links, autostart = true } = req.body;
    if (!Array.isArray(links) && typeof links !== 'string') {
      return res.status(400).json({ error: 'Links must be a string or an array of strings' });
    }

    if (links.length === 0) {
      return res.status(400).json({ error: 'At least one link is required' });
    }

    await connectToJDownloader();

    const result = await jdownloader.addLinks(links, targetDeviceId, autostart);
    res.json({ success: true, message: 'Download added successfully', result });
  } catch (error) {
    console.error('Error adding download:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/downloads', async (req, res) => {
  try {
    await connectToJDownloader();
    const downloads = await jdownloader.queryLinks(targetDeviceId);
    downloads.data.sort((a, b) => b.addedDate - a.addedDate);
    res.json(downloads);
  } catch (error) {
    console.error('Error getting downloads:', error);
    res.status(500).json({ error: error.message });
  }
});

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

app.get('/packages', async (req, res) => {
  try {
    await connectToJDownloader();
    const linksResult = await jdownloader.queryLinks(targetDeviceId);
    const packageUUIDs = [...new Set(linksResult.data.map(link => link.packageUUID))].join(',');
    if (packageUUIDs) {
      const packagesResult = await jdownloader.queryPackages(targetDeviceId, packageUUIDs);
      res.json(packagesResult.data || packagesResult);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error getting packages:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  connectToJDownloader();
  monitorConnection(); // Iniciar el monitoreo de la conexión
});

async function handleShutdown() {
  try {
    await jdownloader.disconnect();
  } catch {}
  process.exit(0);
}

process.on('SIGINT', handleShutdown);
process.on('uncaughtException', (error) => {
  console.error('⚠️ Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Promesa rechazada no manejada:', reason);
});
