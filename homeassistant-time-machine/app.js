const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const YAML = require('yaml');
const jsyaml = require('js-yaml');
const cron = require('node-cron');
const fetch = require('node-fetch');
const https = require('https');
const readline = require('readline');

const version = '2.0.1';
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';
const debugLog = (...args) => {
  if (DEBUG_LOGS) {
    console.log(...args);
  }
};

const TLS_CERT_ERROR_CODES = new Set([
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'ERR_TLS_CERT_SIGNATURE_ALGORITHM_UNSUPPORTED',
]);

const TLS_ERROR_TEXT_PATTERN = /self signed certificate|unable to verify the first certificate/i;

const isTlsCertificateError = (error) => {
  if (!error) return false;

  const nestedCandidates = [
    error,
    error.cause,
    error.reason,
    error.cause?.cause,
  ].filter(Boolean);

  for (const candidate of nestedCandidates) {
    if (candidate.code && TLS_CERT_ERROR_CODES.has(candidate.code)) {
      return true;
    }
    if (typeof candidate.message === 'string' && TLS_ERROR_TEXT_PATTERN.test(candidate.message)) {
      return true;
    }
  }

  return false;
};

const app = express();
const PORT = process.env.PORT || 54000;
const HOST = process.env.HOST || '0.0.0.0';
const INGRESS_PATH = process.env.INGRESS_ENTRY || '';
const basePath = INGRESS_PATH || '';
const BODY_SIZE_LIMIT = '50mb';

const DATA_DIR = (() => {
  const addonDataRoot = '/data';
  if (fsSync.existsSync(addonDataRoot)) {
    const dir = path.join(addonDataRoot, 'homeassistant-time-machine');
    try {
      fsSync.mkdirSync(dir, { recursive: true });
    } catch (error) {
      console.error('[data-dir] Failed to ensure addon data directory exists:', error);
    }
    return dir;
  }

  const fallback = path.join(__dirname, 'data');
  try {
    fsSync.mkdirSync(fallback, { recursive: true });
  } catch (error) {
    console.error('[data-dir] Failed to ensure local data directory exists:', error);
  }
  return fallback;
})();

console.log('[data-dir] Using persistent data directory:', DATA_DIR);

// Set up stdin listener for hassio.addon_stdin service
// This allows triggering backups from Home Assistant automations/scripts
// Must be at top level to catch stdin before server starts
const setupStdinListener = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  // Ensure stdin is flowing
  process.stdin.resume();

  console.log('[stdin] Listener initialized, waiting for commands (backup, backup_now)...');

  rl.on('line', async (line) => {
    // Strip quotes - Home Assistant may send input with JSON encoding
    const command = line.trim().toLowerCase().replace(/^["']+|["']+$/g, '');
    console.log(`[stdin] Received command: "${command}"`);

    switch (command) {
      case 'backup':
      case 'backup_now':
        try {
          console.log('[stdin] Triggering backup...');
          const options = await getAddonOptions();
          const backupPath = await performBackup(
            options.liveConfigPath || '/config',
            options.backupFolderPath || '/media/timemachine',
            'stdin-service'
          );
          console.log(`[stdin] Backup completed successfully: ${backupPath}`);
        } catch (error) {
          console.error('[stdin] Backup failed:', error.message);
        }
        break;
      default:
        if (command) {
          console.log(`[stdin] Unknown command: "${command}". Available: backup, backup_now`);
        }
    }
  });

  rl.on('close', () => {
    console.log('[stdin] Input stream closed');
  });

  rl.on('error', (err) => {
    console.error('[stdin] Error:', err.message);
  });
};

// Initialize stdin listener
setupStdinListener();

// Log ingress configuration immediately
console.log('[INIT] INGRESS_ENTRY env var:', process.env.INGRESS_ENTRY || '(not set)');
console.log('[INIT] basePath will be:', basePath || '(empty - direct access)');

// Middleware
app.use(express.json({ limit: BODY_SIZE_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_SIZE_LIMIT }));

// Error handling middleware for payload size errors
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: `Payload too large: ${err.message}`,
      limit: BODY_SIZE_LIMIT
    });
  }
  next(err);
});

// Ingress path detection and URL rewriting middleware
app.use((req, res, next) => {
  debugLog(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);

  // Detect ingress path from headers
  const ingressPath = req.headers['x-ingress-path'] ||
    req.headers['x-forwarded-prefix'] ||
    req.headers['x-external-url'] ||
    '';

  // Make ingress path available to templates  
  res.locals.ingressPath = ingressPath;
  res.locals.url = (path) => ingressPath + path;

  if (ingressPath) {
    debugLog(`[ingress] Detected: ${ingressPath}, Original URL: ${req.originalUrl}`);

    // Strip ingress prefix from URL for routing
    if (req.originalUrl.startsWith(ingressPath)) {
      req.url = req.originalUrl.substring(ingressPath.length) || '/';
      debugLog(`[ingress] Rewritten URL: ${req.url}`);
    }
  }

  next();
});

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files - serve at both root and any ingress path
app.use('/static', express.static(path.join(__dirname, 'public')));
// Also handle ingress paths like /api/hassio_ingress/TOKEN/static
app.use('*/static', express.static(path.join(__dirname, 'public')));
console.log(`[static] Static files configured for direct and ingress access`);

// Favicon routes
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/images/favicon.ico'));
});

// Home page
app.get('/', async (req, res) => {
  try {
    const options = await getAddonOptions();
    res.render('index', {
      title: 'Home Assistant Time Machine',
      version,
      currentMode: 'automations',
      esphomeEnabled: options.esphome,
      packagesEnabled: options.packages,
      language: options.language || 'en'
    });
  } catch (error) {
    console.error('[home] Failed to determine feature status:', error);
    res.render('index', {
      title: 'Home Assistant Time Machine',
      version,
      currentMode: 'automations',
      esphomeEnabled: false,
      packagesEnabled: false,
      language: 'en'
    });
  }
});

const normalizeHomeAssistantUrl = (url) => {
  if (!url) return null;
  return url.replace(/\/$/, '').replace(/\/+$/, '');
};

const toApiBase = (url) => {
  const normalized = normalizeHomeAssistantUrl(url);
  if (!normalized) return null;
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

const resolveSupervisorToken = () => {
  const possibleTokens = [process.env.SUPERVISOR_TOKEN, process.env.HASSIO_TOKEN];
  for (const token of possibleTokens) {
    if (token && token.trim()) {
      return token.trim();
    }
  }
  return null;
};

// Cache for parsed YAML files (with size limit to prevent memory bloat)
const yamlCache = new Map();
const YAML_CACHE_MAX_SIZE = 100; // Limit cache entries to prevent memory issues

async function loadYamlWithCache(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const mtime = stats.mtime.getTime();

    if (yamlCache.has(filePath)) {
      const cached = yamlCache.get(filePath);
      if (cached.mtime === mtime) {
        return cached.data;
      }
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const data = jsyaml.load(content);

    // Evict oldest entries if cache is too large
    if (yamlCache.size >= YAML_CACHE_MAX_SIZE) {
      const firstKey = yamlCache.keys().next().value;
      yamlCache.delete(firstKey);
    }

    yamlCache.set(filePath, {
      mtime,
      data
    });

    return data;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

// Clear cache entries for backup paths (to free memory after filtering)
function clearBackupCacheEntries() {
  const keysToDelete = [];
  for (const key of yamlCache.keys()) {
    // Keep live config cache, clear backup entries
    if (!key.includes('/config/')) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => yamlCache.delete(key));
  console.log(`[cache] Cleared ${keysToDelete.length} backup cache entries`);
}

const YAML_EXTENSIONS = new Set(['.yaml', '.yml']);

async function listYamlFilesRecursive(rootDir) {
  const results = [];

  async function walk(currentDir, relativePrefix) {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return;
      }
      throw err;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('._')) {
        continue;
      }

      const entryRelativePath = relativePrefix ? path.join(relativePrefix, entry.name) : entry.name;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath, entryRelativePath);
      } else if (entry.isFile() && YAML_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        results.push(entryRelativePath);
      }
    }
  }

  await walk(rootDir, '');
  results.sort((a, b) => a.localeCompare(b));
  return results;
}

function resolveWithinDirectory(baseDir, relativePath) {
  if (typeof relativePath !== 'string') {
    const error = new Error('Invalid path');
    error.code = 'INVALID_PATH';
    throw error;
  }

  const trimmed = relativePath.trim();
  if (!trimmed) {
    const error = new Error('Invalid path');
    error.code = 'INVALID_PATH';
    throw error;
  }

  const base = path.resolve(baseDir);
  const target = path.resolve(baseDir, trimmed);
  const baseWithSep = base.endsWith(path.sep) ? base : `${base}${path.sep}`;

  if (target === base || !target.startsWith(baseWithSep)) {
    const error = new Error('Invalid path');
    error.code = 'INVALID_PATH';
    throw error;
  }

  return target;
}

