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
const { spawn } = require('child_process');

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

const version = '2.3.1';
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';
const debugLog = (...args) => {
  if (DEBUG_LOGS) {
    console.log(...args);
  }
};

// Track the state of the last backup
let LAST_BACKUP_STATE = {
  status: 'never_run',
  timestamp: null,
  error: null,
  source: null
};

// Persistence helpers
const BACKUP_STATE_FILE = path.join(DATA_DIR, 'backup-state.json');

async function saveBackupState() {
  try {
    await fs.writeFile(BACKUP_STATE_FILE, JSON.stringify(LAST_BACKUP_STATE, null, 2));
    debugLog('[state] Saved backup state to disk');
  } catch (e) {
    console.error('[state] Failed to save backup state:', e.message);
  }
}

async function loadBackupState() {
  try {
    const data = await fs.readFile(BACKUP_STATE_FILE, 'utf-8');
    LAST_BACKUP_STATE = JSON.parse(data);
    debugLog('[state] Loaded backup state from disk:', LAST_BACKUP_STATE.status);
  } catch (e) {
    debugLog('[state] No saved backup state found, starting fresh');
    await saveBackupState();
  }
}

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
app.use(express.json());
const PORT = process.env.PORT || 54000;
const HOST = process.env.HOST || '0.0.0.0';
const INGRESS_PATH = process.env.INGRESS_ENTRY || '';
const basePath = INGRESS_PATH || '';
const BODY_SIZE_LIMIT = '50mb';



console.log('[data-dir] Using persistent data directory:', DATA_DIR);

