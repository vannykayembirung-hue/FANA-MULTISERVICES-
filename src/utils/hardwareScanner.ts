// Hardware Barcode Scanner Controller supporting Web Serial API, Web HID API and Global HID Keyboard Wedge

export type ScannerInterface = 'SERIAL' | 'HID' | 'KEYBOARD_WEDGE';

export interface ScannerStatus {
  isSerialSupported: boolean;
  isHidSupported: boolean;
  isSerialConnected: boolean;
  isHidConnected: boolean;
  activeDeviceName: string | null;
  baudRate: number;
}

type BarcodeCallback = (barcode: string, source: ScannerInterface) => void;
type StatusCallback = (status: ScannerStatus) => void;

class HardwareScannerManager {
  private serialPort: any = null;
  private serialReader: any = null;
  private hidDevice: any = null;
  private isReadingSerial = false;
  private baudRate = 9600;

  // Global Keyboard Wedge buffer
  private keyBuffer = '';
  private lastKeyTime = 0;
  private wedgeActive = true;

  private onBarcodeCallbacks: Set<BarcodeCallback> = new Set();
  private onStatusCallbacks: Set<StatusCallback> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initKeyboardWedgeListener();
    }
  }

  public isSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public isHidSupported(): boolean {
    return typeof navigator !== 'undefined' && 'hid' in navigator;
  }

  public getStatus(): ScannerStatus {
    return {
      isSerialSupported: this.isSerialSupported(),
      isHidSupported: this.isHidSupported(),
      isSerialConnected: this.serialPort !== null,
      isHidConnected: this.hidDevice !== null,
      activeDeviceName: this.hidDevice?.productName || (this.serialPort ? 'Port Série USB' : null),
      baudRate: this.baudRate,
    };
  }

  public subscribeBarcode(cb: BarcodeCallback): () => void {
    this.onBarcodeCallbacks.add(cb);
    return () => this.onBarcodeCallbacks.delete(cb);
  }

  public subscribeStatus(cb: StatusCallback): () => void {
    this.onStatusCallbacks.add(cb);
    cb(this.getStatus());
    return () => this.onStatusCallbacks.delete(cb);
  }

  private notifyStatus(): void {
    const status = this.getStatus();
    this.onStatusCallbacks.forEach(cb => cb(status));
  }

  private emitBarcode(barcode: string, source: ScannerInterface): void {
    const cleaned = barcode.trim();
    if (!cleaned) return;
    this.onBarcodeCallbacks.forEach(cb => cb(cleaned, source));
  }

  // ==========================================
  // 1. WEB SERIAL API (USB COM / RS-232)
  // ==========================================
  public async connectSerial(baudRate = 9600): Promise<{ success: boolean; error?: string }> {
    if (!this.isSerialSupported()) {
      return { success: false, error: 'Web Serial API non supportée sur ce navigateur. Utilisez Chrome ou Edge.' };
    }

    try {
      this.baudRate = baudRate;
      // Request serial port access from user prompt
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate });
      this.serialPort = port;
      this.isReadingSerial = true;
      this.notifyStatus();

      // Start continuous background stream reader
      this.readSerialStream(port);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Échec de connexion au port série.' };
    }
  }

  private async readSerialStream(port: any): Promise<void> {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    this.serialReader = reader;

    let buffer = '';

    try {
      while (this.isReadingSerial) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          // Check for line terminators typical in POS barcode scanners (\r or \n)
          if (buffer.includes('\n') || buffer.includes('\r')) {
            const lines = buffer.split(/[\r\n]+/);
            // All complete lines except the last partial chunk
            for (let i = 0; i < lines.length - 1; i++) {
              const code = lines[i].trim();
              if (code.length >= 3) {
                this.emitBarcode(code, 'SERIAL');
              }
            }
            buffer = lines[lines.length - 1];
          }
        }
      }
    } catch {
      // Stream reading error or disconnected
    } finally {
      reader.releaseLock();
      this.disconnectSerial();
    }
  }

  public async disconnectSerial(): Promise<void> {
    this.isReadingSerial = false;
    if (this.serialReader) {
      try {
        await this.serialReader.cancel();
      } catch {}
      this.serialReader = null;
    }
    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch {}
      this.serialPort = null;
    }
    this.notifyStatus();
  }

  // ==========================================
  // 2. WEB HID API (USB POS BARCODE SCANNER)
  // ==========================================
  public async connectHid(): Promise<{ success: boolean; error?: string }> {
    if (!this.isHidSupported()) {
      return { success: false, error: 'Web HID API non supportée sur ce navigateur. Utilisez Chrome ou Edge.' };
    }

    try {
      // Request device selection
      const devices = await (navigator as any).hid.requestDevice({ filters: [] });
      if (!devices || devices.length === 0) {
        return { success: false, error: 'Aucun scanner sélectionné.' };
      }

      const device = devices[0];
      await device.open();
      this.hidDevice = device;
      this.notifyStatus();

      let hidBuffer = '';

      device.addEventListener('inputreport', (event: any) => {
        const { data } = event;
        // Parse incoming bytes from POS barcode scanner report
        for (let i = 0; i < data.byteLength; i++) {
          const byte = data.getUint8(i);
          if (byte === 0x0D || byte === 0x0A) {
            // Carriage return / Line feed
            if (hidBuffer.length >= 3) {
              this.emitBarcode(hidBuffer, 'HID');
              hidBuffer = '';
            }
          } else if (byte >= 32 && byte <= 126) {
            // Printable ASCII character
            hidBuffer += String.fromCharCode(byte);
          }
        }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Impossible d\'ouvrir le périphérique HID.' };
    }
  }

  public async disconnectHid(): Promise<void> {
    if (this.hidDevice) {
      try {
        await this.hidDevice.close();
      } catch {}
      this.hidDevice = null;
      this.notifyStatus();
    }
  }

  // ==========================================
  // 3. HARDWARE KEYBOARD WEDGE LISTENER
  // ==========================================
  // Detects rapid scanner bursts (< 45ms per character) from plug-and-play USB douchette
  private initKeyboardWedgeListener(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.wedgeActive) return;

      const currentTime = Date.now();
      const diff = currentTime - this.lastKeyTime;
      this.lastKeyTime = currentTime;

      // When Enter or Tab arrives and we accumulated characters quickly
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (this.keyBuffer.length >= 4) {
          const scannedCode = this.keyBuffer;
          this.keyBuffer = '';
          // Check if active target is not an open text input with deliberate manual typing
          const activeEl = document.activeElement;
          const isNormalTyping =
            activeEl &&
            (activeEl.tagName === 'TEXTAREA' ||
              (activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).type === 'text' && diff > 100));

          if (!isNormalTyping) {
            e.preventDefault();
            this.emitBarcode(scannedCode, 'KEYBOARD_WEDGE');
          }
        } else {
          this.keyBuffer = '';
        }
        return;
      }

      // If keys are coming in very fast (standard USB scanner emits keys every 5-35ms)
      if (diff > 80) {
        // Reset buffer if human typing paused
        this.keyBuffer = '';
      }

      if (e.key.length === 1) {
        this.keyBuffer += e.key;
      }
    });
  }

  public setKeyboardWedgeEnabled(enabled: boolean): void {
    this.wedgeActive = enabled;
  }
}

export const hardwareScanner = new HardwareScannerManager();
