/**
 * Telegram Bot Handler with Menu System & Forms
 * 
 * Features:
 * - Main menu with service categories
 * - Multi-step forms for collecting user information
 * - Session management for user state tracking
 * - Admin notifications when forms are submitted
 * - Navigation between menu and forms
 */

import TelegramBot from 'node-telegram-bot-api';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ─── Types ────────────────────────────────────────────────────────────────

type DialogState = 
  | 'main_menu'
  | 'service_selected'
  | 'asking_service_details'
  | 'asking_bike_brand'
  | 'asking_phone'
  | 'form_complete';

interface UserSession {
  userId: number;
  chatId: number;
  userName: string;
  state: DialogState;
  selectedService: string | null;
  serviceDetails: string | null;
  bikeBrand: string | null;
  phone: string | null;
  createdAt: Date;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  requiresDetails: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'maintenance',
    name: '🔧 Техническое обслуживание',
    icon: '🔧',
    requiresDetails: true,
  },
  {
    id: 'repair',
    name: '🔩 Ремонт мотоциклов',
    icon: '🔩',
    requiresDetails: true,
  },
  {
    id: 'painting',
    name: '🎨 Кузовные работы',
    icon: '🎨',
    requiresDetails: true,
  },
  {
    id: 'equipment',
    name: '📡 Установка/доработка оборудования',
    icon: '📡',
    requiresDetails: true,
  },
  {
    id: 'preparation',
    name: '⚙️ Подготовка к сезону',
    icon: '⚙️',
    requiresDetails: false,
  },
  {
    id: 'wheel_repair',
    name: '🛞 Ремонт дисков',
    icon: '🛞',
    requiresDetails: false,
  },
  {
    id: 'fuel_system',
    name: '⛽ Ремонт/настройка топливной',
    icon: '⛽',
    requiresDetails: false,
  },
];

// ─── Global State ─────────────────────────────────────────────────────────

let bot: TelegramBot | null = null;
let botInitializing = false;
const userSessions = new Map<number, UserSession>();
const submittedForms: UserSession[] = [];

// ─── Logging ──────────────────────────────────────────────────────────────

const logsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, `telegram-${new Date().toISOString().split('T')[0]}.log`);

function logMessage(message: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  console.log(`[telegram-bot] ${message}`);
  
  try {
    fs.appendFileSync(logFile, logEntry, 'utf8');
  } catch (err) {
    console.error('[telegram-bot] Error writing to log file:', err);
  }
}

// ─── Session Management ───────────────────────────────────────────────────

function createOrGetSession(userId: number, chatId: number, userName: string): UserSession {
  if (userSessions.has(userId)) {
    return userSessions.get(userId)!;
  }

  const session: UserSession = {
    userId,
    chatId,
    userName,
    state: 'main_menu',
    selectedService: null,
    serviceDetails: null,
    bikeBrand: null,
    phone: null,
    createdAt: new Date(),
  };

  userSessions.set(userId, session);
  return session;
}

function clearSession(userId: number): void {
  userSessions.delete(userId);
}

// ─── Menu Building ────────────────────────────────────────────────────────

function buildMainMenuKeyboard(): TelegramBot.SendMessageOptions {
  const buttons = SERVICE_CATEGORIES.map(cat => [{ text: cat.name }]);
  
  return {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  } as TelegramBot.SendMessageOptions;
}