// Set up stdin listener for hassio.addon_stdin service
// Toggle backup lock
app.post('/api/toggle-lock', async (req, res) => {
  try {
    const { backupPath } = req.body;
    if (!backupPath) {
      return res.status(400).json({ error: 'backupPath is required' });
    }

    const lockFile = path.join(backupPath, '.lock');
    let locked = false;

    try {
      await fs.access(lockFile);
      // If it exists, remove it
      await fs.unlink(lockFile);
      locked = false;
    } catch (e) {
      // If it doesn't exist, create it
      await fs.writeFile(lockFile, 'locked', 'utf-8');
      locked = true;
    }

    res.json({ success: true, locked });
  } catch (error) {
    console.error('[toggle-lock] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to retry deletion on ENOTEMPTY
async function rmWithRetry(dirPath, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      return; // Success
    } catch (err) {
      if (err.code === 'ENOTEMPTY' && i < retries - 1) {
        console.log(`[rmWithRetry] ENOTEMPTY for ${dirPath}, retrying in ${delay}ms... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err; // Re-throw if not ENOTEMPTY or out of retries
    }
  }
}

app.post('/api/delete-backup', async (req, res) => {
  const { backupPath } = req.body;
  if (!backupPath) {
    return res.status(400).json({ error: 'backupPath is required' });
  }

  try {
    // Check if locked
    const lockFile = path.join(backupPath, '.lock');
    if (fsSync.existsSync(lockFile)) {
      return res.status(403).json({ error: 'This backup is protected and cannot be deleted.' });
    }

    console.log(`[api] Manually deleting backup: ${backupPath}`);
    await rmWithRetry(backupPath);
    res.json({ success: true });
  } catch (error) {
    console.error('[api] Error deleting backup:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/export-backup', async (req, res) => {
  try {
    const backupPath = req.query.backupPath;
    if (!backupPath || typeof backupPath !== 'string') {
      return res.status(400).json({ error: 'backupPath is required' });
    }

    const options = await getAddonOptions();
    const settings = await loadDockerSettings();
    const configuredBackupRoot = options.backupFolderPath || settings.backupFolderPath || '/media/timemachine';

    const resolvedRoot = path.resolve(configuredBackupRoot);
    const resolvedBackupPath = path.resolve(backupPath);
    const rootWithSep = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
    if (resolvedBackupPath !== resolvedRoot && !resolvedBackupPath.startsWith(rootWithSep)) {
      return res.status(403).json({ error: 'Invalid backup path' });
    }

    const stats = await fs.stat(resolvedBackupPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'backupPath must be a directory' });
    }

    const parentDir = path.dirname(resolvedBackupPath);
    const folderName = path.basename(resolvedBackupPath);
    const safeName = folderName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const archiveName = `${safeName}.tar.gz`;

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);

    const tarProcess = spawn('tar', ['-czf', '-', '-C', parentDir, folderName], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderrOutput = '';
    tarProcess.stderr.on('data', (chunk) => {
      stderrOutput += chunk.toString();
    });

    tarProcess.on('error', (error) => {
      console.error('[export-backup] Failed to spawn tar:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to export backup archive' });
      } else if (!res.writableEnded) {
        res.end();
      }
    });

    req.on('close', () => {
      if (!tarProcess.killed) {
        tarProcess.kill('SIGTERM');
      }
    });

    tarProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('[export-backup] tar exited with code', code, stderrOutput.trim());
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to export backup archive' });
        } else if (!res.writableEnded) {
          res.end();
        }
      }
    });

    tarProcess.stdout.pipe(res);
  } catch (error) {
    console.error('[export-backup] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

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
          // Load settings from docker-app-settings.json for paths
          const settings = await loadDockerSettings();
          // Load scheduled jobs to get smartBackupEnabled (saved via UI toggle)
          const scheduledJobsData = await loadScheduledJobs();
          const defaultJob = scheduledJobsData.jobs?.['default-backup-job'] || {};
          const smartBackupEnabled = defaultJob.smartBackupEnabled ?? settings.smartBackupEnabled ?? false;
          console.log(`[stdin] Smart backup mode: ${smartBackupEnabled}`);
          const backupPath = await performBackup(
            options.liveConfigPath || settings.liveConfigPath || '/config',
            options.backupFolderPath || settings.backupFolderPath || '/media/timemachine',
            'stdin-service',
            defaultJob.maxBackupsEnabled ?? false,
            defaultJob.maxBackupsCount ?? 100,
            defaultJob.timezone ?? null,
            smartBackupEnabled
          );
          if (backupPath === null) {
            console.log('[stdin] No changes detected since last backup (smart backup mode)');
          } else {
            console.log(`[stdin] Backup completed successfully: ${backupPath}`);
          }
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

/**
 * Parse configuration.yaml to find automation and script file locations
 * Supports !include, !include_dir_list, !include_dir_named, !include_dir_merge_list, !include_dir_merge_named
 * @param {string} configPath - Path to the config directory
 * @returns {Object} Object with automationPaths (array), scriptPaths (array), and automationDirs/scriptDirs for directory includes
 */
async function getConfigFilePaths(configPath) {
  const configFile = path.join(configPath, 'configuration.yaml');
  let automationPaths = [];
  let scriptPaths = [];
  const automationDirs = [];
  const scriptDirs = [];

  try {
    const configContent = await fs.readFile(configFile, 'utf-8');
    debugLog('[getConfigFilePaths] Found configuration.yaml, parsing...');

    const lines = configContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments
      if (trimmedLine.startsWith('#')) continue;

      // Handle various include styles for automation and scripts
      // Supports:
      // automation: !include automations.yaml
      // automation mine: !include my_autos.yaml
      // automation: !include_dir_list automations/
      const includeMatch = trimmedLine.match(/^(automation|script)(?:\s+[^:]*)?:\s*(!include(?:_dir_(?:merge_)?(?:list|named))?)\s+(.+)$/);
      
      if (includeMatch) {
        const type = includeMatch[1]; // automation or script
        const tag = includeMatch[2]; // !include, !include_dir_list, etc.
        let fileOrDir = includeMatch[3].split('#')[0].trim(); // strip trailing comments
        
        // Remove quotes if present
        if ((fileOrDir.startsWith("'") && fileOrDir.endsWith("'")) || 
            (fileOrDir.startsWith('"') && fileOrDir.endsWith('"'))) {
          fileOrDir = fileOrDir.substring(1, fileOrDir.length - 1);
        }
        
        const fullPath = path.resolve(configPath, fileOrDir);
        
        if (tag === '!include') {
          if (type === 'automation') automationPaths.push(fullPath);
          else scriptPaths.push(fullPath);
        } else {
          // It's a directory include
          const destPaths = type === 'automation' ? automationPaths : scriptPaths;
          const destDirs = type === 'automation' ? automationDirs : scriptDirs;
          
          destDirs.push(fullPath);
          try {
            const files = await listYamlFilesRecursive(fullPath);
            for (const f of files) {
              destPaths.push(path.join(fullPath, f));
            }
          } catch (err) {
            debugLog(`[getConfigFilePaths] Could not read ${type} directory ${fullPath}:`, err.message);
          }
        }
      }
    }

    // De-dupe paths
    automationPaths = [...new Set(automationPaths)];
    scriptPaths = [...new Set(scriptPaths)];

    // Default fallback if nothing found in config
    if (automationPaths.length === 0) {
      automationPaths.push(path.join(configPath, 'automations.yaml'));
    }
    if (scriptPaths.length === 0) {
      scriptPaths.push(path.join(configPath, 'scripts.yaml'));
    }

  } catch (error) {
    // If configuration.yaml doesn't exist or can't be read, use defaults
    debugLog('[getConfigFilePaths] Could not read configuration.yaml, using defaults:', error.message);
    automationPaths.push(path.join(configPath, 'automations.yaml'));
    scriptPaths.push(path.join(configPath, 'scripts.yaml'));
  }

  debugLog('[getConfigFilePaths] Automation paths:', automationPaths);
  debugLog('[getConfigFilePaths] Script paths:', scriptPaths);
  debugLog('[getConfigFilePaths] Automation dirs:', automationDirs);
  debugLog('[getConfigFilePaths] Script dirs:', scriptDirs);

  return { automationPaths, scriptPaths, automationDirs, scriptDirs };
}


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
      // Skip hidden files/directories (starting with .)
      // This skips .esphome build artifacts and macOS metadata
      if (entry.name.startsWith('.')) {
        continue;
      }

      const entryRelativePath = relativePrefix ? path.join(relativePrefix, entry.name) : entry.name;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isSymbolicLink()) {
        const linkTarget = path.join(currentDir, entry.name);
        try {
          const stats = await fs.stat(linkTarget);
          if (stats.isDirectory()) {
            await walk(linkTarget, entryRelativePath);
          } else if (stats.isFile() && YAML_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
            results.push(entryRelativePath);
          }
        } catch (e) {
          // Skip dead links
        }
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
    return !!options.esphome;
  } catch (e) {
    return false;
  }
}

async function isPackagesEnabled() {
  try {
    const options = await getAddonOptions();
    return !!options.packages;
  } catch (e) {
    return false;
  }
}

/**
 * Find a file in the backup chain if it's missing in the current snapshot
 * (Used for Smart Backup mode)
 */
async function resolveFileInBackupChain(currentBackupPath, relativeFilePath) {
  try {
    const filePath = path.join(currentBackupPath, relativeFilePath);
    await fs.access(filePath);
    return filePath; // Found in current backup
  } catch (err) {
    // Not found, look in previous backups
    const backupRoot = path.dirname(currentBackupPath);
    const allBackups = await getAllBackupPaths(backupRoot);
    const currentIndex = allBackups.indexOf(currentBackupPath);
    
    if (currentIndex === -1) throw err;

    // Search older backups
    for (let i = currentIndex + 1; i < allBackups.length; i++) {
      const prevPath = path.join(allBackups[i], relativeFilePath);
      try {
        await fs.access(prevPath);
        debugLog(`[chain] Resolved ${relativeFilePath} from older backup: ${allBackups[i]}`);
        return prevPath;
      } catch (e) { /* Continue searching */ }
    }
    throw err; // Not found in chain
  }
}

// Get all backup paths sorted by date (newest first)
async function getAllBackupPaths(backupRoot) {
  try {
    const entries = await fs.readdir(backupRoot, { withFileTypes: true });
    const backupFolders = entries
      .filter(entry => entry.isDirectory() && entry.name.match(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(?:_.*)?$/))
      .map(entry => path.join(backupRoot, entry.name))
      .sort()
      .reverse();
    return backupFolders;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

// API Endpoints for Automations
app.get('/api/get-live-items', async (req, res) => {
  try {
    const { liveConfigPath } = req.query;
    const configPath = liveConfigPath || '/config';
    const { automationPaths, scriptPaths } = await getConfigFilePaths(configPath);
    
    let allAutomations = [];
    for (const p of automationPaths) {
      try {
        const data = await loadYamlWithCache(p);
        if (Array.isArray(data)) {
          allAutomations = allAutomations.concat(data);
        }
      } catch (err) {
        debugLog(`[api] Could not read automation file ${p}:`, err.message);
      }
    }
    
    let allScripts = [];
    for (const p of scriptPaths) {
      try {
        const data = await loadYamlWithCache(p);
        allScripts = allScripts.concat(processScriptData(data));
      } catch (err) {
        debugLog(`[api] Could not read script file ${p}:`, err.message);
      }
    }

    res.json({ automations: allAutomations, scripts: allScripts });
  } catch (error) {
    console.error('[api] Error getting live items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to process script data (handling both old and new formats)
function processScriptData(data) {
  if (!data || typeof data !== 'object') return [];
  
  if (Array.isArray(data)) {
    return data;
  }
  
  // Object format (standard scripts.yaml)
  return Object.entries(data).map(([id, content]) => {
    return {
      id,
      ...content
    };
  });
}

app.post('/api/get-backup-automations', async (req, res) => {
  try {
    const { backupPath } = req.body;
    let allAutomations = [];
    
    // Check manifest first
    let autoFiles = null;
    try {
      const manifestPath = path.join(backupPath, '.backup_manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);
      
      if (manifest.automation_files) {
        autoFiles = manifest.automation_files;
      } else if (manifest.files && manifest.files.root) {
        // Fallback for older backups
        autoFiles = manifest.files.root.filter(f => 
          f === 'automations.yaml' || 
          f.startsWith('automations/') || 
          f.match(/^[^/]+\/.*\.ya?ml$/) // e.g., "automation_dir/outside.yaml"
        );
      }
      
      if (autoFiles) {
        for (const file of autoFiles) {
          try {
            const filePath = await resolveFileInBackupChain(backupPath, file);
            const fileData = await loadYamlWithCache(filePath);
            if (Array.isArray(fileData)) {
              allAutomations = allAutomations.concat(fileData);
            }
          } catch (err) { /* File not found, skip */ }
        }
        
        if (allAutomations.length > 0) {
          return res.json({ automations: allAutomations });
        }
        
        // If no automation files in manifest, return empty
        if (manifest.automation_files || autoFiles.includes('automations.yaml')) {
          return res.json({ automations: allAutomations });
        }
      }
    } catch (e) {
      // Fallback to searching physical directory if manifest fails
    }

    // Physical search fallback
    const files = await fs.readdir(backupPath);
    const yamlFiles = files.filter(f => f === 'automations.yaml' || f.startsWith('automations/') || f.endsWith('.yaml'));
    
    for (const f of yamlFiles) {
      try {
        const filePath = path.join(backupPath, f);
        const data = await loadYamlWithCache(filePath);
        if (Array.isArray(data)) {
          allAutomations = allAutomations.concat(data);
        }
      } catch (err) { /* Skip */ }
    }

    res.json({ automations: allAutomations });
  } catch (error) {
    console.error('[api] Error getting backup items:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/get-backup-scripts', async (req, res) => {
  try {
    const { backupPath } = req.body;
    let allScripts = [];
    
    // Check manifest first
    let scriptFiles = null;
    try {
      const manifestPath = path.join(backupPath, '.backup_manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);
      
      if (manifest.script_files) {
        scriptFiles = manifest.script_files;
      } else if (manifest.files && manifest.files.root) {
        scriptFiles = manifest.files.root.filter(f => 
          f === 'scripts.yaml' || 
          f.startsWith('scripts/') || 
          f.match(/^[^/]+\/.*\.ya?ml$/) // e.g., "script_dir/utilities.yaml"
        );
      }
      
      if (scriptFiles) {
        for (const file of scriptFiles) {
          try {
            const filePath = await resolveFileInBackupChain(backupPath, file);
            const fileData = await loadYamlWithCache(filePath);
            const processed = processScriptData(fileData);
            allScripts = allScripts.concat(processed);
          } catch (err) { /* File not found, skip */ }
        }
        
        if (allScripts.length > 0) {
          return res.json({ scripts: allScripts });
        }
        
        // If no script files in manifest, return empty
        if (manifest.script_files || scriptFiles.includes('scripts.yaml')) {
          return res.json({ scripts: allScripts });
        }
      }
    } catch (e) {
      // Fallback
    }

    // Physical search fallback
    const files = await fs.readdir(backupPath);
    const yamlFiles = files.filter(f => f === 'scripts.yaml' || f.startsWith('scripts/') || f.endsWith('.yaml'));
    
    for (const f of yamlFiles) {
      try {
        const filePath = path.join(backupPath, f);
        const data = await loadYamlWithCache(filePath);
        allScripts = allScripts.concat(processScriptData(data));
      } catch (err) { /* Skip */ }
    }

    res.json({ scripts: allScripts });
  } catch (error) {
    console.error('[api] Error getting backup items:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/get-backup-automation-content', async (req, res) => {
  try {
    const { backupPath, automationIdentifier } = req.body;
    
    // Check manifest for file list
    let autoFiles = null;
    try {
      const manifestPath = path.join(backupPath, '.backup_manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);
      
      if (manifest.automation_files) {
        autoFiles = manifest.automation_files;
      } else if (manifest.files && manifest.files.root) {
        autoFiles = manifest.files.root.filter(f => 
          f === 'automations.yaml' || 
          f.startsWith('automations/') || 
          f.match(/^[^/]+\/.*\.ya?ml$/)
        );
      }
      
      if (autoFiles) {
        for (const file of autoFiles) {
          try {
            const filePath = await resolveFileInBackupChain(backupPath, file);
            const data = await loadYamlWithCache(filePath);
            if (Array.isArray(data) && data.some(a => a.id === automationIdentifier || a.alias === automationIdentifier)) {
              const content = await fs.readFile(filePath, 'utf-8');
              return res.json({ content });
            }
          } catch (err) { /* Skip */ }
        }
      }
    } catch (e) { /* Fallback */ }

    // Fallback search
    const files = await fs.readdir(backupPath);
    const yamlFiles = files.filter(f => f === 'automations.yaml' || f.endsWith('.yaml'));
    
    for (const f of yamlFiles) {
      try {
        const filePath = path.join(backupPath, f);
        const data = await loadYamlWithCache(filePath);
        if (Array.isArray(data) && data.some(a => a.id === automationIdentifier || a.alias === automationIdentifier)) {
          const content = await fs.readFile(filePath, 'utf-8');
          return res.json({ content });
        }
      } catch (err) { /* Skip */ }
    }

    res.status(404).json({ error: 'Automation not found in backup' });
  } catch (error) {
    console.error('[api] Error getting backup automation content:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/get-backup-script-content', async (req, res) => {
  try {
    const { backupPath, automationIdentifier: scriptIdentifier } = req.body;
    
    // Check manifest for file list
    let scriptFiles = null;
    try {
      const manifestPath = path.join(backupPath, '.backup_manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);
      
      if (manifest.script_files) {
        scriptFiles = manifest.script_files;
      } else if (manifest.files && manifest.files.root) {
        scriptFiles = manifest.files.root.filter(f => 
          f === 'scripts.yaml' || 
          f.startsWith('scripts/') || 
          f.match(/^[^/]+\/.*\.ya?ml$/)
        );
      }
      
      if (scriptFiles) {
        for (const file of scriptFiles) {
          try {
            const filePath = await resolveFileInBackupChain(backupPath, file);
            const data = await loadYamlWithCache(filePath);
            if (data && typeof data === 'object' && !Array.isArray(data)) {
              if (data[scriptIdentifier] || Object.values(data).some(s => s.alias === scriptIdentifier)) {
                const content = await fs.readFile(filePath, 'utf-8');
                return res.json({ content });
              }
            }
          } catch (err) { /* Skip */ }
        }
      }
    } catch (e) { /* Fallback */ }

    // Fallback search
    const files = await fs.readdir(backupPath);
    const yamlFiles = files.filter(f => f === 'scripts.yaml' || f.endsWith('.yaml'));
    
    for (const f of yamlFiles) {
      try {
        const filePath = path.join(backupPath, f);
        const data = await loadYamlWithCache(filePath);
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          if (data[scriptIdentifier] || Object.values(data).some(s => s.alias === scriptIdentifier)) {
            const content = await fs.readFile(filePath, 'utf-8');
            return res.json({ content });
          }
        }
      } catch (err) { /* Skip */ }
    }

    res.status(404).json({ error: 'Script not found in backup' });
  } catch (error) {
    console.error('[api] Error getting backup script content:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/get-live-automation-content', async (req, res) => {
  try {
    const { automationIdentifier, liveConfigPath } = req.query;
    const configPath = liveConfigPath || '/config';
    const { automationPaths } = await getConfigFilePaths(configPath);
    
    for (const p of automationPaths) {
      try {
        const data = await loadYamlWithCache(p);
        if (Array.isArray(data) && data.some(a => a.id === automationIdentifier || a.alias === automationIdentifier)) {
          const content = await fs.readFile(p, 'utf-8');
          return res.json({ content });
        }
      } catch (err) { /* Skip */ }
    }

    res.status(404).json({ error: 'Automation not found in live configuration' });
  } catch (error) {
    console.error('[api] Error getting live automation content:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/get-live-script-content', async (req, res) => {
  try {
    const { automationIdentifier: scriptIdentifier, liveConfigPath } = req.query;
    const configPath = liveConfigPath || '/config';
    const { scriptPaths } = await getConfigFilePaths(configPath);
    
    for (const p of scriptPaths) {
      try {
        const data = await loadYamlWithCache(p);
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          if (data[scriptIdentifier] || Object.values(data).some(s => s.alias === scriptIdentifier)) {
            const content = await fs.readFile(p, 'utf-8');
            return res.json({ content });
          }
        }
      } catch (err) { /* Skip */ }
    }

    res.status(404).json({ error: 'Script not found in live configuration' });
  } catch (error) {
    console.error('[api] Error getting live script content:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Find the full range of a YAML item including preceding comments
 */
function findFullRange(content, node, includeComments = true) {
  if (!node || !node.range) return [0, 0];
  
  let start = node.range[0];
  const end = node.range[1];
  
  if (includeComments) {
    // Look backwards for comments and blank lines
    const before = content.substring(0, start);
    const lines = before.split('\n');
    let commentLines = 0;
    
    for (let i = lines.length - 2; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('#') || line === '') {
        commentLines++;
      } else {
        break;
      }
    }
    
    if (commentLines > 0) {
      // Adjust start to include these lines
      const linesToInclude = lines.slice(lines.length - 1 - commentLines);
      start -= linesToInclude.join('\n').length;
    }
  }
  
  return [start, end];
}

app.post('/api/restore-automation', async (req, res) => {
  try {
    const { backupPath, automationIdentifier, timezone, liveConfigPath, smartBackupEnabled } = req.body;

    if (!backupPath || !automationIdentifier) {
      return res.status(400).json({ error: 'Missing required parameters: backupPath and automationIdentifier' });
    }

    // Perform a backup before restoring
    let effectiveSmartBackup = smartBackupEnabled;
    if (typeof smartBackupEnabled === 'undefined') {
      const scheduledJobsData = await loadScheduledJobs();
      const defaultJob = scheduledJobsData.jobs?.['default-backup-job'] || {};
      effectiveSmartBackup = defaultJob.smartBackupEnabled ?? false;
    }
    await performBackup(liveConfigPath || null, null, 'pre-restore', false, 100, timezone, effectiveSmartBackup);

    const configPath = liveConfigPath || '/config';

    // Find which file in the backup contains the requested automation
    let relativeFilePath = 'automations.yaml';
    let backupFilePath = null;

    let autoFiles = null;
    try {
      const manifestPath = path.join(backupPath, '.backup_manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);

      if (manifest.automation_files) {
        autoFiles = manifest.automation_files;
      } else if (manifest.files && manifest.files.root) {
        // Fallback for older backups
        autoFiles = manifest.files.root.filter(f =>
          f === 'automations.yaml' ||
          f.startsWith('automations/') ||
          f.match(/^[^/]+\/.*\.ya?ml$/)
        );
      }

      if (autoFiles) {
        for (const file of autoFiles) {
          try {
            const potentialBackupPath = await resolveFileInBackupChain(backupPath, file);
            const data = await loadYamlWithCache(potentialBackupPath);
            if (Array.isArray(data) && data.some(a => a.id === automationIdentifier || a.alias === automationIdentifier)) {
              relativeFilePath = file;
              backupFilePath = potentialBackupPath;
              break;
            }
          } catch (err) { /* Skip */ }
        }
      }
    } catch (e) { /* Proceed to fallback */ }

    if (!backupFilePath) {
      // Fallback: search the backup chain for automations.yaml
      backupFilePath = await resolveFileInBackupChain(backupPath, 'automations.yaml');
    }

    // Determine target live file path
    const liveFilePath = path.join(configPath, relativeFilePath);
    const backupContent = await fs.readFile(backupFilePath, 'utf-8');

    // Read live contents
    let liveContent = '';
    try {
      liveContent = await fs.readFile(liveFilePath, 'utf-8');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      liveContent = '[]';
    }

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
    const backupSnippet = backupSnippet = backupContent.substring(backupStart, backupEnd);

    // Find live node
    const liveItems = liveDoc.contents?.items || [];
    const liveIndex = liveItems.findIndex(item => {
      const obj = item.toJSON();
      return obj.id === automationIdentifier || obj.alias === automationIdentifier;
    });

    let newLiveContent;
    if (liveIndex !== -1) {
      const liveNode = liveItems[liveIndex];
      const [liveStart, liveEnd] = findFullRange(liveContent, liveNode, true);
      newLiveContent = liveContent.substring(0, liveStart) + backupSnippet + liveContent.substring(liveEnd);
    } else {
      const prefix = (liveContent.length > 0 && !liveContent.endsWith('\n')) ? '\n' : '';
      newLiveContent = liveContent + prefix + backupSnippet;
    }

    // Write back
    await fs.writeFile(liveFilePath, newLiveContent, 'utf-8');

    res.json({ success: true, message: `Automation restored successfully to ${relativeFilePath}` });
  } catch (error) {
    console.error('[restore-automation] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restore script
// Restore script
app.post('/api/restore-script', async (req, res) => {
  try {
    const { backupPath, automationIdentifier: scriptIdentifier, timezone, liveConfigPath, smartBackupEnabled } = req.body;

    if (!backupPath || !scriptIdentifier) {
      return res.status(400).json({ error: 'Missing required parameters: backupPath and automationIdentifier' });
    }

    // Perform a backup before restoring
    let effectiveSmartBackup = smartBackupEnabled;
    if (typeof smartBackupEnabled === 'undefined') {
      const scheduledJobsData = await loadScheduledJobs();
      const defaultJob = scheduledJobsData.jobs?.['default-backup-job'] || {};
      effectiveSmartBackup = defaultJob.smartBackupEnabled ?? false;
    }
    await performBackup(liveConfigPath || null, null, 'pre-restore', false, 100, timezone, effectiveSmartBackup);

    const configPath = liveConfigPath || '/config';

    // Find which file in the backup contains the requested script
    let relativeFilePath = 'scripts.yaml';
    let backupFilePath = null;

    let scriptFiles = null;
    try {
      const manifestPath = path.join(backupPath, '.backup_manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);

      if (manifest.script_files) {
        scriptFiles = manifest.script_files;
      } else if (manifest.files && manifest.files.root) {
        scriptFiles = manifest.files.root.filter(f =>
          f === 'scripts.yaml' ||
          f.startsWith('scripts/') ||
          f.match(/^[^/]+\/.*\.ya?ml$/)
        );
      }

      if (scriptFiles) {
        for (const file of scriptFiles) {
          try {
            const potentialBackupPath = await resolveFileInBackupChain(backupPath, file);
            const data = await loadYamlWithCache(potentialBackupPath);
            if (data && typeof data === 'object' && !Array.isArray(data)) {
              if (data[scriptIdentifier] || Object.values(data).some(s => s.alias === scriptIdentifier)) {
                relativeFilePath = file;
                backupFilePath = potentialBackupPath;
                break;
              }
            }
          } catch (err) { /* Skip */ }
        }
      }
    } catch (e) { /* Proceed to fallback */ }

    if (!backupFilePath) {
      backupFilePath = await resolveFileInBackupChain(backupPath, 'scripts.yaml');
    }

    const liveFilePath = path.join(configPath, relativeFilePath);
    const backupContent = await fs.readFile(backupFilePath, 'utf-8');

    // For scripts, we replace or append to the top-level object
    let liveContent = '';
    try {
      liveContent = await fs.readFile(liveFilePath, 'utf-8');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      liveContent = '{}';
    }

    const liveDoc = YAML.parseDocument(liveContent);
    const backupDoc = YAML.parseDocument(backupContent);

    // Find snippet in backup
    let backupSnippet = '';
    const backupMap = backupDoc.contents;
    if (backupMap && backupMap.items) {
      const item = backupMap.items.find(i => i.key.toJSON() === scriptIdentifier);
      if (item) {
        const [start, end] = findFullRange(backupContent, item, true);
        backupSnippet = backupContent.substring(start, end);
      }
    }

    if (!backupSnippet) {
      return res.status(404).json({ error: 'Script not found in backup' });
    }

    // Replace in live
    let newLiveContent;
    const liveMap = liveDoc.contents;
    let liveItemIndex = -1;
    if (liveMap && liveMap.items) {
      liveItemIndex = liveMap.items.findIndex(i => i.key.toJSON() === scriptIdentifier);
    }

    if (liveItemIndex !== -1) {
      const item = liveMap.items[liveItemIndex];
      const [start, end] = findFullRange(liveContent, item, true);
      newLiveContent = liveContent.substring(0, start) + backupSnippet + liveContent.substring(end);
    } else {
      const prefix = (liveContent.length > 0 && !liveContent.endsWith('\n')) ? '\n' : '';
      newLiveContent = liveContent + prefix + backupSnippet;
    }

    await fs.writeFile(liveFilePath, newLiveContent, 'utf-8');

    res.json({ success: true, message: `Script restored successfully to ${relativeFilePath}` });
  } catch (error) {
    console.error('[restore-script] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settings & Options
app.get('/api/get-options', async (req, res) => {
  try {
    const options = await getAddonOptions();
    res.json(options);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/save-credentials', async (req, res) => {
  try {
    const { haUrl, haToken } = req.body;
    if (!haUrl || !haToken) {
      return res.status(400).json({ error: 'URL and Token are required' });
    }

    const creds = {
      home_assistant_url: haUrl,
      long_lived_access_token: haToken,
      updated_at: new Date().toISOString()
    };

    await fs.writeFile(path.join(DATA_DIR, 'docker-ha-credentials.json'), JSON.stringify(creds, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const DOCKER_SETTINGS_FILE = path.join(DATA_DIR, 'docker-app-settings.json');

async function loadDockerSettings() {
  try {
    const data = await fs.readFile(DOCKER_SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(data);
    return { ...settings, __loadedFromFile: true };
  } catch (e) {
    return {
      theme: 'dark',
      language: 'en',
      esphomeEnabled: false,
      packagesEnabled: false,
      backupFolderPath: '/media/timemachine',
      liveConfigPath: '/config',
      smartBackupEnabled: false,
      __loadedFromFile: false
    };
  }
}

async function saveDockerSettings(settings) {
  try {
    const current = await loadDockerSettings();
    const updated = { ...current, ...settings };
    delete updated.__loadedFromFile; // Don't persist the flag
    await fs.writeFile(DOCKER_SETTINGS_FILE, JSON.stringify(updated, null, 2));
    return true;
  } catch (e) {
    console.error('[settings] Failed to save settings:', e.message);
    return false;
  }
}

app.post('/api/save-settings', async (req, res) => {
  try {
    const { theme, language, esphomeEnabled, packagesEnabled, backupFolderPath, liveConfigPath, smartBackupEnabled } = req.body;

    // Validate paths if provided
    if (backupFolderPath) {
      try {
        await fs.access(backupFolderPath);
      } catch (e) {
        return res.status(400).json({ error: `Backup folder path is inaccessible: ${backupFolderPath}` });
      }
    }

    if (liveConfigPath) {
      try {
        await fs.access(liveConfigPath);
      } catch (e) {
        return res.status(400).json({ error: `Config folder path is inaccessible: ${liveConfigPath}` });
      }
    }

    const success = await saveDockerSettings({
      theme,
      language,
      esphomeEnabled,
      packagesEnabled,
      backupFolderPath,
      liveConfigPath,
      smartBackupEnabled
    });

    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save settings' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test-connection', async (req, res) => {
  try {
    const { haUrl, haToken } = req.body;
    const auth = await getHomeAssistantAuth(null, { haUrl, haToken });

    if (!auth.baseUrl || !auth.token) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const agent = new https.Agent({
      rejectUnauthorized: false // Allow self-signed certs for local HA
    });

    const response = await fetch(`${auth.baseUrl}/config`, {
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      },
      agent: auth.baseUrl.startsWith('https') ? agent : undefined
    });

    if (response.ok) {
      const data = await response.json();
      res.json({ success: true, version: data.version });
    } else {
      const errorText = await response.text();
      res.status(response.status).json({ error: errorText || 'Connection failed' });
    }
  } catch (error) {
    const isCertError = isTlsCertificateError(error);
    console.error('[test-connection] Error:', error.message, isCertError ? '(TLS Certificate Error)' : '');

    res.status(500).json({
      error: error.message,
      isTlsError: isCertError
    });
  }
});

app.post('/api/validate-path', async (req, res) => {
  try {
    const { path: folderPath, type } = req.body;
    if (!folderPath) return res.status(400).json({ error: 'Path is required' });

    try {
      await fs.access(folderPath);

      if (type === 'live') {
        // Check for configuration.yaml
        try {
          await fs.access(path.join(folderPath, 'configuration.yaml'));
        } catch (e) {
          return res.json({ success: false, reason: 'missing_configuration' });
        }

        // Check for automations.yaml using the robust parser
        const { automationPaths } = await getConfigFilePaths(folderPath);
        let automationsFound = false;
        for (const p of automationPaths) {
          try {
            await fs.access(p);
            automationsFound = true;
            break;
          } catch (e) { /* Check next */ }
        }

        if (!automationsFound) {
          return res.json({ success: false, reason: 'missing_automations' });
        }
      }

      res.json({ success: true });
    } catch (e) {
      res.json({ success: false, reason: 'inaccessible' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backups', async (req, res) => {
  try {
    const options = await getAddonOptions();
    const settings = await loadDockerSettings();
    const backupRoot = options.backupFolderPath || settings.backupFolderPath || '/media/timemachine';

    const backupFolders = await getAllBackupPaths(backupRoot);

    const backups = await Promise.all(backupFolders.map(async (folderPath) => {
      const stats = await fs.stat(folderPath);
      const name = path.basename(folderPath);

      // Check for lock
      let locked = false;
      try {
        await fs.access(path.join(folderPath, '.lock'));
        locked = true;
      } catch (e) { /* Not locked */ }

      // Check for changes (diff) if available
      let hasChanges = true;
      try {
        const manifestPath = path.join(folderPath, '.backup_manifest.json');
        const manifestData = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestData);
        if (typeof manifest.has_changes === 'boolean') {
          hasChanges = manifest.has_changes;
        }
      } catch (e) { /* Default to true if manifest missing/old */ }

      return {
        name,
        path: folderPath,
        mtime: stats.mtime,
        locked,
        hasChanges
      };
    }));

    res.json(backups);
  } catch (error) {
    console.error('[api] Error listing backups:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backup-state', async (req, res) => {
  res.json(LAST_BACKUP_STATE);
});

app.post('/api/backup-now', async (req, res) => {
  try {
    const { liveConfigPath, backupFolderPath, timezone, smartBackupEnabled } = req.body;
    const options = await getAddonOptions();
    const settings = await loadDockerSettings();

    // Max backups setting
    const scheduledJobsData = await loadScheduledJobs();
    const defaultJob = scheduledJobsData.jobs?.['default-backup-job'] || {};
    const maxBackupsEnabled = defaultJob.maxBackupsEnabled ?? false;
    const maxBackupsCount = defaultJob.maxBackupsCount ?? 100;

    // Smart backup setting
    const effectiveSmartBackup = typeof smartBackupEnabled === 'boolean' ?
      smartBackupEnabled :
      (defaultJob.smartBackupEnabled ?? settings.smartBackupEnabled ?? false);

    const backupPath = await performBackup(
      liveConfigPath || options.liveConfigPath || settings.liveConfigPath || '/config',
      backupFolderPath || options.backupFolderPath || settings.backupFolderPath || '/media/timemachine',
      'manual',
      maxBackupsEnabled,
      maxBackupsCount,
      timezone,
      effectiveSmartBackup
    );

    if (backupPath === null) {
      res.json({ success: true, message: 'No changes detected since last backup.', skipped: true });
    } else {
      res.json({ success: true, backupPath, skipped: false });
    }
  } catch (error) {
    console.error('[api] Backup failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Checks if a file has changed since the last backup
 * @returns {boolean} True if changed or no previous backup exists
 */
async function hasFileChanged(sourcePath, allBackupPaths, relativePath) {
  if (allBackupPaths.length === 0) return true;

  try {
    const sourceStats = await fs.stat(sourcePath);

    // Check last N backups (usually just the latest is enough, but we check up to 3 to be safe)
    for (let i = 0; i < Math.min(allBackupPaths.length, 3); i++) {
      const lastBackupPath = path.join(allBackupPaths[i], relativePath);
      try {
        const lastStats = await fs.stat(lastBackupPath);
        // Compare size and mtime
        // We use a small threshold for mtime (1s) to account for filesystem differences
        if (sourceStats.size === lastStats.size && Math.abs(sourceStats.mtimeMs - lastStats.mtimeMs) < 1000) {
          return false; // Unchanged
        }

        // If stats differ, do a content comparison for small files
        if (sourceStats.size < 1024 * 1024) { // < 1MB
          const [sourceBuf, lastBuf] = await Promise.all([
            fs.readFile(sourcePath),
            fs.readFile(lastBackupPath)
          ]);
          if (sourceBuf.equals(lastBuf)) {
            return false;
          }
        }
      } catch (e) {
        // File might not exist in this backup, continue to next older backup
      }
    }

    return true; // Changed or not found
  } catch (err) {
    return true; // Error reading source, assume changed/needs backup
  }
}

async function performBackup(configPath, backupRoot, source = 'manual', maxBackupsEnabled = false, maxBackupsCount = 100, timezone = null, smartBackupEnabled = false) {
  // Use a lock to prevent concurrent backups
  if (LAST_BACKUP_STATE.status === 'running') {
    throw new Error('A backup is already in progress');
  }

  // Update state to running
  LAST_BACKUP_STATE = {
    status: 'running',
    timestamp: new Date().toISOString(),
    error: null,
    source
  };
  await saveBackupState();

  const now = timezone ?
    new Date(new Date().toLocaleString('en-US', { timeZone: timezone })) :
    new Date();

  const timestamp = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') + '-' +
    String(now.getMinutes()).padStart(2, '0') + '-' +
    String(now.getSeconds()).padStart(2, '0');

  const backupPath = path.join(backupRoot, timestamp);
  const allBackupPaths = await getAllBackupPaths(backupRoot);

  const manifest = {
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    source,
    smart_backup: !!smartBackupEnabled,
    has_changes: true,
    files: {
      root: [],
      lovelace: [],
      esphome: [],
      packages: []
    },
    automation_files: [],
    script_files: []
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
  const yamlFiles = files.filter(file => (file.endsWith('.yaml') || file.endsWith('.yml')) && !file.startsWith('.'));
  console.log(`[backup-${source}] Found ${yamlFiles.length} YAML files to check.`);

  let copiedYamlCount = 0;
  let skippedYamlCount = 0;
  for (const file of yamlFiles) {
    const sourcePath = path.join(configPath, file);
    const destPath = path.join(backupPath, file);

    try {
      // Always add to manifest so it represents the full state of the config
      manifest.files.root.push(file);

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

  // Backup split config directories (automations/, scripts/, etc.)
  // These are directories containing YAML files used via !include_dir_list or !include_dir_named
  const { automationPaths, scriptPaths, automationDirs, scriptDirs } = await getConfigFilePaths(configPath);

  // Record which files are automations and scripts in the manifest (relative to config root)
  manifest.automation_files = automationPaths.map(p => path.relative(configPath, p));
  manifest.script_files = scriptPaths.map(p => path.relative(configPath, p));

  const splitDirs = [...new Set([...automationDirs, ...scriptDirs])]; // Dedupe

  let copiedSplitCount = 0;
  let skippedSplitCount = 0;

  for (const dirPath of splitDirs) {
    const relativeDir = path.relative(configPath, dirPath);
    const destDir = path.join(backupPath, relativeDir);

    try {
      const dirFiles = await listYamlFilesRecursive(dirPath);
      for (const f of dirFiles) {
        const relativeFile = path.join(relativeDir, f);
        const sourceFile = path.join(dirPath, f);
        const destFile = path.join(destDir, f);

        try {
          // Always add to manifest
          manifest.files.root.push(relativeFile);

          if (smartBackupEnabled && allBackupPaths.length > 0) {
            const changed = await hasFileChanged(sourceFile, allBackupPaths, relativeFile);
            if (!changed) {
              skippedSplitCount++;
              continue;
            }
          }

          await fs.mkdir(path.dirname(destFile), { recursive: true });
          await fs.copyFile(sourceFile, destFile);
          copiedSplitCount++;
        } catch (fErr) {
          console.error(`[backup-${source}] Error copying split config file ${relativeFile}:`, fErr.message);
        }
      }
    } catch (err) {
      console.error(`[backup-${source}] Error processing split config directory ${relativeDir}:`, err.message);
    }
  }

  if (splitDirs.length > 0) {
    console.log(`[backup-${source}] Copied ${copiedSplitCount} split config files${smartBackupEnabled ? `, skipped ${skippedSplitCount} unchanged` : ''}.`);
  }

  // Backup individual split config files (!include path/to/file.yaml)
  // These are specific files detected in configuration.yaml that might be in subdirectories
  const individuaSplitFiles = [...new Set([...automationPaths, ...scriptPaths])]
    .filter(f => {
      const rel = path.relative(configPath, f);
      return rel !== 'automations.yaml' && rel !== 'scripts.yaml' && !rel.startsWith('..');
    });

  let copiedIndividualCount = 0;
  let skippedIndividualCount = 0;

  for (const srcFile of individuaSplitFiles) {
    const relativePath = path.relative(configPath, srcFile);
    const destFile = path.join(backupPath, relativePath);

    try {
      // Always add to manifest
      manifest.files.root.push(relativePath);

      // Smart backup mode: only copy if file has changed
      if (smartBackupEnabled && allBackupPaths.length > 0) {
        const changed = await hasFileChanged(srcFile, allBackupPaths, relativePath);
        if (!changed) {
          skippedIndividualCount++;
          continue;
        }
      }

      // Ensure target directory exists
      await fs.mkdir(path.dirname(destFile), { recursive: true });

      await fs.copyFile(srcFile, destFile);
      copiedIndividualCount++;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`[backup-${source}] Error copying individual split config ${relativePath}:`, err.message);
      }
    }
  }

  if (individuaSplitFiles.length > 0) {
    console.log(`[backup-${source}] Copied ${copiedIndividualCount} individual split files${smartBackupEnabled ? `, skipped ${skippedIndividualCount} unchanged` : ''}.`);
  }

  // Backup Lovelace files

  const storagePath = path.join(configPath, '.storage');
  const backupStoragePath = path.join(backupPath, '.storage');

  try {
    const storageFiles = await fs.readdir(storagePath);
    const lovelaceFiles = storageFiles.filter(f =>
      f === 'lovelace' || f === 'lovelace_resources' || f.startsWith('lovelace.')
    );

    let copiedLovelaceCount = 0;
    let skippedLovelaceCount = 0;
    if (lovelaceFiles.length > 0) {
      await fs.mkdir(backupStoragePath, { recursive: true });
      for (const file of lovelaceFiles) {
        const sourceFile = path.join(storagePath, file);
        const destFile = path.join(backupStoragePath, file);
        const relativeStoragePath = path.join('.storage', file);

        try {
          // Always add to manifest
          manifest.files.lovelace.push(file);

          if (smartBackupEnabled && allBackupPaths.length > 0) {
            const changed = await hasFileChanged(sourceFile, allBackupPaths, relativeStoragePath);
            if (!changed) {
              skippedLovelaceCount++;
              continue;
            }
          }

          await fs.copyFile(sourceFile, destFile);
          copiedLovelaceCount++;
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.error(`[backup-${source}] Error copying Lovelace file ${file}:`, err.message);
          }
        }
      }
      console.log(`[backup-${source}] Copied ${copiedLovelaceCount} Lovelace files${smartBackupEnabled ? `, skipped ${skippedLovelaceCount} unchanged` : ''}.`);
    }
  } catch (err) {
    console.error(`[backup-${source}] Error reading .storage directory:`, err.message);
  }

  const esphomeEnabled = await isEsphomeEnabled();
  const packagesEnabled = await isPackagesEnabled();
  let copiedEsphomeCount = 0;
  let skippedEsphomeCount = 0;
  let copiedPackagesCount = 0;
  let skippedPackagesCount = 0;

  if (esphomeEnabled) {
    // Backup ESPHome files
    const esphomePath = process.env.ESPHOME_CONFIG_PATH || path.join(configPath, 'esphome');
    const backupEsphomePath = path.join(backupPath, 'esphome');

    try {
      const esphomeYamlFiles = await listYamlFilesRecursive(esphomePath);
      console.log(`[backup-${source}] Found ${esphomeYamlFiles.length} ESPHome YAML files to copy.`);
      for (const relativePath of esphomeYamlFiles) {
        const sourcePath = path.join(esphomePath, relativePath);
        const destPath = path.join(backupEsphomePath, relativePath);
        try {
          // Always add to manifest
          manifest.files.esphome.push(relativePath);

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
      console.error(`[backup-${source}] Error reading ESPHome directory:`, err.message);
    }
  }

  if (packagesEnabled) {
    // Backup Packages
    const packagesPath = path.join(configPath, 'packages');
    const backupPackagesPath = path.join(backupPath, 'packages');

    try {
      const packageFiles = await listYamlFilesRecursive(packagesPath);
      console.log(`[backup-${source}] Found ${packageFiles.length} Package YAML files to copy.`);
      for (const relativePath of packageFiles) {
        const sourcePath = path.join(packagesPath, relativePath);
        const destPath = path.join(backupPackagesPath, relativePath);
        try {
          // Always add to manifest
          manifest.files.packages.push(relativePath);

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
            console.error(`[backup-${source}] Error copying Package file ${relativePath}:`, err.message);
          }
        }
      }
      console.log(`[backup-${source}] Copied ${copiedPackagesCount} Package files${smartBackupEnabled ? `, skipped ${skippedPackagesCount} unchanged` : ''}.`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`[backup-${source}] Error reading packages directory:`, err.message);
      }
    }
  }

  // Dedupe manifest files
  manifest.files.root = [...new Set(manifest.files.root)];
  manifest.files.lovelace = [...new Set(manifest.files.lovelace)];
  manifest.files.esphome = [...new Set(manifest.files.esphome)];
  manifest.files.packages = [...new Set(manifest.files.packages)];

  // Determine if there were any changes
  const totalCopied = copiedYamlCount + copiedSplitCount + copiedIndividualCount + copiedLovelaceCount + copiedEsphomeCount + copiedPackagesCount;
  manifest.has_changes = totalCopied > 0;

  // If smart backup is enabled and no files were copied, and this is NOT a pre-restore backup,
  // we can skip creating the backup folder and just return null
  if (smartBackupEnabled && totalCopied === 0 && source !== 'pre-restore') {
    try {
      await fs.rm(backupPath, { recursive: true, force: true });
    } catch (e) { /* ignore */ }

    LAST_BACKUP_STATE = {
      status: 'success',
      timestamp: new Date().toISOString(),
      error: null,
      source
    };
    await saveBackupState();
    return null;
  }

  // Write manifest
  try {
    await fs.writeFile(path.join(backupPath, '.backup_manifest.json'), JSON.stringify(manifest, null, 2));
  } catch (err) {
    console.error(`[backup-${source}] Error writing manifest:`, err.message);
  }

  // Max backups cleanup
  if (maxBackupsEnabled) {
    try {
      const backupFolders = await getAllBackupPaths(backupRoot);
      if (backupFolders.length > maxBackupsCount) {
        const toDelete = backupFolders.slice(maxBackupsCount);
        console.log(`[backup-${source}] Cleanup: deleting ${toDelete.length} old backups...`);
        for (const folder of toDelete) {
          // Check for lock
          const lockFile = path.join(folder, '.lock');
          if (fsSync.existsSync(lockFile)) {
            console.log(`[backup-${source}] Skipping deletion of locked backup: ${folder}`);
            continue;
          }
          await rmWithRetry(folder);
        }
      }
    } catch (err) {
      console.error(`[backup-${source}] Error during cleanup:`, err.message);
    }
  }

  LAST_BACKUP_STATE = {
    status: 'success',
    timestamp: new Date().toISOString(),
    error: null,
    source
  };
  await saveBackupState();

  return backupPath;
}

// Scheduled jobs persistence
const SCHEDULED_JOBS_FILE = path.join(DATA_DIR, 'scheduled-jobs.json');

async function loadScheduledJobs() {
  try {
    const data = await fs.readFile(SCHEDULED_JOBS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return {
      jobs: {}
    };
  }
}

async function saveScheduledJobs(data) {
  try {
    await fs.writeFile(SCHEDULED_JOBS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('[schedule] Failed to save scheduled jobs:', e.message);
    return false;
  }
}

// Global variable to store active cron jobs
const activeCronJobs = new Map();

async function initScheduledBackups() {
  const data = await loadScheduledJobs();
  const jobs = data.jobs || {};

  // Stop existing jobs
  for (const [id, cronJob] of activeCronJobs.entries()) {
    cronJob.stop();
    activeCronJobs.delete(id);
  }

  for (const [id, job] of Object.entries(jobs)) {
    if (job.enabled) {
      console.log(`[schedule] Starting job "${id}" with frequency "${job.frequency}" at "${job.time}"`);

      let cronExpression;
      const [hour, minute] = (job.time || '00:00').split(':');

      if (job.frequency === 'hourly') {
        cronExpression = `${minute} * * * *`;
      } else if (job.frequency === 'daily') {
        cronExpression = `${minute} ${hour} * * *`;
      } else if (job.frequency === 'weekly') {
        const day = job.dayOfWeek || 0;
        cronExpression = `${minute} ${hour} * * ${day}`;
      }

      if (cronExpression) {
        const cronJob = cron.schedule(cronExpression, async () => {
          console.log(`[schedule] Running scheduled backup job: ${id}`);
          try {
            const options = await getAddonOptions();
            const settings = await loadDockerSettings();
            await performBackup(
              options.liveConfigPath || settings.liveConfigPath || '/config',
              options.backupFolderPath || settings.backupFolderPath || '/media/timemachine',
              'schedule',
              job.maxBackupsEnabled,
              job.maxBackupsCount,
              job.timezone,
              job.smartBackupEnabled
            );
          } catch (error) {
            console.error(`[schedule] Backup job ${id} failed:`, error.message);
          }
        });
        activeCronJobs.set(id, cronJob);
      }
    }
  }
}

app.post('/api/save-schedule', async (req, res) => {
  try {
    const { enabled, frequency, time, dayOfWeek, maxBackupsEnabled, maxBackupsCount, timezone, smartBackupEnabled } = req.body;

    const data = await loadScheduledJobs();
    data.jobs = data.jobs || {};

    data.jobs['default-backup-job'] = {
      enabled: !!enabled,
      frequency: frequency || 'daily',
      time: time || '00:00',
      dayOfWeek: dayOfWeek || 0,
      maxBackupsEnabled: !!maxBackupsEnabled,
      maxBackupsCount: maxBackupsCount || 100,
      timezone: timezone || null,
      smartBackupEnabled: !!smartBackupEnabled
    };

    const success = await saveScheduledJobs(data);
    if (success) {
      await initScheduledBackups();
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save schedule' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/get-schedule', async (req, res) => {
  try {
    const data = await loadScheduledJobs();
    const job = data.jobs?.['default-backup-job'] || {
      enabled: false,
      frequency: 'daily',
      time: '00:00',
      dayOfWeek: 0,
      maxBackupsEnabled: false,
      maxBackupsCount: 100,
      smartBackupEnabled: false
    };
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Diff Viewer
app.post('/api/get-diff', async (req, res) => {
  try {
    const { livePath, backupPath } = req.body;
    const [liveContent, backupContent] = await Promise.all([
      fs.readFile(livePath, 'utf-8').catch(() => ''),
      fs.readFile(backupPath, 'utf-8').catch(() => '')
    ]);
    res.json({ liveContent, backupContent });
  } catch (error) {
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
    const esphomeDir = process.env.ESPHOME_CONFIG_PATH || path.join(configPath, 'esphome');
    const filePath = resolveWithinDirectory(esphomeDir, fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    if (error.code === 'INVALID_PATH') {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('[get-live-esphome-file] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/restore-esphome-file', async (req, res) => {
  try {
    if (!(await isEsphomeEnabled())) {
      return res.status(404).json({ error: 'ESPHome feature disabled' });
    }
    const { fileName, content, timezone, liveConfigPath, smartBackupEnabled } = req.body;

    // Perform a backup before restoring - respect Smart Backup setting
    // If smartBackupEnabled not explicitly provided, read from scheduled jobs settings
    let effectiveSmartBackup = smartBackupEnabled;
    if (typeof smartBackupEnabled === 'undefined') {
      const scheduledJobsData = await loadScheduledJobs();
      const defaultJob = scheduledJobsData.jobs?.['default-backup-job'] || {};
      effectiveSmartBackup = defaultJob.smartBackupEnabled ?? false;
    }
    await performBackup(liveConfigPath || null, null, 'pre-restore', false, 100, timezone, effectiveSmartBackup);

    const configPath = liveConfigPath || '/config';
    const esphomeDir = process.env.ESPHOME_CONFIG_PATH || path.join(configPath, 'esphome');
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

// Lovelace endpoints
app.post('/api/get-backup-lovelace', async (req, res) => {
  try {
    const { backupPath } = req.body;

    // Check manifest
    try {
      const manifestPath = path.join(backupPath, '.backup_manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);
      if (manifest.files && manifest.files.lovelace) {
        return res.json({ lovelaceFiles: manifest.files.lovelace });
      }
    } catch (e) {
      // Fallback
    }

    const storageDir = path.join(backupPath, '.storage');
    try {
      const files = await fs.readdir(storageDir);
      const lovelaceFiles = files.filter(f =>
        f === 'lovelace' || f === 'lovelace_resources' || f.startsWith('lovelace.')
      );
      res.json({ lovelaceFiles });
    } catch (e) {
      res.json({ lovelaceFiles: [] });
    }
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

    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    console.error('[get-backup-lovelace-file] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/get-live-lovelace-file', async (req, res) => {
  try {
    const { fileName, liveConfigPath } = req.body;
    const configPath = liveConfigPath || '/config';
    const filePath = path.join(configPath, '.storage', fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    console.error('[get-live-lovelace-file] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/restore-lovelace-file', async (req, res) => {
  try {
    const { fileName, backupPath, content, timezone, liveConfigPath, smartBackupEnabled } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    if (!backupPath && typeof content === 'undefined') {
      return res.status(400).json({ error: 'backupPath or content is required' });
    }

    // Perform a backup before restoring - respect Smart Backup setting
    // If smartBackupEnabled not explicitly provided, read from scheduled jobs settings
    let effectiveSmartBackup = smartBackupEnabled;
    if (typeof smartBackupEnabled === 'undefined') {
      const scheduledJobsData = await loadScheduledJobs();
      const defaultJob = scheduledJobsData.jobs?.['default-backup-job'] || {};
      effectiveSmartBackup = defaultJob.smartBackupEnabled ?? false;
    }
    await performBackup(liveConfigPath || null, null, 'pre-restore', false, 100, timezone, effectiveSmartBackup);

    const configPath = liveConfigPath || '/config';
    const targetFilePath = path.join(configPath, '.storage', fileName);
    await fs.mkdir(path.dirname(targetFilePath), { recursive: true });

    if (backupPath) {
      try {
        const sourceFilePath = await resolveFileInBackupChain(backupPath, path.join('.storage', fileName));
        await fs.copyFile(sourceFilePath, targetFilePath);
      } catch (copyError) {
        console.error('[restore-lovelace-file] Restore failed:', copyError.message);
        throw copyError;
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
    const { fileName, content, timezone, liveConfigPath, smartBackupEnabled } = req.body;
    // Perform a backup before restoring - respect Smart Backup setting
    // If smartBackupEnabled not explicitly provided, read from scheduled jobs settings
    let effectiveSmartBackup = smartBackupEnabled;
    if (typeof smartBackupEnabled === 'undefined') {
      const scheduledJobsData = await loadScheduledJobs();
      const defaultJob = scheduledJobsData.jobs?.['default-backup-job'] || {};
      effectiveSmartBackup = defaultJob.smartBackupEnabled ?? false;
    }
    await performBackup(liveConfigPath || null, null, 'pre-restore', false, 100, timezone, effectiveSmartBackup);

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
    const backupRoot = options.backupFolderPath || '/media/timemachine';
    let allBackups = [];
    try {
      allBackups = await getAllBackupPaths(backupRoot);
    } catch (e) {
      debugLog('[health] Could not get backup paths:', e.message);
    }

    let lastBackup = null;
    if (allBackups.length > 0) {
      lastBackup = path.basename(allBackups[0]);
    }

    // Disk usage
    let disk_info = {};
    try {
      const stats = await fs.statfs(backupRoot);
      const total = Number(stats.blocks * stats.bsize);
      const free = Number(stats.bfree * stats.bsize);
      disk_info = {
        total_gb: (total / (1024 ** 3)).toFixed(2),
        free_gb: (free / (1024 ** 3)).toFixed(2),
        used_pct: (((total - free) / total) * 100).toFixed(1)
      };
    } catch (e) {
      debugLog('[health] Could not get disk usage:', e.message);
    }

    // Get active schedule
    const scheduledJobsData = await loadScheduledJobs();
    const activeSchedules = Object.values(scheduledJobsData.jobs || {})
      .filter(job => job.enabled)
      .map(job => job.frequency);

    res.json({
      status: 'ok',
      version,
      backup_count: allBackups.length,
      last_backup: lastBackup,
      last_backup_status: LAST_BACKUP_STATE.status,
      disk_usage: disk_info,
      active_schedules: activeSchedules
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Start server
app.listen(PORT, HOST, async () => {
  console.log(`[INIT] Home Assistant Time Machine v${version}`);
  console.log(`[INIT] Server listening on http://${HOST}:${PORT}`);
  console.log(`[INIT] HA Config Path: /config`);
  console.log(`[INIT] Backup Root Path: /media/timemachine`);

  // Initial load of state and schedules
  await loadBackupState();
  await loadDockerSettings();
  await initScheduledBackups();
});