// Get addon options (addon mode) or use environment variables (Docker mode)
async function getAddonOptions() {
  const supervisorToken = resolveSupervisorToken();

  // Check if running in addon mode (has /data/options.json)
  try {
    await fs.access('/data/options.json');
    debugLog('[options] Running in addon mode, reading /data/options.json');
    const options = await fs.readFile('/data/options.json', 'utf-8');
    debugLog('[options] Successfully read /data/options.json');
    const parsedOptions = JSON.parse(options);
    debugLog('[options] theme configured as:', parsedOptions?.theme || 'dark');
    debugLog('[options] language configured as:', parsedOptions?.language || 'en');

    let esphomeEnabled = parsedOptions?.esphome ?? false;
    let packagesEnabled = parsedOptions?.packages ?? false;
    let dockerSettings = {};
    try {
      dockerSettings = await loadDockerSettings();
      if (dockerSettings.__loadedFromFile) {
        if (typeof dockerSettings.packagesEnabled === 'boolean') {
          packagesEnabled = dockerSettings.packagesEnabled;
        }
      }
    } catch (settingsError) {
      debugLog('[options] Failed to load Docker settings:', settingsError.message);
    }

    return {
      mode: 'addon',
      home_assistant_url: null,
      long_lived_access_token: null,
      supervisor_token: supervisorToken,
      credentials_source: supervisorToken ? 'supervisor' : 'none',
      theme: parsedOptions?.theme || 'dark',
      language: parsedOptions?.language || 'en',
      esphome: esphomeEnabled,
      packages: packagesEnabled,
      backupFolderPath: dockerSettings.backupFolderPath,
      liveConfigPath: dockerSettings.liveConfigPath,
    };
  } catch (error) {
    debugLog('[options] Running in Docker/local mode, checking for environment variables or saved settings');
    let dockerSettings = {};
    try {
      dockerSettings = await loadDockerSettings();
    } catch (settingsError) {
      debugLog('[options] Failed to load Docker settings for ESPHome flag:', settingsError.message);
    }

    // First try environment variables
    if (process.env.HOME_ASSISTANT_URL && process.env.LONG_LIVED_ACCESS_TOKEN) {
      return {
        mode: 'docker',
        home_assistant_url: process.env.HOME_ASSISTANT_URL,
        long_lived_access_token: process.env.LONG_LIVED_ACCESS_TOKEN,
        supervisor_token: supervisorToken,
        credentials_source: 'env',
        theme: process.env.THEME || dockerSettings.theme || 'dark',
        language: dockerSettings.language || 'en',
        esphome: dockerSettings.esphomeEnabled ?? false,
        packages: dockerSettings.packagesEnabled ?? false,
      };
    }

    // Fall back to saved HA credentials for Docker/local
    try {
      const savedCreds = await fs.readFile(path.join(DATA_DIR, 'docker-ha-credentials.json'), 'utf-8');
      const parsed = JSON.parse(savedCreds);
      const hasSavedCreds = !!(parsed.home_assistant_url && parsed.long_lived_access_token);
      return {
        mode: 'docker',
        home_assistant_url: parsed.home_assistant_url || null,
        long_lived_access_token: parsed.long_lived_access_token || null,
        supervisor_token: supervisorToken,
        credentials_source: hasSavedCreds ? 'stored' : 'none',
        theme: process.env.THEME || dockerSettings.theme || parsed.theme || 'dark',
        language: dockerSettings.language || parsed.language || 'en',
        esphome: dockerSettings.esphomeEnabled ?? false,
        packages: dockerSettings.packagesEnabled ?? false,
      };
    } catch (credError) {
      // No credentials configured
      return {
        mode: 'docker',
        home_assistant_url: null,
        long_lived_access_token: null,
        supervisor_token: supervisorToken,
        credentials_source: 'none',
        theme: process.env.THEME || dockerSettings.theme || 'dark',
        language: dockerSettings.language || 'en',
        esphome: dockerSettings.esphomeEnabled ?? false,
        packages: dockerSettings.packagesEnabled ?? false,
      };
    }
  }
}

async function getHomeAssistantAuth(optionsOverride, manualOverride) {
  if (manualOverride?.haUrl && manualOverride?.haToken) {
    return {
      baseUrl: toApiBase(manualOverride.haUrl),
      token: manualOverride.haToken,
      source: 'manual',
      options: optionsOverride || await getAddonOptions(),
    };
  }

  const options = optionsOverride || await getAddonOptions();

  if (options.supervisor_token) {
    console.log('[auth] Using supervisor proxy for Home Assistant requests');
    return {
      baseUrl: 'http://supervisor/core/api',
      token: options.supervisor_token,
      source: 'supervisor',
      options,
    };
  }

  if (options.home_assistant_url && options.long_lived_access_token) {
    return {
      baseUrl: toApiBase(options.home_assistant_url),
      token: options.long_lived_access_token,
      source: options.credentials_source || 'options',
      options,
    };
  }

  return {
    baseUrl: null,
    token: null,
    source: 'none',
    options,
  };
}

async function isEsphomeEnabled() {
  try {
    const options = await getAddonOptions();
    return !!(options?.esphome);
  } catch (error) {
    console.error('[esphome] Failed to determine ESPHome status:', error);
    return false;
  }
}

async function isPackagesEnabled() {
  try {
    const options = await getAddonOptions();
    return !!(options?.packages);
  } catch (error) {
    console.error('[packages] Failed to determine Packages status:', error);
    return false;
  }
}

