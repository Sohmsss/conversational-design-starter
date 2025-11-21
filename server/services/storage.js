import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');

// Get session-specific data directory
function getSessionDataDir(sessionId) {
  if (sessionId) {
    return path.join(DATA_DIR, 'sessions', sessionId);
  }
  return DATA_DIR;
}

// Ensure data directory exists
async function ensureDataDir(sessionId = null) {
  const dataDir = getSessionDataDir(sessionId);
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // Directory already exists or other error
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Initialize data files if they don't exist
async function initializeDataFiles() {
  await ensureDataDir();
  
  const files = [
    { name: 'instructions.json', default: JSON.stringify({ content: '', updatedAt: null }, null, 2) },
    { name: 'functions.json', default: JSON.stringify([], null, 2) },
    { name: 'apiKeys.json', default: JSON.stringify({}, null, 2) }
  ];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file.name);
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist, create it with default content
      await fs.writeFile(filePath, file.default, 'utf8');
    }
  }
}

// Read JSON file
export async function readJSON(filename, sessionId = null) {
  // API keys are always stored globally (not per session)
  const useSession = filename !== 'apiKeys.json' ? sessionId : null;

  await ensureDataDir(useSession);
  const dataDir = getSessionDataDir(useSession);
  const filePath = path.join(dataDir, filename);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default based on filename
      if (filename === 'instructions.json') {
        return { content: '', updatedAt: null };
      } else if (filename === 'functions.json') {
        return [];
      } else if (filename === 'apiKeys.json') {
        return {};
      }
    }
    throw error;
  }
}

// Write JSON file
export async function writeJSON(filename, data, sessionId = null) {
  // API keys are always stored globally (not per session)
  const useSession = filename !== 'apiKeys.json' ? sessionId : null;

  await ensureDataDir(useSession);
  const dataDir = getSessionDataDir(useSession);
  const filePath = path.join(dataDir, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Initialize on module load
initializeDataFiles().catch(console.error);

