# 📱 JDownloader Remote PWA

Una **Progressive Web App (PWA)** moderna y responsive para controlar tu JDownloader de forma remota desde cualquier dispositivo móvil.

![PWA](https://img.shields.io/badge/PWA-Ready-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Características

- 📱 **PWA completa** - Instalable en iOS/Android
- 🎨 **Mobile-first** - Diseño optimizado para móviles
- 🔄 **Tiempo real** - Auto-refresh cada 30 segundos
- 🌐 **Offline** - Funciona sin conexión a internet
- 🚀 **Rápida** - Service Worker con caché inteligente
- 🎯 **Simple** - Interfaz limpia y fácil de usar

## 🖼️ Screenshots

| Móvil | Escritorio |
|-------|------------|
| ![Mobile](https://via.placeholder.com/300x600/4f46e5/white?text=PWA+Mobile) | ![Desktop](https://via.placeholder.com/600x400/4f46e5/white?text=PWA+Desktop) |

## 🚀 Instalación Rápida

### Requisitos
- Node.js 18+
- Cuenta en My.JDownloader.org
- JDownloader activo y conectado

### 1. Clona el repositorio
```bash
git clone https://github.com/tu-usuario/jdownloader-remote-pwa.git
cd jdownloader-remote-pwa
```

### 2. Instala dependencias
```bash
npm install
# o si usas pnpm
pnpm install
```

### 3. Configura variables de entorno
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:
```env
MYJD_USER=tu_email@example.com
MYJD_PASSWORD=tu_contraseña
MYJD_DEVICE=nombre_dispositivo_opcional
```

### 4. Inicia el servidor
```bash
npm start
# o
pnpm start
```

### 5. Accede a la PWA
- **Local**: http://localhost:4000
- **Red local**: http://tu-ip:4000

## 📱 Instalación en Móvil

### iPhone (Safari)
1. Ve a `http://tu-ip:4000`
2. Toca el botón **Compartir**
3. Selecciona **"Añadir a pantalla de inicio"**
4. Confirma la instalación

### Android (Chrome)
1. Ve a `http://tu-ip:4000`
2. Toca **"Instalar app"** en la notificación
3. O usa el menú ⋮ → **"Instalar aplicación"**

## 🛠️ API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/` | Frontend PWA |
| `POST` | `/add` | Añadir enlace de descarga |
| `GET` | `/downloads` | Listar descargas actuales |
| `GET` | `/devices` | Listar dispositivos JDownloader |
| `GET` | `/packages` | Estado de paquetes de descarga |

### Ejemplo de uso
```javascript
// Añadir descarga
fetch('/add', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    link: 'https://example.com/file.zip',
    autostart: true
  })
});
```

## 📁 Estructura del Proyecto

```
jdownloader-remote-pwa/
├── 📁 public/              # Frontend PWA
│   ├── index.html          # Página principal
│   ├── app.js             # JavaScript principal
│   ├── styles.css         # Estilos CSS
│   ├── sw.js              # Service Worker
│   ├── manifest.json      # Manifiesto PWA
│   └── 📁 icons/          # Iconos de la app
├── server.js              # Backend API + servidor estático
├── package.json           # Dependencias
├── .env.example           # Ejemplo de configuración
└── README.md              # Este archivo
```

## 🔧 Desarrollo

### Scripts disponibles
```bash
npm start          # Inicia el servidor
npm run dev        # Modo desarrollo con recarga
npm test           # Ejecuta tests (si existen)
```

### Dependencias principales
- **express** - Servidor web
- **cors** - Cross-origin requests
- **dotenv** - Variables de entorno
- **jdownloader-api** - Cliente para My.JDownloader

## 🌐 Deployment

### Opción 1: Servidor propio
```bash
# PM2 para producción
npm install -g pm2
pm2 start server.js --name "jdownloader-pwa"
```

### Opción 2: Railway/Heroku
1. Conecta tu repositorio
2. Configura variables de entorno
3. Deploy automático

### Opción 3: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
```

## 🔐 Seguridad

- ✅ Variables de entorno protegidas
- ✅ CORS configurado
- ✅ No exposición de credenciales
- ⚠️ **Importante**: Cambia credenciales por defecto

## 🤝 Contribuir

1. Haz fork del proyecto
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Añadir nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## 🐛 Problemas Conocidos

- **Iconos PWA**: Usar iconos PNG para mejor compatibilidad iOS
- **HTTPS**: Requerido para todas las funcionalidades PWA
- **Service Worker**: Puede requerir recarga manual tras actualizaciones

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- [JDownloader](https://jdownloader.org/) - Por el increíble software
- [My.JDownloader](https://my.jdownloader.org/) - Por la API
- [Font Awesome](https://fontawesome.com/) - Por los iconos
- [Inter Font](https://rsms.me/inter/) - Por la tipografía

---

⭐ **¿Te gusta el proyecto?** ¡Dale una estrella en GitHub!

📞 **¿Problemas?** Abre un [issue](https://github.com/tu-usuario/jdownloader-remote-pwa/issues)

🚀 **¿Ideas?** ¡Las Pull Requests son bienvenidas!