// App settings endpoint (expose config to frontend, excluding sensitive data)
app.get('/api/app-settings', async (req, res) => {
  try {
    debugLog('[app-settings] --- Start ESPHome Flag Resolution ---');

    const options = await getAddonOptions();
    debugLog('[app-settings] Addon options loaded:', {
      esphome: options.esphome,
      mode: options.mode
    });

    let esphomeEnabled = !!(options.esphome);
    debugLog(`[app-settings] Initial esphomeEnabled from options: ${esphomeEnabled}`);

    let storedSettings = null;
    if (options.mode === 'addon') {
      try {
        storedSettings = await loadDockerSettings();
        debugLog('[app-settings] Loaded stored settings (docker-app-settings.json):', {
          esphomeEnabled: storedSettings.esphomeEnabled,
          __loadedFromFile: storedSettings.__loadedFromFile
        });
      } catch (settingsError) {
        debugLog('[app-settings] Failed to load saved settings for ESPHome flag:', settingsError.message);
      }
    }
    const auth = await getHomeAssistantAuth(options);

    const packagesEnabled = await isPackagesEnabled();
    const baseResponse = {
      mode: options.mode,
      haUrl: options.home_assistant_url,
      haToken: options.long_lived_access_token ? 'configured' : null,
      haAuthMode: auth.source,
      haAuthConfigured: !!auth.token,
      haCredentialsSource: options.credentials_source || null,
      theme: options.theme || 'dark',
      esphomeEnabled,
      packagesEnabled,
    };
    debugLog('[app-settings] Base response object created:', { esphomeEnabled: baseResponse.esphomeEnabled });

    if (options.mode === 'addon') {
      const savedSettings = storedSettings || await loadDockerSettings();
      debugLog('[app-settings] Addon mode: final check of savedSettings for merge:', {
        esphomeEnabled: savedSettings.esphomeEnabled
      });

      const finalEsphomeEnabled = baseResponse.esphomeEnabled;
      debugLog(`[app-settings] Addon mode: finalEsphomeEnabled resolved to: ${finalEsphomeEnabled}`);

      const finalPackagesEnabled = typeof savedSettings.packagesEnabled === 'boolean'
        ? savedSettings.packagesEnabled
        : packagesEnabled;

      const mergedSettings = {
        liveConfigPath: savedSettings.liveConfigPath || '/config',
        backupFolderPath: savedSettings.backupFolderPath || '/media/backups/yaml',
        theme: options.theme || savedSettings.theme || baseResponse.theme || 'dark',
        esphomeEnabled: options.esphome ?? finalEsphomeEnabled,
        packagesEnabled: finalPackagesEnabled,
        smartBackupEnabled: savedSettings.smartBackupEnabled ?? false,
      };

      global.dockerSettings = { ...global.dockerSettings, ...mergedSettings };
      debugLog('[app-settings] Addon mode: global.dockerSettings updated:', { esphomeEnabled: global.dockerSettings.esphomeEnabled });

      const finalResponse = {
        ...baseResponse,
        backupFolderPath: mergedSettings.backupFolderPath,
        liveConfigPath: mergedSettings.liveConfigPath,
        theme: mergedSettings.theme,
        esphomeEnabled: mergedSettings.esphomeEnabled,
        smartBackupEnabled: mergedSettings.smartBackupEnabled,
      };
      debugLog('[app-settings] Addon mode: Final response payload:', { esphomeEnabled: finalResponse.esphomeEnabled });
      debugLog('[app-settings] --- End ESPHome Flag Resolution ---');
      res.json(finalResponse);
      return;
    }

    debugLog('[app-settings] Docker mode detected.');
    const dockerSettings = await loadDockerSettings();
    debugLog('[app-settings] Docker mode: loaded dockerSettings:', { esphomeEnabled: dockerSettings.esphomeEnabled });

    const finalEsphomeEnabled = dockerSettings.esphomeEnabled ?? baseResponse.esphomeEnabled;
    debugLog(`[app-settings] Docker mode: finalEsphomeEnabled resolved to: ${finalEsphomeEnabled}`);

    const effectiveTheme = process.env.THEME || dockerSettings.theme || baseResponse.theme || 'dark';
    const finalResponse = {
      ...baseResponse,
      backupFolderPath: dockerSettings.backupFolderPath || '/media/timemachine',
      liveConfigPath: dockerSettings.liveConfigPath || '/config',
      theme: effectiveTheme,
      language: dockerSettings.language || 'en',
      esphomeEnabled: finalEsphomeEnabled,
      packagesEnabled: dockerSettings.packagesEnabled ?? false,
      smartBackupEnabled: dockerSettings.smartBackupEnabled ?? false,
    };
    debugLog('[app-settings] Docker mode: Final response payload:', { esphomeEnabled: finalResponse.esphomeEnabled });
    debugLog('[app-settings] --- End ESPHome Flag Resolution ---');
    res.json(finalResponse);
  } catch (error) {
    console.error('[app-settings] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save Docker app settings
app.post('/api/app-settings', async (req, res) => {
  try {
    const { liveConfigPath, backupFolderPath, theme, esphomeEnabled, packagesEnabled, language, smartBackupEnabled } = req.body;

    const existingSettings = await loadDockerSettings();
    const settings = {
      liveConfigPath: liveConfigPath || existingSettings.liveConfigPath || '/config',
      backupFolderPath: backupFolderPath || existingSettings.backupFolderPath || '/media/backups/yaml',
      theme: theme || existingSettings.theme || 'dark',
      language: language || existingSettings.language || 'en',
      esphomeEnabled: typeof esphomeEnabled === 'boolean' ? esphomeEnabled : existingSettings.esphomeEnabled ?? false,
      packagesEnabled: typeof packagesEnabled === 'boolean' ? packagesEnabled : existingSettings.packagesEnabled ?? false,
      smartBackupEnabled: typeof smartBackupEnabled === 'boolean' ? smartBackupEnabled : existingSettings.smartBackupEnabled ?? false,
    };

    await saveDockerSettings(settings);
    console.log('[save-docker-settings] Saved Docker app settings:', settings);

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('[save-docker-settings] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save Docker HA credentials (fallback when env vars not set)
app.post('/api/docker-ha-credentials', async (req, res) => {
  try {
    const { homeAssistantUrl, longLivedAccessToken } = req.body;

    // Only allow saving credentials in Docker mode and when env vars aren't set
    if (process.env.HOME_ASSISTANT_URL || process.env.LONG_LIVED_ACCESS_TOKEN) {
      return res.status(400).json({ error: 'HA credentials are configured via environment variables' });
    }

    const credentials = {
      home_assistant_url: homeAssistantUrl,
      long_lived_access_token: longLivedAccessToken
    };

    // Ensure data directory exists
    await fs.writeFile(path.join(DATA_DIR, 'docker-ha-credentials.json'), JSON.stringify(credentials, null, 2), 'utf-8');
    console.log('[docker-ha-credentials] Saved Docker HA credentials to', path.join(DATA_DIR, 'docker-ha-credentials.json'));

    res.json({ success: true, message: 'HA credentials saved successfully' });
  } catch (error) {
    console.error('[docker-ha-credentials] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// App settings endpoint (expose config to frontend, excluding sensitive data)
async function loadDockerSettings() {
  const cachedSettings = (global.dockerSettings && typeof global.dockerSettings === 'object') ? global.dockerSettings : {};
  const defaultSettings = {
    liveConfigPath: '/config',
    backupFolderPath: '/media/timemachine',
    theme: process.env.THEME || 'dark',
    language: 'en',
    esphomeEnabled: false,
    packagesEnabled: false,
    smartBackupEnabled: false,
    ...cachedSettings
  };

  try {
    const settingsPath = path.join(DATA_DIR, 'docker-app-settings.json');

    // Check if settings file exists
    try {
      await fs.access(settingsPath);
      const content = await fs.readFile(settingsPath, 'utf-8');
      const parsed = JSON.parse(content);

      // Merge with defaults to ensure all fields are present
      const settings = { ...defaultSettings, ...parsed };

      // Update in-memory settings
      global.dockerSettings = settings;


      console.log('Loaded settings from file:', settings);
      return settings;
    } catch (err) {
      if (err.code === 'ENOENT') {

      } else {
        console.error('Error loading settings:', err);
      }

      // Ensure in-memory settings are set to defaults
      global.dockerSettings = defaultSettings;
      return defaultSettings;
    }
  } catch (error) {
    console.error('Error in loadDockerSettings:', error);
    // Ensure in-memory settings are set to defaults even if there's an error
    global.dockerSettings = defaultSettings;
    return defaultSettings;
  }
}

// Save Docker settings to file
async function saveDockerSettings(settings) {
  // Ensure all required fields are present with defaults
  const settingsToSave = {
    liveConfigPath: settings.liveConfigPath || '/config',
    backupFolderPath: settings.backupFolderPath || '/media/timemachine',
    theme: settings.theme || 'dark',
    language: settings.language || 'en',
    esphomeEnabled: settings.esphomeEnabled ?? false,
    packagesEnabled: settings.packagesEnabled ?? false,
    smartBackupEnabled: settings.smartBackupEnabled ?? false
  };

  // Save to file
  const settingsPath = path.join(DATA_DIR, 'docker-app-settings.json');
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('[saveDockerSettings] Failed to ensure data directory exists:', error);
  }
  await fs.writeFile(settingsPath, JSON.stringify(settingsToSave, null, 2), 'utf-8');

  console.log('Settings saved successfully to', settingsPath);

  // Update the in-memory settings
  global.dockerSettings = settingsToSave;

  return settingsToSave;
}

const SKIP_BACKUP_DIRS = new Set(['esphome', '.storage', 'packages']);

// Recursive function to find backup directories
async function getBackupDirs(dir, depth = 0) {
  let results = [];
  const indent = '  '.repeat(depth);

  try {
    const list = await fs.readdir(dir, { withFileTypes: true });

    for (const dirent of list) {
      const fullPath = path.resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        // Skip known non-backup directories
        if (SKIP_BACKUP_DIRS.has(dirent.name)) {
          continue;
        }
        const name = dirent.name;
        const dashedPattern = /^\d{4}-\d{2}-\d{2}-\d{6}$/;
        const numericPattern = /^\d{12}$/;
        let isBackupFolder = dashedPattern.test(name) || numericPattern.test(name);

        // Fallback: if folder contains common YAML backup files, treat as backup folder
        if (!isBackupFolder) {
          try {
            const inner = await fs.readdir(fullPath);
            const hasYaml = inner.some(f => f.endsWith('.yaml') || f.endsWith('.yml'));
            const hasKnownFiles = inner.includes('automations.yaml') || inner.includes('scripts.yaml');
            if (hasYaml || hasKnownFiles) {
              isBackupFolder = true;
            }
          } catch (err) {
            // Skip directories we can't read
          }
        }

        if (isBackupFolder) {
          const stats = await fs.stat(fullPath);
          results.push({ path: fullPath, folderName: name, mtime: stats.mtime });
        }

        // Continue scanning deeper regardless to support nested structures like /year/month/backup
        try {
          const nestedResults = await getBackupDirs(fullPath, depth + 1);
          results = results.concat(nestedResults);
        } catch (err) {
          // Skip directories we can't read
        }
      }
    }
  } catch (error) {
    console.error(`${indent}[scan-backups] Error reading ${dir}:`, error.message);
  }

  return results.filter(result => !SKIP_BACKUP_DIRS.has(path.basename(result.path)));
}

// Scan backups
app.post('/api/scan-backups', async (req, res) => {
  try {
    // Accept backupRootPath from request body or use default
    const backupRootPath = req.body?.backupRootPath || '/media/timemachine';
    console.log('[scan-backups] Scanning backup directory:', backupRootPath);

    // Basic security check
    if (backupRootPath.includes('..')) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    const backups = await getBackupDirs(backupRootPath);

    // Sort descending to show newest first
    backups.sort((a, b) => b.folderName.localeCompare(a.folderName));

    console.log('[scan-backups] Found backups:', backups.length);
    res.json({ backups });
  } catch (error) {
    console.error('[scan-backups] Error:', error);
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: `Directory not found: ${error.path}`,
        code: 'DIR_NOT_FOUND'
      });
    }
    res.status(500).json({ error: 'Failed to scan backup directory.', details: error.message });
  }
});

// Check if a snapshot has any changes compared to live config
app.post('/api/check-snapshot-changes', async (req, res) => {
  try {
    const { backupPath, liveConfigPath, mode } = req.body;
    const configPath = liveConfigPath || '/config';

    if (!backupPath) {
      return res.status(400).json({ error: 'backupPath is required' });
    }

    const hasChanges = await checkSnapshotHasChanges(backupPath, configPath, mode || 'automations');
    res.json({ hasChanges });
  } catch (error) {
    console.error('[check-snapshot-changes] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear cache after filtering to free memory
app.post('/api/clear-cache', (req, res) => {
  clearBackupCacheEntries();
  res.json({ success: true, message: 'Cache cleared' });
});

// Batch check multiple snapshots for changes (more efficient)
app.post('/api/check-snapshots-batch', async (req, res) => {
  try {
    const { backupPaths, liveConfigPath } = req.body;
    const configPath = liveConfigPath || '/config';

    if (!backupPaths || !Array.isArray(backupPaths)) {
      return res.status(400).json({ error: 'backupPaths array is required' });
    }

    // Check all snapshots in parallel (limit concurrency to avoid overwhelming)
    const BATCH_SIZE = 10;
    const results = {};

    for (let i = 0; i < backupPaths.length; i += BATCH_SIZE) {
      const batch = backupPaths.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (backupPath) => {
          try {
            const hasChanges = await checkSnapshotHasChanges(backupPath, configPath);
            return { path: backupPath, hasChanges };
          } catch (err) {
            // On error, include the backup to be safe
            return { path: backupPath, hasChanges: true };
          }
        })
      );
      batchResults.forEach(r => { results[r.path] = r.hasChanges; });
    }

    res.json({ results });
  } catch (error) {
    console.error('[check-snapshots-batch] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to check if a single snapshot has changes (mode-aware)
async function checkSnapshotHasChanges(backupPath, configPath, mode) {
  // Check only the relevant files based on mode
  if (mode === 'automations') {
    return await checkAutomationsChanges(backupPath, configPath);
  } else if (mode === 'scripts') {
    return await checkScriptsChanges(backupPath, configPath);
  } else if (mode === 'lovelace') {
    return await checkLovelaceChanges(backupPath, configPath);
  } else if (mode === 'esphome') {
    return await checkEsphomeChanges(backupPath, configPath);
  } else if (mode === 'packages') {
    return await checkPackagesChanges(backupPath, configPath);
  }

  // Default: check automations
  return await checkAutomationsChanges(backupPath, configPath);
}

// Check automations.yaml for changes
async function checkAutomationsChanges(backupPath, configPath) {
  try {
    const backupFile = path.join(backupPath, 'automations.yaml');
    const liveFile = path.join(configPath, 'automations.yaml');

    const [backupData, liveData] = await Promise.all([
      loadYamlWithCache(backupFile).catch(() => []),
      loadYamlWithCache(liveFile).catch(() => [])
    ]);

    const backupArray = Array.isArray(backupData) ? backupData : [];
    const liveArray = Array.isArray(liveData) ? liveData : [];

    // Only check for deleted or modified items (not new items, since UI only shows backup items)
    for (const backupItem of backupArray) {
      const key = backupItem.id || backupItem.alias;
      if (!key) continue;

      const liveItem = liveArray.find(l => l.id === key || l.alias === key);
      if (!liveItem) return true; // Deleted

      if (jsyaml.dump(backupItem) !== jsyaml.dump(liveItem)) return true; // Modified
    }

    return false;
  } catch (err) {
    return false;
  }
}

// Check scripts.yaml for changes
async function checkScriptsChanges(backupPath, configPath) {
  try {
    const backupFile = path.join(backupPath, 'scripts.yaml');
    const liveFile = path.join(configPath, 'scripts.yaml');

    const [backupRaw, liveRaw] = await Promise.all([
      loadYamlWithCache(backupFile).catch(() => ({})),
      loadYamlWithCache(liveFile).catch(() => ({}))
    ]);

    const backupScripts = (backupRaw && typeof backupRaw === 'object' && !Array.isArray(backupRaw)) ? backupRaw : {};
    const liveScripts = (liveRaw && typeof liveRaw === 'object' && !Array.isArray(liveRaw)) ? liveRaw : {};

    // Only check for deleted or modified items (not new items, since UI only shows backup items)
    for (const scriptId of Object.keys(backupScripts)) {
      if (!liveScripts[scriptId]) return true; // Deleted
      if (jsyaml.dump(backupScripts[scriptId]) !== jsyaml.dump(liveScripts[scriptId])) return true; // Modified
    }

    return false;
  } catch (err) {
    return false;
  }
}

// Check lovelace files for changes
async function checkLovelaceChanges(backupPath, configPath) {
  try {
    // Lovelace files are in .storage directory
    const backupStorageDir = path.join(backupPath, '.storage');
    const liveStorageDir = path.join(configPath, '.storage');

    // Get list of lovelace files from backup
    const backupFiles = await fs.readdir(backupStorageDir).catch(() => []);
    const lovelaceFiles = backupFiles.filter(f => f.startsWith('lovelace'));

    for (const file of lovelaceFiles) {
      const backupFile = path.join(backupStorageDir, file);
      const liveFile = path.join(liveStorageDir, file);

      try {
        const [backupContent, liveContent] = await Promise.all([
          fs.readFile(backupFile, 'utf-8').catch(() => null),
          fs.readFile(liveFile, 'utf-8').catch(() => null)
        ]);

        if (backupContent === null && liveContent !== null) return true; // Added
        if (backupContent !== null && liveContent === null) return true; // Deleted
        if (backupContent !== liveContent) return true; // Modified
      } catch (err) {
        // Continue checking other files
      }
    }

    // Also check for NEW lovelace files in live
    const liveFiles = await fs.readdir(liveStorageDir).catch(() => []);
    const liveLovelaceFiles = liveFiles.filter(f => f.startsWith('lovelace'));
    for (const file of liveLovelaceFiles) {
      if (!lovelaceFiles.includes(file)) return true; // New file added
    }

    return false;
  } catch (err) {
    return false;
  }
}

// Check esphome files for changes
async function checkEsphomeChanges(backupPath, configPath) {
  try {
    const backupEsphomeDir = path.join(backupPath, 'esphome');
    const liveEsphomeDir = path.join(configPath, 'esphome');

    const backupFiles = await fs.readdir(backupEsphomeDir).catch(() => []);
    const yamlFiles = backupFiles.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of yamlFiles) {
      const backupFile = path.join(backupEsphomeDir, file);
      const liveFile = path.join(liveEsphomeDir, file);

      try {
        const [backupContent, liveContent] = await Promise.all([
          fs.readFile(backupFile, 'utf-8').catch(() => null),
          fs.readFile(liveFile, 'utf-8').catch(() => null)
        ]);

        if (backupContent === null && liveContent !== null) return true;
        if (backupContent !== null && liveContent === null) return true;
        if (backupContent !== liveContent) return true;
      } catch (err) {
        // Continue
      }
    }

    return false;
  } catch (err) {
    return false;
  }
}

// Check packages files for changes
async function checkPackagesChanges(backupPath, configPath) {
  try {
    const backupPackagesDir = path.join(backupPath, 'packages');
    const livePackagesDir = path.join(configPath, 'packages');

    const backupFiles = await fs.readdir(backupPackagesDir).catch(() => []);
    const yamlFiles = backupFiles.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of yamlFiles) {
      const backupFile = path.join(backupPackagesDir, file);
      const liveFile = path.join(livePackagesDir, file);

      try {
        const [backupContent, liveContent] = await Promise.all([
          fs.readFile(backupFile, 'utf-8').catch(() => null),
          fs.readFile(liveFile, 'utf-8').catch(() => null)
        ]);

        if (backupContent === null && liveContent !== null) return true;
        if (backupContent !== null && liveContent === null) return true;
        if (backupContent !== liveContent) return true;
      } catch (err) {
        // Continue
      }
    }

    return false;
  } catch (err) {
    return false;
  }
}

// Get backup automations
app.post('/api/get-backup-automations', async (req, res) => {
  try {
    const { backupPath } = req.body;

    // Check manifest for existence
    try {
      const manifestPath = path.join(backupPath, '.backup_manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);
      if (manifest.files && manifest.files.root && !manifest.files.root.includes('automations.yaml')) {
        return res.json({ automations: [] });
      }
    } catch (e) {
      // Manifest missing -> assume old full backup -> proceed to resolve
    }

    const automationsFile = await resolveFileInBackupChain(backupPath, 'automations.yaml');
    const automations = await loadYamlWithCache(automationsFile) || [];
    res.json({ automations });
  } catch (error) {
    console.error('[get-backup-automations] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get backup scripts  
app.post('/api/get-backup-scripts', async (req, res) => {
  try {
    const { backupPath } = req.body;

    // Check manifest for existence
    try {
      const manifestPath = path.join(backupPath, '.backup_manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);
      if (manifest.files && manifest.files.root && !manifest.files.root.includes('scripts.yaml')) {
        return res.json({ scripts: [] });
      }
    } catch (e) {
      // Manifest missing -> assume old full backup -> proceed to resolve
    }

    const scriptsFile = await resolveFileInBackupChain(backupPath, 'scripts.yaml');
    const scriptsObject = await loadYamlWithCache(scriptsFile);

    // Scripts are stored as a dictionary/object, not an array
    // Transform: { script_id: { alias: '...', sequence: [...] } }
    // Into: [{ id: 'script_id', alias: '...', sequence: [...] }]
    let scripts = [];
    if (scriptsObject && typeof scriptsObject === 'object' && !Array.isArray(scriptsObject)) {
      scripts = Object.keys(scriptsObject).map(scriptId => ({
        id: scriptId,
        ...scriptsObject[scriptId]
      }));
    } else if (Array.isArray(scriptsObject)) {
      // Fallback for array format (shouldn't happen)
      scripts = scriptsObject;
    }

    res.json({ scripts });
  } catch (error) {
    console.error('[get-backup-scripts] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get live items (automations or scripts)
app.post('/api/get-live-items', async (req, res) => {
  try {
    const { itemIdentifiers, mode, liveConfigPath } = req.body;
    const configPath = liveConfigPath || '/config';
    const fileName = mode === 'automations' ? 'automations.yaml' : 'scripts.yaml';
    const filePath = path.join(configPath, fileName);

    let allItems = await loadYamlWithCache(filePath) || [];

    // Handle scripts dictionary format
    if (mode === 'scripts' && typeof allItems === 'object' && !Array.isArray(allItems)) {
      allItems = Object.keys(allItems).map(scriptId => ({
        id: scriptId,
        ...allItems[scriptId]
      }));
    }

    const liveItems = {};
    itemIdentifiers.forEach(identifier => {
      const item = allItems.find(i => (i.id === identifier || i.alias === identifier));
      if (item) {
        liveItems[identifier] = item;
      }
    });

    res.json({ liveItems });
  } catch (error) {
    console.error('[get-live-items] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get live automation
app.post('/api/get-live-automation', async (req, res) => {
  try {
    const { automationIdentifier, liveConfigPath } = req.body;
    const configPath = liveConfigPath || '/config';
    const filePath = path.join(configPath, 'automations.yaml');
    const automations = await loadYamlWithCache(filePath) || [];
    const automation = automations.find(a => a.id === automationIdentifier || a.alias === automationIdentifier);

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    res.json({ automation });
  } catch (error) {
    console.error('[get-live-automation] Error:', error);
    res.status(404).json({ error: error.message });
  }
});

// Get live script
app.post('/api/get-live-script', async (req, res) => {
  try {
    const { automationIdentifier, liveConfigPath } = req.body;
    const configPath = liveConfigPath || '/config';
    const filePath = path.join(configPath, 'scripts.yaml');
    const scripts = await loadYamlWithCache(filePath) || [];
    const script = scripts.find(s => s.id === automationIdentifier || s.alias === automationIdentifier);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    res.json({ script });
  } catch (error) {
    console.error('[get-live-script] Error:', error);
    res.status(404).json({ error: error.message });
  }
});

// Restore automation
app.post('/api/restore-automation', async (req, res) => {
  try {
    const { backupPath, automationIdentifier, timezone, liveConfigPath } = req.body;

    if (!backupPath || !automationIdentifier) {
      return res.status(400).json({ error: 'Missing required parameters: backupPath and automationIdentifier' });
    }

    // Perform a backup before restoring (unchanged)
    await performBackup(liveConfigPath || null, null, 'pre-restore', false, 100, timezone);

    const configPath = liveConfigPath || '/config';
    const liveFilePath = path.join(configPath, 'automations.yaml');
    const backupFilePath = path.join(backupPath, 'automations.yaml');

    // Read raw contents
    let liveContent = '';
    try {
      liveContent = await fs.readFile(liveFilePath, 'utf-8');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      // If file doesn't exist, start with empty list
      liveContent = '[]';
    }

    const backupContent = await fs.readFile(backupFilePath, 'utf-8');

    // Parse documents (preserves ranges)
    const liveDoc = YAML.parseDocument(liveContent);
    const backupDoc = YAML.parseDocument(backupContent);

    // Find backup node
    const backupItems = backupDoc.contents?.items || [];
    const backupIndex = backupItems.findIndex(item => {
      const obj = item.toJSON();
      return obj.id === automationIdentifier || obj.alias === automationIdentifier;
    });
    if (backupIndex === -1) {
      return res.status(404).json({ error: 'Automation not found in backup' });
    }
    const backupNode = backupItems[backupIndex];
    const [backupStart, backupEnd] = findFullRange(backupContent, backupNode, true);
    const backupSnippet = backupContent.substring(backupStart, backupEnd);

    // Find live node
    const liveItems = liveDoc.contents?.items || [];
    const liveIndex = liveItems.findIndex(item => {
      const obj = item.toJSON();
      return obj.id === automationIdentifier || obj.alias === automationIdentifier;
    });

    let newLiveContent;
    if (liveIndex !== -1) {
      // Replace existing: Use full ranges to swap entire blocks (including comments/dash)
      const liveNode = liveItems[liveIndex];
      const [liveStart, liveEnd] = findFullRange(liveContent, liveNode, true);
      newLiveContent = liveContent.substring(0, liveStart) + backupSnippet + liveContent.substring(liveEnd);
    } else {
      // Add new: Append to end
      // Just append the full snippet (which includes dash). Ensure newline separator.
      const prefix = (liveContent.length > 0 && !liveContent.endsWith('\n')) ? '\n' : '';
      newLiveContent = liveContent + prefix + backupSnippet;
    }

    // Write back
    await fs.writeFile(liveFilePath, newLiveContent, 'utf-8');

    res.json({ success: true, message: 'Automation restored successfully with preserved formatting' });
  } catch (error) {
    console.error('[restore-automation] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restore script
// Restore script endpoint with text replacement
app.post('/api/restore-script', async (req, res) => {
  try {
    const { backupPath, automationIdentifier: scriptIdentifier, timezone, liveConfigPath } = req.body;

    if (!backupPath || !scriptIdentifier) {
      return res.status(400).json({ error: 'Missing required parameters: backupPath and automationIdentifier' });
    }

    // Perform a backup before restoring (unchanged)
    await performBackup(liveConfigPath || null, null, 'pre-restore', false, 100, timezone);

    const configPath = liveConfigPath || '/config';
    const liveFilePath = path.join(configPath, 'scripts.yaml');
    const backupFilePath = path.join(backupPath, 'scripts.yaml');

    // Read raw contents
    let liveContent = '';
    try {
      liveContent = await fs.readFile(liveFilePath, 'utf-8');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      // If file doesn't exist, start with empty dict
      liveContent = '{}';
    }

    const backupContent = await fs.readFile(backupFilePath, 'utf-8');

    // Parse documents (preserves ranges)
    const liveDoc = YAML.parseDocument(liveContent);
    const backupDoc = YAML.parseDocument(backupContent);

    // Find backup node - for scripts, it's a map
    const backupNode = backupDoc.get(scriptIdentifier);
    if (!backupNode) {
      return res.status(404).json({ error: 'Script not found in backup' });
    }
    const [backupStart, backupEnd] = findFullRange(backupContent, backupNode, false);
    const backupSnippet = backupContent.substring(backupStart, backupEnd);

    // Find live node
    const liveNode = liveDoc.get(scriptIdentifier);

    let newLiveContent;
    if (liveNode) {
      // Replace existing: Use full ranges to swap entire blocks (including comments/key)
      const [liveStart, liveEnd] = findFullRange(liveContent, liveNode, false);
      newLiveContent = liveContent.substring(0, liveStart) + backupSnippet + liveContent.substring(liveEnd);
    } else {
      // Add new: Append to end
      // Just append the full snippet (which includes key). Ensure newline separator.
      const prefix = (liveContent.length > 0 && !liveContent.endsWith('\n')) ? '\n' : '';
      newLiveContent = liveContent + prefix + backupSnippet;
    }

    // Write back
    await fs.writeFile(liveFilePath, newLiveContent, 'utf-8');

    res.json({ success: true, message: 'Script restored successfully with preserved formatting' });
  } catch (error) {
    console.error('[restore-script] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reload Home Assistant
app.post('/api/reload-home-assistant', async (req, res) => {
  try {
    const { service } = req.body;

    if (!service) {
      return res.status(400).json({ error: 'Missing required parameter: service' });
    }

    const auth = await getHomeAssistantAuth();

    if (!auth.baseUrl || !auth.token) {
      return res.status(400).json({ error: 'Home Assistant access is not configured for this environment.' });
    }

    const serviceUrl = `${auth.baseUrl}/services/${service.replace('.', '/')}`;
    const headers = {
      'Authorization': `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (auth.source === 'supervisor') {
      headers['X-Supervisor-Token'] = auth.token;
    }

    // Make async call to HA (don't wait for response)
    fetch(serviceUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    }).catch(err => console.error('[reload-home-assistant] Background error:', err));

    res.json({ message: 'Home Assistant reload initiated successfully' });
  } catch (error) {
    console.error('[reload-home-assistant] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to check if directory contains backups (recursively)
async function hasBackupsRecursive(dir, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) return false;

  try {
    const list = await fs.readdir(dir, { withFileTypes: true });

    // Check for YAML files in current directory
    const hasYaml = list.some(item => !item.isDirectory() && (item.name.endsWith('.yaml') || item.name.endsWith('.yml')));
    if (hasYaml) return true;

    // Check for backup-pattern directories
    const hasBackupPattern = list.some(item => {
      if (!item.isDirectory()) return false;
      const name = item.name;
      return /^\d{4}-\d{2}-\d{2}-\d{6}$/.test(name) || /^\d{12}$/.test(name);
    });
    if (hasBackupPattern) return true;

    // Recursively check subdirectories
    for (const item of list) {
      if (item.isDirectory()) {
        const fullPath = path.resolve(dir, item.name);
        const hasNested = await hasBackupsRecursive(fullPath, depth + 1, maxDepth);
        if (hasNested) return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

// Validate backup path
app.post('/api/validate-backup-path', async (req, res) => {
  try {
    const { path: folderPath } = req.body;

    if (!folderPath) {
      return res.status(400).json({ isValid: false, error: 'Path is required' });
    }

    const stats = await fs.stat(folderPath);

    if (!stats.isDirectory()) {
      return res.status(400).json({ isValid: false, error: 'Provided path is not a directory' });
    }

    // Check recursively for backups or YAML files
    const hasBackups = await hasBackupsRecursive(folderPath);

    if (!hasBackups) {
      return res.status(400).json({
        isValid: false,
        error: 'No backup folders or YAML files found in directory tree (searched 5 levels deep)'
      });
    }

    res.json({ isValid: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(400).json({ isValid: false, error: 'Directory does not exist' });
    }
    if (error.code === 'EACCES') {
      return res.status(400).json({ isValid: false, error: 'Permission denied - cannot access directory' });
    }
    res.status(500).json({ isValid: false, error: error.message });
  }
});

// Test Home Assistant connection
app.post('/api/test-home-assistant-connection', async (req, res) => {
  try {
    // Allow overriding with request body for testing before saving (Docker mode)
    const providedHaUrl = req.body.haUrl;
    const providedHaToken = req.body.haToken;

    const manualOverride = (providedHaUrl && providedHaToken)
      ? { haUrl: providedHaUrl, haToken: providedHaToken }
      : null;

    const auth = await getHomeAssistantAuth(null, manualOverride);

    if (!auth.baseUrl || !auth.token) {
      res.status(400).json({ success: false, message: 'Home Assistant access is not configured. For Docker deployments without ingress, supply a URL and long-lived token.' });
      return;
    }

    const headers = {
      'Authorization': `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (auth.source === 'supervisor') {
      headers['X-Supervisor-Token'] = auth.token;
    }

    const endpoint = `${auth.baseUrl}/states`;
    const fetchOptions = { headers };
    let tlsFallbackUsed = false;
    let response;

    try {
      response = await fetch(endpoint, fetchOptions);
    } catch (fetchError) {
      if (auth.baseUrl.startsWith('https://') && isTlsCertificateError(fetchError)) {
        tlsFallbackUsed = true;
        console.warn('[test-connection] TLS verification failed, retrying with relaxed validation:', {
          endpoint,
          code: fetchError.code,
          message: fetchError.message,
          causeCode: fetchError.cause?.code,
        });
        const insecureAgent = new https.Agent({ rejectUnauthorized: false });
        response = await fetch(endpoint, { ...fetchOptions, agent: insecureAgent });
      } else {
        throw fetchError;
      }
    }

    if (response.ok) {
      res.json({
        success: true,
        message: 'Connected to Home Assistant successfully.',
        authMode: auth.source,
        tlsFallback: tlsFallbackUsed ? 'insecure' : 'strict',
      });
    } else {
      const errorText = await response.text();
      console.error('[test-connection] HA response error', {
        status: response.status,
        authMode: auth.source,
        baseUrl: auth.baseUrl,
        errorText,
      });
      res.status(response.status).json({
        success: false,
        message: `Connection failed: ${response.status} - ${errorText}`,
        tlsFallback: tlsFallbackUsed ? 'insecure' : 'strict',
      });
    }
  } catch (error) {
    console.error('[test-connection] Error:', error);
    res.status(500).json({ success: false, message: `Connection failed: ${error.message}` });
  }
});

// Schedule backup endpoints
let scheduledJobs = {};
const SCHEDULE_FILE = path.join(DATA_DIR, 'scheduled-jobs.json');

// Load scheduled jobs from file
async function loadScheduledJobs() {
  try {
    const content = await fs.readFile(SCHEDULE_FILE, 'utf-8');
    const data = JSON.parse(content);

    // Normalize: ensure we only have { jobs: {...} } structure
    // Remove any legacy top-level job keys
    if (!data.jobs) {
      data.jobs = {};
    }

    // Clean up: return only the jobs wrapper
    return { jobs: data.jobs };
  } catch (error) {
    return { jobs: {} };
  }
}

// Save scheduled jobs to file
async function saveScheduledJobs(jobs) {
  await fs.writeFile(SCHEDULE_FILE, JSON.stringify(jobs, null, 2));
}

// Get schedule
app.get('/api/schedule-backup', async (req, res) => {
  try {
    const jobs = await loadScheduledJobs();
    res.json(jobs);
  } catch (error) {
    console.error('[get-schedule] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set schedule
app.post('/api/schedule-backup', async (req, res) => {
  try {
    const { id, cronExpression, enabled, timezone, liveConfigPath, backupFolderPath, maxBackupsEnabled, maxBackupsCount, smartBackupEnabled } = req.body;

    const jobs = await loadScheduledJobs();
    jobs.jobs = jobs.jobs || {};
    jobs.jobs[id] = { cronExpression, enabled, timezone, liveConfigPath, backupFolderPath, maxBackupsEnabled, maxBackupsCount, smartBackupEnabled };
    console.log('[scheduler] New schedule saved:', jobs.jobs[id]);

    // Clean structure: only save { jobs: {...} }
    const cleanJobs = { jobs: jobs.jobs };
    await saveScheduledJobs(cleanJobs);

    // Stop existing cron job if any
    if (scheduledJobs[id]) {
      scheduledJobs[id].stop();
      delete scheduledJobs[id];
    }

    // Start new cron job if enabled
    const jobConfig = jobs.jobs[id];
    if (enabled) {
      console.log(`[scheduler] Setting up schedule "${id}" with cron "${cronExpression}" and timezone "${timezone}"`);
      scheduledJobs[id] = cron.schedule(cronExpression, async () => {
        console.log(`[cron] Triggered backup job: ${id} at ${new Date().toISOString()}`);
        try {
          const effectiveLivePath = jobConfig.liveConfigPath || '/config';
          const effectiveBackupPath = jobConfig.backupFolderPath || '/media/timemachine';
          console.log(`[cron] Using live path "${effectiveLivePath}" and backup path "${effectiveBackupPath}".`);
          try {
            const response = await fetch(`http://localhost:${PORT}/api/backup-now`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                liveConfigPath: effectiveLivePath,
                backupFolderPath: effectiveBackupPath,
                maxBackupsEnabled: jobConfig.maxBackupsEnabled,
                maxBackupsCount: jobConfig.maxBackupsCount,
                timezone: jobConfig.timezone,
                smartBackupEnabled: jobConfig.smartBackupEnabled
              })
            });
            const result = await response.json();
            if (response.ok) {
              console.log(`[cron] Backup triggered successfully: ${result.message}`);
            } else {
              console.error(`[cron] Backup trigger failed: ${result.error}`);
            }
          } catch (error) {
            console.error(`[cron] Error triggering backup:`, error);
          }
        } catch (error) {
          console.error(`[cron] Error during scheduled backup for job ${id}:`, error);
        }
      }, { timezone });
    }

    res.json({ success: true, message: 'Schedule updated successfully' });
  } catch (error) {
    console.error('[set-schedule] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate path
app.post('/api/validate-path', async (req, res) => {
  try {
    const { path: requestedPath, type } = req.body;

    if (!requestedPath) {
      return res.json({ errorCode: 'directory_not_found' });
    }

    try {
      const stats = await fs.stat(requestedPath);
      if (!stats.isDirectory()) {
        return res.json({ errorCode: 'not_directory', path: requestedPath });
      }

      if (type === 'live') {
        const automationsPath = `${requestedPath}/automations.yaml`;
        try {
          await fs.access(automationsPath);
        } catch (err) {
          if (err.code === 'ENOENT') {
            return res.json({ errorCode: 'missing_automations', path: requestedPath });
          }
          return res.json({ errorCode: 'cannot_access', path: requestedPath, details: err.message });
        }
      }

      return res.json({ success: true });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.json({ errorCode: 'directory_not_found', path: requestedPath });
      }
      return res.json({ errorCode: 'cannot_access', path: requestedPath, details: err.message });
    }
  } catch (error) {
    console.error('[validate-path] Error:', error);
    res.status(500).json({ error: error.message, errorCode: 'unknown' });
  }
});

// Helper function to get all backup paths in reverse chronological order
async function getAllBackupPaths(backupRoot) {
  const allBackups = [];
  try {
    const years = await fs.readdir(backupRoot);
    const yearDirs = years.filter(y => /^\d{4}$/.test(y));
    yearDirs.sort().reverse();

    for (const year of yearDirs) {
      const yearPath = path.join(backupRoot, year);
      const months = await fs.readdir(yearPath);
      const monthDirs = months.filter(m => /^\d{2}$/.test(m));
      monthDirs.sort().reverse();

      for (const month of monthDirs) {
        const monthPath = path.join(yearPath, month);
        const backups = await fs.readdir(monthPath);
        const backupDirs = backups.filter(b => /^\d{4}-\d{2}-\d{2}-\d{6}$/.test(b));
        backupDirs.sort().reverse();

        for (const backup of backupDirs) {
          allBackups.push(path.join(monthPath, backup));
        }
      }
    }
    return allBackups;
  } catch (err) {
    console.log('[smart-backup] Error getting backup paths:', err.message);
    return [];
  }
}

// Helper function to find the most recent version of a file by walking the backup chain
async function findFileInBackupChain(backupPaths, relativeFilePath) {
  for (const backupPath of backupPaths) {
    const filePath = path.join(backupPath, relativeFilePath);
    try {
      await fs.access(filePath);
      return filePath; // Found the file
    } catch (err) {
      // File doesn't exist in this backup, continue to older backup
    }
  }
  return null; // File not found in any backup
}

// Helper function to check if a file has changed compared to the backup chain
async function hasFileChanged(sourceFile, backupPaths, relativeFilePath) {
  try {
    const sourceContent = await fs.readFile(sourceFile, 'utf-8');

    // Find the most recent backed-up version of this file
    const backupFilePath = await findFileInBackupChain(backupPaths, relativeFilePath);

    if (!backupFilePath) {
      // File doesn't exist in any backup, it's "new"
      return true;
    }

    const backupContent = await fs.readFile(backupFilePath, 'utf-8');
    return sourceContent !== backupContent;
  } catch (err) {
    // If source can't be read, skip it
  }
}

// Helper function to find the correct version of a file in the backup chain, starting from a specific backup.
async function resolveFileInBackupChain(targetBackupPath, relativeFilePath) {
  try {
    // Determine backup root by going up 3 levels (backup -> MM -> YYYY -> root)
    let rootPath = targetBackupPath;
    for (let i = 0; i < 3; i++) rootPath = path.dirname(rootPath);

    const allBackups = await getAllBackupPaths(rootPath);
    const targetBase = path.basename(targetBackupPath);

    // Find index of the target backup in the sorted list (newest first)
    // Note: backup folder names are timestamps, so they are unique
    const startIndex = allBackups.findIndex(p => path.basename(p) === targetBase);

    if (startIndex === -1) {
      // Fallback: just check the target path if not in list
      return path.join(targetBackupPath, relativeFilePath);
    }

    // Iterate from startIndex onwards (covering target and older backups)
    for (let i = startIndex; i < allBackups.length; i++) {
      const potentialPath = path.join(allBackups[i], relativeFilePath);
      try {
        await fs.access(potentialPath);
        return potentialPath; // Found it!
      } catch (e) {
        // Not here, continue to older backup
      }
    }

    // If not found in history, return the path in target backup (let caller handle ENOENT)
    return path.join(targetBackupPath, relativeFilePath);

  } catch (err) {
    console.error('[resolveFileInBackupChain] Error:', err);
    // Fallback
    return path.join(targetBackupPath, relativeFilePath);
  }
}

// Reusable backup function
async function performBackup(liveConfigPath, backupFolderPath, source = 'manual', maxBackupsEnabled = false, maxBackupsCount = 100, timezone = null, smartBackupEnabled = false) {
  const configPath = liveConfigPath || '/config';
  const backupRoot = backupFolderPath || '/media/timemachine';

  console.log(`[backup-${source}] Starting backup...`);
  console.log(`[backup-${source}] Config path:`, configPath);
  console.log(`[backup-${source}] Backup root:`, backupRoot);
  console.log(`[backup-${source}] Max backups enabled:`, maxBackupsEnabled, 'count:', maxBackupsCount);
  console.log(`[backup-${source}] Smart backup enabled:`, smartBackupEnabled);

  try {
    // Check if backup root exists and is writable
    await fs.access(backupRoot, fs.constants.R_OK | fs.constants.W_OK);
    console.log(`[backup-${source}] Backup root is accessible and writable`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      try {
        await fs.mkdir(backupRoot, { recursive: true });
        console.log(`[backup-${source}] Backup root did not exist. Created: ${backupRoot}`);
        // Verify access after creation
        await fs.access(backupRoot, fs.constants.R_OK | fs.constants.W_OK);
      } catch (mkdirErr) {
        console.error(`[backup-${source}] Failed to create backup root:`, mkdirErr.message);
        const createError = new Error('backup_dir_create_failed');
        createError.code = 'BACKUP_DIR_CREATE_FAILED';
        createError.meta = { path: backupRoot };
        throw createError;
      }
    } else {
      console.error(`[backup-${source}] Backup root access check failed:`, err.message);
      const accessError = new Error('backup_dir_unwritable');
      accessError.code = 'BACKUP_DIR_UNWRITABLE';
      accessError.meta = { path: backupRoot };
      throw accessError;
    }
  }

  // Create backup folder with timestamp
  let now = new Date();
  let YYYY, MM, DD, HH, mm, ss;

  if (timezone) {
    // Use the specified timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23'
    });

    const parts = formatter.formatToParts(now);
    YYYY = parts.find(p => p.type === 'year').value;
    MM = parts.find(p => p.type === 'month').value;
    DD = parts.find(p => p.type === 'day').value;
    HH = parts.find(p => p.type === 'hour').value;
    if (HH === '24') {
      HH = '00';
    }
    mm = parts.find(p => p.type === 'minute').value;
    ss = parts.find(p => p.type === 'second').value;
  } else {
    // Use server's local time (fallback)
    YYYY = String(now.getFullYear());
    MM = String(now.getMonth() + 1).padStart(2, '0');
    DD = String(now.getDate()).padStart(2, '0');
    HH = String(now.getHours()).padStart(2, '0');
    mm = String(now.getMinutes()).padStart(2, '0');
    ss = String(now.getSeconds()).padStart(2, '0');
  }

  const timestamp = `${YYYY}-${MM}-${DD}-${HH}${mm}${ss}`;

  const backupPath = path.join(backupRoot, YYYY, MM, timestamp);

  // Get all backup paths for smart backup comparison BEFORE creating new directory
  let allBackupPaths = [];
  if (smartBackupEnabled) {
    allBackupPaths = await getAllBackupPaths(backupRoot);
    if (allBackupPaths.length > 0) {
      console.log(`[backup-${source}] Smart backup: found ${allBackupPaths.length} previous backups to compare against`);
    } else {
      console.log(`[backup-${source}] Smart backup: no previous backups found, performing full backup`);
    }
  }

  console.log(`[backup-${source}] Creating directory:`, backupPath);

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    smartBackup: smartBackupEnabled,
    files: {
      root: [],
      storage: [],
      esphome: [],
      packages: []
    }
  };

  try {
    await fs.mkdir(backupPath, { recursive: true });
    console.log(`[backup-${source}] Directory created successfully`);
  } catch (err) {
    console.error(`[backup-${source}] Failed to create directory:`, err);
    const mkdirError = new Error('backup_dir_create_failed');
    mkdirError.code = 'BACKUP_DIR_CREATE_FAILED';
    mkdirError.meta = { path: backupPath, parent: backupRoot };
    throw mkdirError;
  }

  // Copy YAML files
  const files = await fs.readdir(configPath);
  const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
  console.log(`[backup-${source}] Found ${yamlFiles.length} YAML files to check.`);

  let copiedYamlCount = 0;
  let skippedYamlCount = 0;
  for (const file of yamlFiles) {
    manifest.files.root.push(file);
    const sourcePath = path.join(configPath, file);
    const destPath = path.join(backupPath, file);

    try {
      // Smart backup mode: only copy if file has changed
      if (smartBackupEnabled && allBackupPaths.length > 0) {
        const changed = await hasFileChanged(sourcePath, allBackupPaths, file);
        if (!changed) {
          skippedYamlCount++;
          continue; // Skip unchanged files
        }
      }

      await fs.copyFile(sourcePath, destPath);
      copiedYamlCount++;
    } catch (err) {
      console.error(`[backup-${source}] Error copying ${file}:`, err.message);
    }
  }
  console.log(`[backup-${source}] Copied ${copiedYamlCount} YAML files${smartBackupEnabled ? `, skipped ${skippedYamlCount} unchanged` : ''}.`);

  // Backup Lovelace files
  const storagePath = path.join(configPath, '.storage');
  const backupStoragePath = path.join(backupPath, '.storage');
  let storageDirectoryCreated = false;

  try {
    const storageFiles = await fs.readdir(storagePath);
    const lovelaceFiles = storageFiles.filter(file => file.startsWith('lovelace'));
    console.log(`[backup-${source}] Found ${lovelaceFiles.length} Lovelace files to check.`);

    let copiedLovelaceCount = 0;
    let skippedLovelaceCount = 0;
    for (const file of lovelaceFiles) {
      manifest.files.storage.push(file);
      const sourcePath = path.join(storagePath, file);
      const destPath = path.join(backupStoragePath, file);
      try {
        // Smart backup mode: only copy if file has changed
        if (smartBackupEnabled && allBackupPaths.length > 0) {
          const changed = await hasFileChanged(sourcePath, allBackupPaths, path.join('.storage', file));
          if (!changed) {
            skippedLovelaceCount++;
            continue;
          }
        }

        // Create directory only when first file needs to be copied
        if (!storageDirectoryCreated) {
          await fs.mkdir(backupStoragePath, { recursive: true });
          storageDirectoryCreated = true;
        }

        await fs.copyFile(sourcePath, destPath);
        copiedLovelaceCount++;
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`[backup-${source}] Error copying Lovelace file ${file}:`, err.message);
        }
      }
    }
    console.log(`[backup-${source}] Copied ${copiedLovelaceCount} Lovelace files${smartBackupEnabled ? `, skipped ${skippedLovelaceCount} unchanged` : ''}.`);
  } catch (err) {
    console.error(`[backup-${source}] Error reading .storage directory:`, err.message);
  }

  const esphomeEnabled = await isEsphomeEnabled();
  const packagesEnabled = await isPackagesEnabled();

  if (esphomeEnabled) {
    // Backup ESPHome files
    const esphomePath = path.join(configPath, 'esphome');
    const backupEsphomePath = path.join(backupPath, 'esphome');

    try {
      const esphomeYamlFiles = await listYamlFilesRecursive(esphomePath);
      console.log(`[backup-${source}] Found ${esphomeYamlFiles.length} ESPHome YAML files to copy.`);

      let copiedEsphomeCount = 0;
      let skippedEsphomeCount = 0;
      for (const relativePath of esphomeYamlFiles) {
        manifest.files.esphome.push(relativePath);
        const sourcePath = path.join(esphomePath, relativePath);
        const destPath = path.join(backupEsphomePath, relativePath);
        try {
          // Smart backup mode: only copy if file has changed
          if (smartBackupEnabled && allBackupPaths.length > 0) {
            const changed = await hasFileChanged(sourcePath, allBackupPaths, path.join('esphome', relativePath));
            if (!changed) {
              skippedEsphomeCount++;
              continue;
            }
          }

          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(sourcePath, destPath);
          copiedEsphomeCount++;
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.error(`[backup-${source}] Error copying ESPHome file ${relativePath}:`, err.message);
          }
        }
      }
      console.log(`[backup-${source}] Copied ${copiedEsphomeCount} ESPHome files${smartBackupEnabled ? `, skipped ${skippedEsphomeCount} unchanged` : ''}.`);
    } catch (err) {
      console.error(`[backup-${source}] Error reading esphome directory:`, err.message);
    }
  } else {
    console.log(`[backup-${source}] Skipping ESPHome backups (feature disabled).`);
  }

  if (packagesEnabled) {
    // Backup Packages files
    const packagesPath = path.join(configPath, 'packages');
    const backupPackagesPath = path.join(backupPath, 'packages');

    try {
      const packagesYamlFiles = await listYamlFilesRecursive(packagesPath);
      console.log(`[backup-${source}] Found ${packagesYamlFiles.length} Packages YAML files to copy.`);

      let copiedPackagesCount = 0;
      let skippedPackagesCount = 0;
      for (const relativePath of packagesYamlFiles) {
        manifest.files.packages.push(relativePath);
        const sourcePath = path.join(packagesPath, relativePath);
        const destPath = path.join(backupPackagesPath, relativePath);
        try {
          // Smart backup mode: only copy if file has changed
          if (smartBackupEnabled && allBackupPaths.length > 0) {
            const changed = await hasFileChanged(sourcePath, allBackupPaths, path.join('packages', relativePath));
            if (!changed) {
              skippedPackagesCount++;
              continue;
            }
          }

          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(sourcePath, destPath);
          copiedPackagesCount++;
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.error(`[backup-${source}] Error copying Packages file ${relativePath}:`, err.message);
          }
        }
      }
      console.log(`[backup-${source}] Copied ${copiedPackagesCount} Packages files${smartBackupEnabled ? `, skipped ${skippedPackagesCount} unchanged` : ''}.`);
    } catch (err) {
      console.error(`[backup-${source}] Error reading packages directory:`, err.message);
    }
  } else {
    console.log(`[backup-${source}] Skipping Packages backups (feature disabled).`);
  }

  // Write Manifest only if smart backup is enabled
  if (smartBackupEnabled) {
    try {
      await fs.writeFile(path.join(backupPath, '.backup_manifest.json'), JSON.stringify(manifest, null, 2));
    } catch (err) {
      console.error(`[backup-${source}] Failed to write backup manifest:`, err.message);
    }
  }

  console.log(`[backup-${source}] Backup completed successfully at:`, backupPath);

  // Cleanup old backups if maxBackups is enabled
  if (maxBackupsEnabled && maxBackupsCount > 0) {
    try {
      console.log(`[backup-${source}] Cleaning up old backups, keeping max ${maxBackupsCount}...`);
      await cleanupOldBackups(backupRoot, maxBackupsCount);
    } catch (cleanupError) {
      console.error(`[backup-${source}] Error during cleanup:`, cleanupError.message);
      // Don't fail the backup if cleanup fails
    }
  }

  return backupPath;
}

// Cleanup old backups function
async function cleanupOldBackups(backupRoot, maxBackupsCount) {
  try {
    console.log(`[cleanup] Scanning backup directory: ${backupRoot}`);
    const allBackups = await getBackupDirs(backupRoot);

    // Sort by folderName descending (newest first)
    allBackups.sort((a, b) => b.folderName.localeCompare(a.folderName));

    console.log(`[cleanup] Found ${allBackups.length} total backups, keeping max ${maxBackupsCount}`);

    if (allBackups.length <= maxBackupsCount) {
      console.log(`[cleanup] No cleanup needed - only ${allBackups.length} backups exist`);
      return;
    }

    // Get backups to delete (all beyond maxBackupsCount)
    const backupsToDelete = allBackups.slice(maxBackupsCount);
    console.log(`[cleanup] Will delete ${backupsToDelete.length} old backups`);

    for (const backup of backupsToDelete) {
      try {
        console.log(`[cleanup] Deleting old backup: ${backup.path}`);
        await fs.rm(backup.path, { recursive: true, force: true });
        console.log(`[cleanup] Successfully deleted: ${backup.path}`);
      } catch (deleteError) {
        console.error(`[cleanup] Error deleting ${backup.path}:`, deleteError.message);
        // Continue with other deletions even if one fails
      }
    }

    console.log(`[cleanup] Cleanup completed. Kept ${Math.min(allBackups.length, maxBackupsCount)} backups.`);
  } catch (error) {
    console.error('[cleanup] Error during cleanup:', error.message);
    throw error;
  }
}

// Backup now
app.post('/api/backup-now', async (req, res) => {
  try {
    const { liveConfigPath, backupFolderPath, maxBackupsEnabled, maxBackupsCount, timezone, smartBackupEnabled } = req.body;
    const backupPath = await performBackup(liveConfigPath, backupFolderPath, 'manual', maxBackupsEnabled, maxBackupsCount, timezone, smartBackupEnabled);
    res.json({ success: true, path: backupPath, message: `Backup created successfully at ${backupPath}` });
  } catch (error) {
    console.error('[backup-now] Error:', error);
    res.status(500).json({
      error: error.message,
      errorCode: error.code || 'BACKUP_FAILED',
      meta: error.meta || null
    });
  }
});

// Lovelace endpoints
app.post('/api/get-backup-lovelace', async (req, res) => {
  try {
    const { backupPath } = req.body;

    // Check manifest
    try {
      const manifestPath = path.join(backupPath, '.backup_manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);
      if (manifest.files && manifest.files.storage) {
        // Use manifest list (already relative to .storage if it was just filenames)
        // Wait, logic in performBackup: manifest.files.storage.push(file) where file is just filename
        // Filter for 'lovelace' prefix
        const lovelaceFiles = manifest.files.storage.filter(f => f.startsWith('lovelace'));
        return res.json({ lovelaceFiles });
      }
    } catch (e) {
      // Fallback to directory scan
    }

    const lovelaceDir = path.join(backupPath, '.storage');
    const files = await fs.readdir(lovelaceDir);
    const lovelaceFiles = files.filter(f => f.startsWith('lovelace'));

    res.json({ lovelaceFiles });
  } catch (error) {
    console.error('[get-backup-lovelace] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/get-backup-lovelace-file', async (req, res) => {
  try {
    const { backupPath, fileName } = req.body;

    // Use chain resolution
    const filePath = await resolveFileInBackupChain(backupPath, path.join('.storage', fileName));

    console.log(`[get-backup-lovelace-file] Request for file: ${fileName} in backup: ${backupPath} -> Resolved: ${filePath}`);

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('[get-backup-lovelace-file] Error sending file:', err);
        res.status(err.status || 500).json({ error: err.message });
      }
    });
  } catch (error) {
    console.error('[get-backup-lovelace-file] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const getLiveLovelaceFile = async (req, res) => {
  try {
    const payload = req.method === 'GET' ? req.query : req.body;
    const fileName = payload?.fileName;
    const liveConfigPath = payload?.liveConfigPath;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const configPath = liveConfigPath || '/config';
    const filePath = path.join(configPath, '.storage', fileName);

    console.log(`[get-live-lovelace-file] Request for file: ${fileName} in config: ${configPath}`);

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('[get-live-lovelace-file] Error sending file:', err);
        res.status(err.status || 404).json({ error: 'File not found' });
      }
    });
  } catch (error) {
    console.error('[get-live-lovelace-file] Error:', error);
    res.status(404).json({ error: 'File not found' });
  }
};

app.get('/api/get-live-lovelace-file', getLiveLovelaceFile);
app.post('/api/get-live-lovelace-file', getLiveLovelaceFile);

app.post('/api/restore-lovelace-file', async (req, res) => {
  try {
    const { fileName, backupPath, content, timezone, liveConfigPath } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    if (!backupPath && typeof content === 'undefined') {
      return res.status(400).json({ error: 'backupPath or content is required' });
    }

    // Perform a backup before restoring
    await performBackup(liveConfigPath || null, null, 'pre-restore', false, 100, timezone);

    const configPath = liveConfigPath || '/config';
    const targetFilePath = path.join(configPath, '.storage', fileName);
    await fs.mkdir(path.dirname(targetFilePath), { recursive: true });

    if (backupPath) {
      const sourceFilePath = path.join(backupPath, '.storage', fileName);
      try {
        await fs.copyFile(sourceFilePath, targetFilePath);
      } catch (copyError) {
        console.error('[restore-lovelace-file] Copy from backup failed, falling back to write:', copyError.message);
        const backupContent = await fs.readFile(sourceFilePath, 'utf-8');
        await fs.writeFile(targetFilePath, backupContent, 'utf-8');
      }
    } else {
      const contentToWrite = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      await fs.writeFile(targetFilePath, contentToWrite, 'utf-8');
    }

    // Check if HA config is available to determine if a restart is needed
    const auth = await getHomeAssistantAuth();
    const needsRestart = !!(auth.baseUrl && auth.token);

    res.json({ success: true, message: 'Lovelace file restored successfully', needsRestart });
  } catch (error) {
    console.error('[restore-lovelace-file] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ESPHome endpoints
app.post('/api/get-backup-esphome', async (req, res) => {
  try {
    await loadDockerSettings();
    if (!(await isEsphomeEnabled())) {
      return res.status(404).json({ error: 'ESPHome feature disabled' });
    }
    const { backupPath } = req.body;

    // Check manifest
    try {
      const manifestPath = path.join(backupPath, '.backup_manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);
      if (manifest.files && manifest.files.esphome) {
        return res.json({ esphomeFiles: manifest.files.esphome });
      }
    } catch (e) {
      // Fallback
    }

    const esphomeDir = path.join(backupPath, 'esphome');
    const esphomeFiles = await listYamlFilesRecursive(esphomeDir);
    res.json({ esphomeFiles });
  } catch (error) {
    console.error('[get-backup-esphome] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/get-backup-esphome-file', async (req, res) => {
  try {
    if (!(await isEsphomeEnabled())) {
      return res.status(404).json({ error: 'ESPHome feature disabled' });
    }
    const { backupPath, fileName } = req.body;

    // Use chain resolution
    // fileName is relative to esphome directory, so join 'esphome'
    const filePath = await resolveFileInBackupChain(backupPath, path.join('esphome', fileName));

    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    if (error.code === 'INVALID_PATH') {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    console.error('[get-backup-esphome-file] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/get-live-esphome-file', async (req, res) => {
  try {
    if (!(await isEsphomeEnabled())) {
      return res.status(404).json({ error: 'ESPHome feature disabled' });
    }
    const { fileName, liveConfigPath } = req.body;
    const configPath = liveConfigPath || '/config';
    const esphomeDir = path.join(configPath, 'esphome');
    const filePath = resolveWithinDirectory(esphomeDir, fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    if (error.code === 'INVALID_PATH') {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    console.error('[get-live-esphome-file] Error:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

app.post('/api/restore-esphome-file', async (req, res) => {
  try {
    if (!(await isEsphomeEnabled())) {
      return res.status(404).json({ error: 'ESPHome feature disabled' });
    }
    const { fileName, content, timezone, liveConfigPath } = req.body;
    // Perform a backup before restoring
    await performBackup(liveConfigPath || null, null, 'pre-restore', false, 100, timezone);

    const configPath = liveConfigPath || '/config';
    const esphomeDir = path.join(configPath, 'esphome');
    const filePath = resolveWithinDirectory(esphomeDir, fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Handle content being an object or a string
    const contentToWrite = typeof content === 'string' ? content : YAML.stringify(content);
    await fs.writeFile(filePath, contentToWrite, 'utf-8');

    // Check if HA config is available to determine if a restart is needed
    const auth = await getHomeAssistantAuth();
    const needsRestart = !!(auth.baseUrl && auth.token);

    res.json({ success: true, message: 'ESPHome file restored successfully', needsRestart });
  } catch (error) {
    console.error('[restore-esphome-file] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Packages endpoints
app.post('/api/get-backup-packages', async (req, res) => {
  try {
    await loadDockerSettings();
    if (!(await isPackagesEnabled())) {
      return res.status(404).json({ error: 'Packages feature disabled' });
    }
    const { backupPath } = req.body;

    // Check manifest
    try {
      const manifestPath = path.join(backupPath, '.backup_manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);
      if (manifest.files && manifest.files.packages) {
        return res.json({ packagesFiles: manifest.files.packages });
      }
    } catch (e) {
      // Fallback
    }

    const packagesDir = path.join(backupPath, 'packages');

    try {
      // Check if packages directory exists
      await fs.access(packagesDir);
      const packageFiles = await listYamlFilesRecursive(packagesDir);
      return res.json({ packagesFiles: packageFiles });
    } catch (dirError) {
      if (dirError.code === 'ENOENT') {
        // Directory doesn't exist, return empty array
        return res.json({ packagesFiles: [] });
      }
      throw dirError; // Re-throw other errors
    }
  } catch (error) {
    console.error('[get-backup-packages] Error:', error);
    if (error.code === 'ENOENT') {
      return res.json({ packagesFiles: [] });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/get-backup-packages-file', async (req, res) => {
  try {
    if (!(await isPackagesEnabled())) {
      return res.status(404).json({ error: 'Packages feature disabled' });
    }
    const { backupPath, fileName } = req.body;

    // Use chain resolution
    const filePath = await resolveFileInBackupChain(backupPath, path.join('packages', fileName));

    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    if (error.code === 'INVALID_PATH') {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    console.error('[get-backup-packages-file] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/get-live-packages-file', async (req, res) => {
  try {
    if (!(await isPackagesEnabled())) {
      return res.status(404).json({ error: 'Packages feature disabled' });
    }
    const { fileName, liveConfigPath } = req.body;
    const configPath = liveConfigPath || '/config';
    const packagesDir = path.join(configPath, 'packages');
    const filePath = resolveWithinDirectory(packagesDir, fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    if (error.code === 'INVALID_PATH') {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('[get-live-packages-file] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/restore-packages-file', async (req, res) => {
  try {
    if (!(await isPackagesEnabled())) {
      return res.status(404).json({ error: 'Packages feature disabled' });
    }
    const { fileName, content, timezone, liveConfigPath } = req.body;
    // Perform a backup before restoring
    await performBackup(liveConfigPath || null, null, 'pre-restore', false, 100, timezone);

    const configPath = liveConfigPath || '/config';
    const packagesDir = path.join(configPath, 'packages');
    const filePath = resolveWithinDirectory(packagesDir, fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Handle content being an object or a string
    const contentToWrite = typeof content === 'string' ? content : YAML.stringify(content);
    await fs.writeFile(filePath, contentToWrite, 'utf-8');

    // Check if HA config is available to determine if a restart is needed
    const auth = await getHomeAssistantAuth();
    const needsRestart = !!(auth.baseUrl && auth.token);

    res.json({ success: true, message: 'Package file restored successfully', needsRestart });
  } catch (error) {
    console.error('[restore-packages-file] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const options = await getAddonOptions();
    res.json({
      ok: true,
      version,
      mode: options.mode,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log(`Home Assistant Time Machine v${version}`);
  console.log('='.repeat(60));
  console.log(`Server running at http://${HOST}:${PORT}`);
  if (INGRESS_PATH) {
    console.log(`[ingress] Ingress path detected: ${INGRESS_PATH}`);
  }

  // Initialize scheduled jobs
  loadScheduledJobs().then(jobs => {
    console.log('[scheduler] Loaded schedules:', jobs.jobs);
    console.log('[scheduler] Initializing schedules on startup...');
    Object.entries(jobs.jobs || {}).forEach(([id, job]) => {
      if (job.enabled) {
        console.log(`[scheduler] Setting up schedule "${id}" with cron "${job.cronExpression}" and timezone "${job.timezone}"`);
        scheduledJobs[id] = cron.schedule(job.cronExpression, async () => {
          console.log(`[cron] Triggered backup job: ${id} at ${new Date().toISOString()}`);
          try {
            console.log(`[cron] Fetching addon options for job ${id}...`);
            const options = await getAddonOptions();
            const sanitizedOptions = JSON.parse(JSON.stringify(options));
            if (sanitizedOptions.long_lived_access_token) {
              sanitizedOptions.long_lived_access_token = 'REDACTED';
            }
            console.log(`[cron] Addon options for job ${id}:`, sanitizedOptions);
            try {
              const response = await fetch(`http://localhost:${PORT}/api/backup-now`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  liveConfigPath: job.liveConfigPath || options.liveConfigPath || '/config',
                  backupFolderPath: job.backupFolderPath || options.backupFolderPath || '/media/timemachine',
                  maxBackupsEnabled: job.maxBackupsEnabled,
                  maxBackupsCount: job.maxBackupsCount
                })
              });
              const result = await response.json();
              if (response.ok) {
                console.log(`[cron] Backup triggered successfully: ${result.message}`);
              } else {
                console.error(`[cron] Backup trigger failed: ${result.error}`);
              }
            } catch (error) {
              console.error(`[cron] Error triggering backup:`, error);
            }
          } catch (error) {
            console.error(`[cron] Error during scheduled backup for job ${id}:`, error);
          }
        }, { timezone: job.timezone });
      }
    });
    console.log('[scheduler] Initialization complete.');
  });
});

// Helper to find the full range of a YAML item including comments and structure
function findFullRange(content, node, isListItem) {
  let start = node.range[0];
  let end = node.range[1];

  // 1. Find the start of the item structure (dash or key)
  if (isListItem) {
    // Scan backwards for dash
    while (start > 0 && content[start] !== '-') {
      start--;
    }
  } else {
    // For map item (script), node is the value. We need to find the key.
    // Scan backwards for ':'
    while (start > 0 && content[start] !== ':') {
      start--;
    }
    // Now scan backwards for the key start (start of line or after whitespace)
    if (start > 0) {
      // Scan back to newline or start of file.
      while (start > 0 && content[start - 1] !== '\n') {
        start--;
      }
    }
  }

  // 2. Scan backwards for comments and empty lines
  let current = start;
  while (current > 0) {
    const prevChar = content[current - 1];
    if (prevChar === '\n') {
      // Check the line before this newline
      let lineEnd = current - 1;
      let lineStart = lineEnd;
      while (lineStart > 0 && content[lineStart - 1] !== '\n') {
        lineStart--;
      }
      const line = content.substring(lineStart, lineEnd);
      if (line.trim().startsWith('#') || line.trim() === '') {
        // Include this line
        current = lineStart;
      } else {
        // This line is content (previous item), stop.
        break;
      }
    } else {
      // Consume spaces/indentation before the item start
      current--;
    }
  }
  start = current;

  return [start, end];
}
