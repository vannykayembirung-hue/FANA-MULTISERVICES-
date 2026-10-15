import React, { useState, useEffect } from 'react';
import { hardwareScanner, ScannerStatus, ScannerInterface } from '../../utils/hardwareScanner';
import { Produit } from '../../types';
import { 
  Barcode, 
  Usb, 
  Cpu, 
  Keyboard, 
  Check, 
  X, 
  AlertCircle, 
  Radio, 
  Zap, 
  Settings2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { posAudio } from '../../utils/audio';

interface HardwareScannerModalProps {
  products: Produit[];
  onBarcodeDetected: (barcode: string, source: ScannerInterface) => void;
  onClose: () => void;
}

export const HardwareScannerModal: React.FC<HardwareScannerModalProps> = ({
  products,
  onBarcodeDetected,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'SERIAL' | 'HID' | 'WEDGE' | 'SIMULATOR'>('SERIAL');
  const [status, setStatus] = useState<ScannerStatus>(hardwareScanner.getStatus());
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<{ code: string; time: string; source: string } | null>(null);
  const [testInput, setTestInput] = useState<string>('');

  useEffect(() => {
    const unsubStatus = hardwareScanner.subscribeStatus(newStatus => {
      setStatus(newStatus);
    });

    const unsubBarcode = hardwareScanner.subscribeBarcode((barcode, source) => {
      posAudio.playBeep();
      setLastScannedCode({
        code: barcode,
        time: new Date().toLocaleTimeString('fr-FR'),
        source,
      });
      onBarcodeDetected(barcode, source);
    });

    return () => {
      unsubStatus();
      unsubBarcode();
    };
  }, [onBarcodeDetected]);

  const handleConnectSerial = async () => {
    setErrorMessage(null);
    const res = await hardwareScanner.connectSerial(baudRate);
    if (!res.success) {
      setErrorMessage(res.error || 'Erreur de connexion série');
    }
  };

  const handleDisconnectSerial = async () => {
    await hardwareScanner.disconnectSerial();
  };

  const handleConnectHid = async () => {
    setErrorMessage(null);
    const res = await hardwareScanner.connectHid();
    if (!res.success) {
      setErrorMessage(res.error || 'Erreur de connexion HID');
    }
  };

  const handleDisconnectHid = async () => {
    await hardwareScanner.disconnectHid();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>Gestion Scanner Code-Barres</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                  Web Serial / HID
                </span>
              </h3>
              <p className="text-xs text-slate-400">Connectez vos douchettes et lecteurs optiques USB / Port Série</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Status Banner */}
        <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status.isSerialConnected || status.isHidConnected
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-orange-500'
              }`}
            />
            <span className="text-slate-300 font-medium">
              Statut matériel :{' '}
              <strong className="text-white">
                {status.isSerialConnected
                  ? `Connecté (Port Série @ ${status.baudRate} bauds)`
                  : status.isHidConnected
                  ? `Connecté (${status.activeDeviceName || 'Périphérique USB HID'})`
                  : 'Écoute active (Émulation Clavier USB)'}
              </strong>
            </span>
          </div>

          {lastScannedCode && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
              <span>Dernier scan :</span>
              <strong>{lastScannedCode.code}</strong>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-950/80 border-b border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 p-1.5 bg-slate-950 border-b border-slate-800 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('SERIAL')}
            className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'SERIAL'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Web Serial</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HID')}
            className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'HID'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>Web HID</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WEDGE')}
            className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'WEDGE'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Douchette USB</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SIMULATOR')}
            className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'SIMULATOR'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test Express</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: WEB SERIAL API */}
          {activeTab === 'SERIAL' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-orange-400" />
                    <span className="font-bold text-white text-xs">Protocole Web Serial (USB COM / RS-232)</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      status.isSerialSupported
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-red-950 text-red-300 border border-red-800'
                    }`}
                  >
                    {status.isSerialSupported ? 'Supporté par ce navigateur' : 'Non supporté'}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Idéal pour les lecteurs de code-barres industriels connectés en USB mode émulation série (VCP), Honeywell, Datalogic Gryphon, Motorola Zebra, ou scanners à montage fixe de supermarché.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Vitesse en Bauds (Baud Rate)</label>
                  <select
                    disabled={status.isSerialConnected}
                    value={baudRate}
                    onChange={e => setBaudRate(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  >
                    <option value={9600}>9600 bauds (Standard caisse)</option>
                    <option value={19200}>19200 bauds</option>
                    <option value={38400}>38400 bauds</option>
                    <option value={57600}>57600 bauds</option>
                    <option value={115200}>115200 bauds (Haute vitesse)</option>
                  </select>
                </div>

                <div>
                  {status.isSerialConnected ? (
                    <button
                      type="button"
                      onClick={handleDisconnectSerial}
                      className="w-full py-2.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-colors"
                    >
                      Déconnecter le port série
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectSerial}
                      disabled={!status.isSerialSupported}
                      className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                    >
                      <Cpu className="w-4 h-4" />
                      <span>Sélectionner le Port Série USB</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-200">Comment appairer votre douchette série :</p>
                <p>1. Branchez votre scanner de caisse au port USB du PC de caisse.</p>
                <p>2. Cliquez sur « Sélectionner le Port Série USB » ci-dessus.</p>
                <p>3. Choisissez le port COM correspondant dans la fenêtre native du navigateur.</p>
                <p>4. Dès qu'un article est scanné, le signal est capté instantanément.</p>
              </div>
            </div>
          )}

          {/* TAB 2: WEB HID API */}
          {activeTab === 'HID' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Usb className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-white text-xs">Protocole Web HID (Périphériques Point de Vente)</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      status.isHidSupported
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-red-950 text-red-300 border border-red-800'
                    }`}
                  >
                    {status.isHidSupported ? 'Supporté par ce navigateur' : 'Non supporté'}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Permet la communication directe avec les lecteurs de codes-barres configurés en mode USB POS / HID natif sans dépendre du focus du clavier.
                </p>
              </div>

              <div>
                {status.isHidConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnectHid}
                    className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-colors"
                  >
                    Déconnecter le lecteur HID ({status.activeDeviceName})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectHid}
                    disabled={!status.isHidSupported}
                    className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
                  >
                    <Usb className="w-4 h-4" />
                    <span>Rechercher Scanner USB HID</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: KEYBOARD WEDGE */}
          {activeTab === 'WEDGE' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span className="font-bold text-white text-xs">Écoute Globale Active (Plug &amp; Play)</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  95% des douchettes USB de supermarché fonctionnent immédiatement en émulation clavier : vous pouvez pointer le scanner sur n'importe quel code-barre sans même cliquer sur l'écran.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Champ de Test Immédiat</label>
                <input
                  type="text"
                  placeholder="Scannez ici pour tester le déclenchement..."
                  value={testInput}
                  onChange={e => setTestInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {/* TAB 4: SIMULATOR / FAST SCAN TEST */}
          {activeTab === 'SIMULATOR' && (
            <div className="space-y-3">
              <p className="text-slate-300 text-xs">
                Cliquez sur un article ci-dessous pour simuler un scan physique ultra-rapide au millième de seconde :
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {products.slice(0, 10).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      posAudio.playBeep();
                      onBarcodeDetected(p.ean, 'SERIAL');
                    }}
                    className="p-2.5 bg-slate-950 hover:bg-orange-500/20 hover:border-orange-500/80 border border-slate-800 rounded-xl text-left transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-1">
                      <div className="font-semibold text-white text-xs truncate group-hover:text-orange-300">
                        {p.nom}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">{p.ean}</div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-orange-400 shrink-0">
                      SCAN
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <span className="text-[11px] text-slate-400">
            F.A.N.A POS · Compatible douchette laser 1D / 2D QR Code
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
