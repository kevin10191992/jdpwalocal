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
    const { links, autostart = true } = req.body;
    let linkArray = [];

    // Handle both single link and array of links
    if (Array.isArray(links)) {
      linkArray = links;
    } else if (typeof links === 'string') {
      linkArray = [links];
    } else {
      return res.status(400).json({ error: 'Links must be a string or an array of strings' });
    }

    if (linkArray.length === 0) {
      return res.status(400).json({ error: 'At least one link is required' });
    }

    if (!isConnected || !targetDeviceId) {
      return res.status(503).json({ error: 'Not connected to JDownloader or no device available' });
    }

    console.log(`📥 Adding ${linkArray.length} download(s):`, linkArray);
    const result = await withJD(() => jdownloader.addLinks(linkArray, targetDeviceId, autostart));

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
    downloads.sort((a, b) => b.addedDate - a.addedDate);
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

// --- arrancar el servidor HTTP primero ---
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  iniciarConexion();
});

// --- conectar a MyJDownloader sin bloquear el main thread ---
async function iniciarConexion() {
  try {
    await testConnection();
    console.log('✅ MyJDownloader conectado y servidor HTTP activo');
  } catch (error) {
    console.error('⚠️ Error conectando a MyJDownloader:', error.message);
    console.error('⚠️ El servidor HTTP sigue activo, intenta de nuevo más tarde');
  }
}

// Manejadores para el cierre limpio del servidor
process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal de interrupción. Cerrando el servidor...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando...');
  try {
    await jdownloader.disconnect();
  } catch {}
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('⚠️ Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Promesa rechazada no manejada:', reason);
});

async function withJD(action) {
  try {
    return await action();
  } catch (error) {
    if (error.message?.includes('403') || error.message?.includes('401')) {
      console.warn('⚠️ Sesión expirada. Reintentando conexión...');
      await testConnection();
      return await action();
    }
    throw error;
  }
}

setInterval(async () => {
  console.log('♻️ Renovando sesión con MyJDownloader...');
  try {
    await testConnection();
  } catch (e) {
    console.error('❌ Falló renovación:', e.message);
  }
}, 30 * 60 * 1000); // cada 30 minutos
