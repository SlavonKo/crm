/**
 * Telegram Bot Handler
 * 
 * Initializes and manages Telegram bot using node-telegram-bot-api.
 * Responds to /start command with success message.
 * Generates QR code as image file.
 * Logs all messages to console for debugging.
 */

import TelegramBot from 'node-telegram-bot-api';
import QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

let bot: TelegramBot | null = null;
let botInitializing = false;

// Create logs directory if it doesn't exist
// Resolve relative to the directory where this file is located (backend/src/)
// So we get: backend/logs/
const logsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, `telegram-${new Date().toISOString().split('T')[0]}.log`);

function logMessage(message: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  // Log to console
  console.log(`[telegram-bot] ${message}`);
  
  // Log to file
  try {
    fs.appendFileSync(logFile, logEntry, 'utf8');
  } catch (err) {
    console.error('[telegram-bot] Error writing to log file:', err);
  }
}

async function generateQRCodeImage(url: string): Promise<string | null> {
  try {
    const qrPath = path.join(logsDir, 'telegram-bot-qr.png');
    await QRCode.toFile(qrPath, url, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    logMessage(`✓ QR code image generated: ${qrPath}`);
    return qrPath;
  } catch (err) {
    logMessage(`✗ Error generating QR code image: ${err}`);
    return null;
  }
}

async function getBotUsername(token: string): Promise<string | null> {
  try {
    const tempBot = new TelegramBot(token, { polling: false });
    const info = await tempBot.getMe();
    return info.username || null;
  } catch (err) {
    logMessage(`✗ Error getting bot info: ${err}`);
    return null;
  }
}

export async function initTelegramBot(token: string): Promise<TelegramBot | null> {
  // Prevent multiple concurrent initialization attempts
  if (botInitializing) {
    logMessage('⚠ Bot initialization already in progress, waiting...');
    // Wait for bot to be ready (with timeout)
    const maxWait = 5000; // 5 seconds
    const startTime = Date.now();
    while (botInitializing && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (bot) {
      return bot;
    }
    logMessage('⚠ Bot initialization timeout, returning null');
    return null;
  }

  if (bot) {
    logMessage('⚠ Bot already initialized, returning existing instance');
    return bot;
  }

  botInitializing = true;

  try {
    bot = new TelegramBot(token, { polling: true });
    logMessage('Telegram bot instance created with polling enabled');

    // Handle /start command
    bot.onText(/\/start/, async (msg: TelegramBot.Message) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      const userName = msg.from?.first_name || 'Unknown';
      
      logMessage(`/start command received from user ${userId} (${userName})`);
      
      try {
        // Send welcome message with /start button
        const keyboard = {
          reply_markup: {
            keyboard: [[{ text: '/start' }]],
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        };

        await bot!.sendMessage(
          chatId,
          '👋 Добро пожаловать! Нажмите кнопку ниже для начала работы:',
          keyboard as TelegramBot.SendMessageOptions
        );
        
        logMessage(`✓ Welcome message with /start button sent to user ${userId}`);
      } catch (err: unknown) {
        logMessage(`✗ Error sending welcome message to user ${userId}: ${err}`);
      }
    });

    // Handle any new message
    bot.on('message', (msg: TelegramBot.Message) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      const userName = msg.from?.first_name || 'Unknown';
      const text = msg.text || '(no text)';

      // Skip if it's a /start command (already handled above)
      if (text === '/start') {
        return;
      }

      logMessage(`📨 Message from user ${userId} (${userName}): "${text}"`);

      // For any other message, suggest /start command with keyboard button
      const keyboard = {
        reply_markup: {
          keyboard: [[{ text: '/start' }]],
          resize_keyboard: true,
          one_time_keyboard: false, // Keep button visible until explicitly removed
        },
      };

      bot!.sendMessage(
        chatId,
        '❓ Не понимаю команду. Пожалуйста, нажмите кнопку ниже:',
        keyboard as TelegramBot.SendMessageOptions
      )
        .then(() => {
          logMessage(`✓ /start button suggestion sent to user ${userId}`);
        })
        .catch((err: unknown) => {
          logMessage(`✗ Error sending /start button to user ${userId}: ${err}`);
        });
    });

    // Handle errors
    bot.on('polling_error', (error: Error) => {
      logMessage(`✗ Polling error: ${error.message}`);
      
      // If it's a 409 Conflict error (already polling), try to recover
      if (error.message.includes('409') || error.message.includes('terminated by other getUpdates')) {
        logMessage('⚠ Detected multiple polling instances. This may happen during development.');
        logMessage('→ Status endpoint: GET /api/telegram/status');
        logMessage('→ Check bot status via frontend before restarting.');
        logMessage('→ If problem persists, restart the server with: npm run dev');
      }
    });

    logMessage('✓ Telegram bot initialized successfully');

    // Generate QR code with real bot username
    setImmediate(async () => {
      try {
        console.log('[telegram-bot] Starting QR code generation...');
        
        // Get real bot username from Telegram API
        const botUsername = await getBotUsername(token);
        console.log('[telegram-bot] Bot username retrieved:', botUsername);
        
        if (!botUsername) {
          console.warn('[telegram-bot] ⚠ Could not get bot username, using fallback');
          return;
        }
        
        const botUrl = `https://t.me/${botUsername}`;
        console.log('[telegram-bot] Bot URL:', botUrl);
        
        // Generate QR code image
        const qrImagePath = await generateQRCodeImage(botUrl);
        
        if (qrImagePath) {
          console.log('[telegram-bot] ✓ QR code image generated and available via /api/telegram/qr');
        }
      } catch (err) {
        console.error(`[telegram-bot] ✗ Error with QR code generation:`, err);
      }
    });

    return bot;
  } catch (err) {
    logMessage(`✗ Failed to initialize Telegram bot: ${err}`);
    botInitializing = false;
    return null;
  } finally {
    if (bot) {
      botInitializing = false;
    }
  }
}

export function getTelegramBot(): TelegramBot | null {
  return bot;
}

export async function stopTelegramBot(): Promise<void> {
  if (bot) {
    try {
      logMessage('Stopping bot polling...');
      await bot.stopPolling();
      logMessage('✓ Bot stopped');
      bot = null;
      botInitializing = false;
    } catch (err: unknown) {
      logMessage(`✗ Error stopping bot: ${err}`);
      bot = null;
      botInitializing = false;
    }
  }
}
