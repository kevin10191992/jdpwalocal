# Iconos para PWA JDownloader Remote

## Iconos Requeridos

Para que la PWA funcione correctamente en iOS y otros dispositivos, necesitas crear los siguientes iconos en formato PNG:

### Iconos principales:
- `icon-16x16.png` - Favicon pequeño
- `icon-32x32.png` - Favicon estándar  
- `icon-72x72.png` - Icono iOS
- `icon-96x96.png` - Icono Android
- `icon-128x128.png` - Icono Chrome
- `icon-144x144.png` - Icono Windows
- `icon-152x152.png` - Icono iPad
- `icon-180x180.png` - Icono iPhone (Apple Touch Icon)
- `icon-192x192.png` - Icono Android (estándar)
- `icon-384x384.png` - Icono Android (grande)
- `icon-512x512.png` - Icono PWA (máximo)

### Iconos adicionales:
- `safari-pinned-tab.svg` - Icono para Safari
- `shortcut-add.png` - Icono para shortcut (96x96)

## Diseño Recomendado

Usa el archivo `icon.svg` como base para crear los iconos PNG. El diseño incluye:
- Fondo azul (#4f46e5)
- Flecha de descarga blanca
- Texto "JD" 
- Bordes redondeados para iOS

## Herramientas para generar iconos

Puedes usar:
1. **Online**: https://realfavicongenerator.net/
2. **CLI**: `npm install -g pwa-asset-generator`
3. **Sketch/Figma**: Exportar manualmente

## Comando rápido (si tienes ImageMagick):

```bash
# Convertir SVG a diferentes tamaños PNG
magick icon.svg -resize 16x16 icon-16x16.png
magick icon.svg -resize 32x32 icon-32x32.png
magick icon.svg -resize 72x72 icon-72x72.png
# ... etc para todos los tamaños
```

Por ahora la PWA funcionará sin estos iconos, pero se verán iconos por defecto del navegador.
