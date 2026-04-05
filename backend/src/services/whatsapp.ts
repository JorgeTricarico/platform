import { makeWASocket, useMultiFileAuthState, DisconnectReason, type WASocket, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '../../whatsapp-auth');

type MessageHandler = (from: string, message: string) => void;

class WhatsAppService {
  private socket: WASocket | null = null;
  private qr: string | null = null;
  private connected = false;
  private messageHandlers: MessageHandler[] = [];

  getStatus() {
    return {
      connected: this.connected,
      qrReady: this.qr !== null,
      phone: this.socket?.user?.id ?? null,
    };
  }

  getQR(): string | null {
    return this.qr;
  }

  async sendMessage(to: string, message: string): Promise<{ id: string }> {
    if (!this.socket || !this.connected) {
      throw new Error('WhatsApp not connected');
    }
    // Normalize number: add @s.whatsapp.net suffix if needed
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    const result = await this.socket.sendMessage(jid, { text: message });
    return { id: result?.key?.id ?? 'unknown' };
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    this.socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
    });

    this.socket.ev.on('creds.update', saveCreds);

    this.socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qr = qr;
        this.connected = false;
        console.log('[WhatsApp] QR code ready. Scan with your phone.');
      }

      if (connection === 'open') {
        this.qr = null;
        this.connected = true;
        console.log('[WhatsApp] Connected!', this.socket?.user?.id);
      }

      if (connection === 'close') {
        this.connected = false;
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log('[WhatsApp] Connection closed. Reconnect:', shouldReconnect);
        if (shouldReconnect) {
          // Reconnect after a short delay
          setTimeout(() => this.connect(), 5000);
        }
      }
    });

    this.socket.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const from = msg.key.remoteJid ?? '';
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '';
        if (text && from) {
          for (const handler of this.messageHandlers) {
            handler(from, text);
          }
        }
      }
    });
  }
}

export const whatsappService = new WhatsAppService();
