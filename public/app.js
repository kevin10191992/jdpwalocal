// PWA App JavaScript
class JDownloaderApp {
    constructor() {
        this.apiBase = window.location.origin;
        this.isOnline = navigator.onLine;
        this.installPromptEvent = null;
        
        this.init();
    }
    
    async init() {
        // Register Service Worker
        await this.registerServiceWorker();
        
        // Initialize UI components
        this.initializeEventListeners();
        this.initializeInstallPrompt();
        this.initializeNetworkListener();
        
        // Load initial data
        await this.checkConnectionStatus();
        await this.loadDeviceInfo();
        await this.loadDownloads();
        
        // Auto-refresh downloads every 30 seconds
        setInterval(() => this.loadDownloads(), 30000);
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
                
                // Handle service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showToast('Nueva versión disponible. Recarga la página.', 'warning');
                        }
                    });
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
    
    initializeEventListeners() {
        // Form submission
        const addForm = document.getElementById('add-link-form');
        addForm.addEventListener('submit', (e) => this.handleAddLink(e));
        
        // Utility buttons
        const pasteBtn = document.getElementById('paste-btn');
        const clearBtn = document.getElementById('clear-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        
        pasteBtn.addEventListener('click', () => this.handlePasteLink());
        clearBtn.addEventListener('click', () => this.handleClearLink());
        refreshBtn.addEventListener('click', () => this.loadDownloads());
        
        // Install prompt buttons
        const installBtn = document.getElementById('install-btn');
        const dismissInstallBtn = document.getElementById('dismiss-install');
        
        installBtn.addEventListener('click', () => this.handleInstall());
        dismissInstallBtn.addEventListener('click', () => this.dismissInstallPrompt());
        
        // Handle URL parameter for direct actions
        this.handleURLParams();
    }
    
    initializeInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.installPromptEvent = e;
            this.showInstallPrompt();
        });
        
        // Handle app installed event
        window.addEventListener('appinstalled', () => {
            this.hideInstallPrompt();
            this.showToast('¡App instalada correctamente!', 'success');
            this.installPromptEvent = null;
        });
    }
    
    initializeNetworkListener() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showToast('Conexión restaurada', 'success');
            this.checkConnectionStatus();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showToast('Sin conexión a internet', 'warning');
            this.updateConnectionStatus('error', 'Sin conexión');
        });
    }
    
    handleURLParams() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        
        if (action === 'add') {
            // Focus on the input field
            const linkInput = document.getElementById('download-link');
            linkInput.focus();
        } else if (params.get('section') === 'downloads') {
            // Scroll to downloads section
            const downloadsSection = document.querySelector('#downloads-container').parentElement.parentElement;
            downloadsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    async handleAddLink(e) {
        e.preventDefault();
        
        const linkInput = document.getElementById('download-link');
        const autostartCheckbox = document.getElementById('autostart');
        const addBtn = document.getElementById('add-btn');
        
        const linksText = linkInput.value.trim();
        const autostart = autostartCheckbox.checked;
        
        if (!linksText) {
            this.showToast('Por favor, introduce al menos un enlace', 'error');
            return;
        }
        
        // Split by new lines or commas and filter out empty strings
        const links = linksText.split(/[\n,]+/)
            .map(link => link.trim())
            .filter(link => link.length > 0);
        
        // Validate URLs
        const invalidLinks = [];
        for (const link of links) {
            try {
                new URL(link);
            } catch {
                invalidLinks.push(link);
            }
        }
        
        if (invalidLinks.length > 0) {
            this.showToast(`Enlaces no válidos: ${invalidLinks.join(', ')}`, 'error');
            return;
        }
        
        // Disable button and show loading
        addBtn.disabled = true;
        const originalText = addBtn.innerHTML;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Añadiendo...';
        
        try {
            const response = await fetch(`${this.apiBase}/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ links, autostart })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                if (result.success) {
                    this.showToast(
                        links.length > 1 
                            ? `${links.length} descargas añadidas correctamente` 
                            : 'Descarga añadida correctamente',
                        'success'
                    );
                } else {
                    const failedCount = result.results ? result.results.filter(r => !r.success).length : 0;
                    if (failedCount > 0) {
                        this.showToast(
                            `Error al añadir ${failedCount} de ${links.length} descargas`,
                            'warning'
                        );
                    } else {
                        this.showToast('Error al añadir las descargas', 'error');
                    }
                }
                linkInput.value = '';
                await this.loadDownloads();
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error adding download:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        } finally {
            // Restore button
            addBtn.disabled = false;
            addBtn.innerHTML = originalText;
        }
    }
    
    async handlePasteLink() {
        try {
            const text = await navigator.clipboard.readText();
            const linkInput = document.getElementById('download-link');
            linkInput.value = text;
            linkInput.focus();
            this.showToast('Enlace pegado', 'success');
        } catch (error) {
            console.error('Error pasting:', error);
            this.showToast('No se pudo pegar el enlace', 'error');
        }
    }
    
    handleClearLink() {
        const linkInput = document.getElementById('download-link');
        linkInput.value = '';
        linkInput.focus();
    }
    
    async checkConnectionStatus() {
        try {
            const response = await fetch(`${this.apiBase}/devices`);
            if (response.ok) {
                this.updateConnectionStatus('connected', 'Conectado');
            } else {
                throw new Error('API not available');
            }
        } catch (error) {
            this.updateConnectionStatus('error', 'Error de conexión');
        }
    }
    
    updateConnectionStatus(status, text) {
        const statusElement = document.getElementById('connection-status');
        
        // Remove existing status classes
        statusElement.classList.remove('status-connecting', 'status-connected', 'status-error');
        
        // Add new status class
        statusElement.classList.add(`status-${status}`);
        
        // Update text
        const icon = statusElement.querySelector('i');
        statusElement.innerHTML = `${icon.outerHTML} ${text}`;
    }
    
    async loadDeviceInfo() {
        const deviceContainer = document.getElementById('device-info');
        
        try {
            const response = await fetch(`${this.apiBase}/devices`);
            const data = await response.json();
            
            if (response.ok && data.devices) {
                this.renderDeviceInfo(data.devices, data.current);
            } else {
                throw new Error(data.error || 'Error loading devices');
            }
        } catch (error) {
            console.error('Error loading device info:', error);
            deviceContainer.innerHTML = this.renderError('Error cargando información del dispositivo');
        }
    }
    
    renderDeviceInfo(devices, currentId) {
        const deviceContainer = document.getElementById('device-info');
        
        if (!devices || devices.length === 0) {
            deviceContainer.innerHTML = this.renderEmptyState(
                'desktop', 
                'Sin dispositivos', 
                'No hay dispositivos JDownloader conectados'
            );
            return;
        }
        
        const devicesHTML = devices.map(device => `
            <div class="device-item">
                <div class="device-icon">
                    <i class="fas fa-desktop"></i>
                </div>
                <div>
                    <div class="device-name">${this.escapeHtml(device.name)}</div>
                    ${device.id === currentId ? '<div class="device-current">● Actual</div>' : ''}
                </div>
            </div>
        `).join('');
        
        deviceContainer.innerHTML = devicesHTML;
    }
    
    async loadDownloads() {
        const downloadContainer = document.getElementById('downloads-container');
        const loadingElement = document.getElementById('downloads-loading');
        
        // Show loading if not already showing content
        if (!downloadContainer.querySelector('.download-item')) {
            if (loadingElement) loadingElement.classList.remove('hidden');
        }
        
        try {
            const response = await fetch(`${this.apiBase}/downloads`);
            const downloads = await response.json();
            
            if (response.ok) {
                this.renderDownloads(downloads);
            } else {
                throw new Error(downloads.error || 'Error loading downloads');
            }
        } catch (error) {
            console.error('Error loading downloads:', error);
            if (this.isOnline) {
                downloadContainer.innerHTML = this.renderError('Error cargando descargas');
            } else {
                downloadContainer.innerHTML = this.renderError('Sin conexión - Datos no disponibles');
            }
        }
    }
    
    renderDownloads(downloads) {
        const downloadContainer = document.getElementById('downloads-container');
        
        if (!downloads || downloads.length === 0) {
            downloadContainer.innerHTML = this.renderEmptyState(
                'download',
                'Sin descargas',
                'No hay descargas en curso'
            );
            return;
        }
        
        const downloadsHTML = downloads.map(download => {
            const progress = download.bytesLoaded && download.bytesTotal 
                ? Math.round((download.bytesLoaded / download.bytesTotal) * 100)
                : 0;
            
            const status = this.getDownloadStatus(download);
            const icon = this.getDownloadIcon(download);
            
            return `
                <div class="download-item">
                    <div class="download-icon">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div class="download-info">
                        <div class="download-name" title="${this.escapeHtml(download.name || download.url)}">
                            ${this.escapeHtml(this.truncateText(download.name || download.url, 50))}
                        </div>
                        <div class="download-status">
                            <span>${status}</span>
                            ${progress > 0 ? `<span>${progress}%</span>` : ''}
                            ${download.bytesTotal ? `<span>${this.formatBytes(download.bytesTotal)}</span>` : ''}
                        </div>
                        ${progress > 0 ? `
                            <div class="download-progress">
                                <div class="download-progress-bar" style="width: ${progress}%"></div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        downloadContainer.innerHTML = downloadsHTML;
    }
    
    getDownloadStatus(download) {
        if (download.status) {
            switch (download.status.toLowerCase()) {
                case 'finished': return 'Completado';
                case 'downloading': return 'Descargando';
                case 'paused': return 'Pausado';
                case 'waiting': return 'En espera';
                case 'error': return 'Error';
                default: return download.status;
            }
        }
        return 'Desconocido';
    }
    
    getDownloadIcon(download) {
        if (download.status) {
            switch (download.status.toLowerCase()) {
                case 'finished': return 'check-circle';
                case 'downloading': return 'download';
                case 'paused': return 'pause-circle';
                case 'waiting': return 'clock';
                case 'error': return 'exclamation-triangle';
                default: return 'file';
            }
        }
        return 'file';
    }
    
    renderEmptyState(icon, title, description) {
        return `
            <div class="empty-state">
                <i class="fas fa-${icon}"></i>
                <h3>${title}</h3>
                <p>${description}</p>
            </div>
        `;
    }
    
    renderError(message) {
        return `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle" style="color: var(--error-color);"></i>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
    
    showInstallPrompt() {
        const installPrompt = document.getElementById('install-prompt');
        if (installPrompt && this.installPromptEvent) {
            installPrompt.classList.remove('hidden');
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                if (!installPrompt.classList.contains('hidden')) {
                    this.dismissInstallPrompt();
                }
            }, 10000);
        }
    }
    
    hideInstallPrompt() {
        const installPrompt = document.getElementById('install-prompt');
        if (installPrompt) {
            installPrompt.classList.add('hidden');
        }
    }
    
    async handleInstall() {
        if (this.installPromptEvent) {
            try {
                this.installPromptEvent.prompt();
                const { outcome } = await this.installPromptEvent.userChoice;
                
                if (outcome === 'accepted') {
                    this.showToast('Instalando app...', 'success');
                } else {
                    this.showToast('Instalación cancelada', 'warning');
                }
                
                this.hideInstallPrompt();
                this.installPromptEvent = null;
            } catch (error) {
                console.error('Error installing app:', error);
                this.showToast('Error instalando la app', 'error');
            }
        }
    }
    
    dismissInstallPrompt() {
        this.hideInstallPrompt();
        // Remember user choice for this session
        sessionStorage.setItem('installPromptDismissed', 'true');
    }
    
    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' :
                    type === 'error' ? 'exclamation-circle' :
                    type === 'warning' ? 'exclamation-triangle' : 'info-circle';
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="toast-message">${this.escapeHtml(message)}</div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 4000);
        
        // Add click to dismiss
        toast.addEventListener('click', () => toast.remove());
    }
    
    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length <= maxLength ? text : text.substr(0, maxLength) + '...';
    }
    
    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.jdApp = new JDownloaderApp();
});

// Handle app visibility changes for better battery life
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('App hidden - reducing refresh rate');
    } else {
        console.log('App visible - normal refresh rate');
        if (window.jdApp) {
            window.jdApp.loadDownloads();
        }
    }
});