function buildNavigationKeyboard(): TelegramBot.SendMessageOptions {
  return {
    reply_markup: {
      keyboard: [[{ text: '📋 Главное меню' }]],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  } as TelegramBot.SendMessageOptions;
}

// ─── Message Handlers ─────────────────────────────────────────────────────

async function handleMainMenu(chatId: number, session: UserSession): Promise<void> {
  if (!bot) return;

  const message = `
👋 Привет, ${session.userName}!

Выберите вид услуги:
`.trim();

  try {
    await bot.sendMessage(chatId, message, buildMainMenuKeyboard());
    session.state = 'main_menu';
  } catch (err) {
    logMessage(`✗ Error sending main menu to user ${session.userId}: ${err}`);
  }
}

async function handleServiceSelected(
  chatId: number,
  session: UserSession,
  selectedText: string
): Promise<void> {
  if (!bot) return;

  const service = SERVICE_CATEGORIES.find(s => s.name === selectedText);
  if (!service) {
    logMessage(`✗ Service not found for text: ${selectedText}`);
    return;
  }

  session.selectedService = service.name;
  session.state = 'service_selected';

  if (service.requiresDetails) {
    session.state = 'asking_service_details';
    const message = `
Вы выбрали: ${service.name}

Пожалуйста, опишите подробнее, что нужно сделать:
    `.trim();

    try {
      await bot.sendMessage(chatId, message, buildNavigationKeyboard());
    } catch (err) {
      logMessage(`✗ Error asking service details: ${err}`);
    }
  } else {
    // Skip details, go directly to bike brand
    session.state = 'asking_bike_brand';
    const message = `
Вы выбрали: ${service.name}

Укажите марку и модель вашего мотоцикла:
    `.trim();

    try {
      await bot.sendMessage(chatId, message, buildNavigationKeyboard());
    } catch (err) {
      logMessage(`✗ Error asking bike brand: ${err}`);
    }
  }
}

async function handleServiceDetails(
  chatId: number,
  session: UserSession,
  details: string
): Promise<void> {
  if (!bot) return;

  session.serviceDetails = details;
  session.state = 'asking_bike_brand';

  const message = `
✓ Спасибо!

Теперь укажите марку и модель вашего мотоцикла:
  `.trim();

  try {
    await bot.sendMessage(chatId, message, buildNavigationKeyboard());
  } catch (err) {
    logMessage(`✗ Error asking bike brand: ${err}`);
  }
}

async function handleBikeBrand(
  chatId: number,
  session: UserSession,
  brand: string
): Promise<void> {
  if (!bot) return;

  session.bikeBrand = brand;
  session.state = 'asking_phone';

  const message = `
✓ Спасибо!

Поделитесь своим номером телефона:
  `.trim();

  try {
    await bot.sendMessage(chatId, message, buildNavigationKeyboard());
  } catch (err) {
    logMessage(`✗ Error asking phone: ${err}`);
  }
}

async function handlePhoneSubmitted(
  chatId: number,
  session: UserSession,
  phone: string
): Promise<void> {
  if (!bot) return;

  session.phone = phone;
  session.state = 'form_complete';

  // Save the submitted form
  submittedForms.push({ ...session });

  const message = `
✓ Спасибо за обращение!

Ваша заявка отправлена.
Свяжемся с Вами в ближайшее время.

Детали заявки:
• Услуга: ${session.selectedService}
${session.serviceDetails ? `• Детали: ${session.serviceDetails}` : ''}
• Мотоцикл: ${session.bikeBrand}
• Телефон: ${session.phone}
  `.trim();

  try {
    await bot.sendMessage(chatId, message, buildMainMenuKeyboard());
    logMessage(`✓ Form submitted by user ${session.userId} (${session.userName}): ${JSON.stringify({
      service: session.selectedService,
      details: session.serviceDetails,
      bike: session.bikeBrand,
      phone: session.phone,
    })}`);

    // Reset session state
    session.state = 'main_menu';
    session.selectedService = null;
    session.serviceDetails = null;
    session.bikeBrand = null;
    session.phone = null;
  } catch (err) {
    logMessage(`✗ Error sending form completion message: ${err}`);
  }
}

async function handleBackToMenu(chatId: number, session: UserSession): Promise<void> {
  // Reset session state
  session.state = 'main_menu';
  session.selectedService = null;
  session.serviceDetails = null;
  session.bikeBrand = null;
  session.phone = null;

  await handleMainMenu(chatId, session);
}


// ─── Public API ───────────────────────────────────────────────────────────

export async function initTelegramBot(token: string): Promise<TelegramBot | null> {
  if (botInitializing) {
    logMessage('⚠ Bot initialization already in progress, waiting...');
    // Use Promise.race to avoid indefinite waiting with a timeout
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const checkInterval = async () => {
      for (let i = 0; i < 50; i++) {  // Max 5 seconds (50 * 100ms)
        if (!botInitializing) break;
        await sleep(100);
      }
    };
    await checkInterval();
    
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

      if (!userId) return;

      logMessage(`/start command received from user ${userId} (${userName})`);

      const session = createOrGetSession(userId, chatId, userName);
      await handleMainMenu(chatId, session);
    });

    // Handle any message
    bot.on('message', async (msg: TelegramBot.Message) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      const text = msg.text || '';

      if (!userId || !text || text.startsWith('/')) {
        return;
      }

      logMessage(`📨 Message from user ${userId}: "${text}"`);

      const session = createOrGetSession(userId, chatId, msg.from?.first_name || 'Unknown');

      // Handle "Главное меню" (Back to Main Menu)
      if (text === '📋 Главное меню') {
        await handleBackToMenu(chatId, session);
        return;
      }

      // Route based on current state
      switch (session.state) {
        case 'main_menu':
          const service = SERVICE_CATEGORIES.find(s => s.name === text);
          if (service) {
            await handleServiceSelected(chatId, session, text);
          } else {
            logMessage(`⚠ Unknown service selection: ${text}`);
          }
          break;

        case 'asking_service_details':
          await handleServiceDetails(chatId, session, text);
          break;

        case 'asking_bike_brand':
          await handleBikeBrand(chatId, session, text);
          break;

        case 'asking_phone':
          await handlePhoneSubmitted(chatId, session, text);
          break;

        default:
          logMessage(`⚠ Unexpected state for user ${userId}: ${session.state}`);
      }
    });

    // Handle errors
    bot.on('polling_error', (error: Error) => {
      logMessage(`✗ Polling error: ${error.message}`);
      
      if (error.message.includes('409') || error.message.includes('terminated by other getUpdates')) {
        logMessage('⚠ Detected multiple polling instances. This may happen during development.');
        logMessage('→ Status endpoint: GET /api/telegram/status');
        logMessage('→ Check bot status via frontend before restarting.');
        logMessage('→ If problem persists, restart the server with: npm run dev');
      }
    });

    logMessage('✓ Telegram bot initialized successfully');

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

// ─── Getters for Admin Dashboard ──────────────────────────────────────────

export function getSubmittedForms(): UserSession[] {
  return submittedForms;
}

export function clearSubmittedForms(): void {
  submittedForms.length = 0;
}
