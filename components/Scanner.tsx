import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Copy, Trash2, StopCircle, PlayCircle, ScanLine } from 'lucide-react';
import { Language, Translation } from '../types';

interface ScannerProps {
  t: Translation;
  lang: Language;
}

interface ScannedItem {
  code: string;
  timestamp: string;
  format?: string;
}

const Scanner: React.FC<ScannerProps> = ({ t, lang }) => {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, []);

  const startScanning = () => {
    if (isScanning) return;

    // Use a timeout to ensure DOM is ready
    setTimeout(() => {
        try {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.UPC_E,
                        Html5QrcodeSupportedFormats.QR_CODE
                    ]
                },
                /* verbose= */ false
            );

            scanner.render(onScanSuccess, onScanFailure);
            scannerRef.current = scanner;
            setIsScanning(true);
        } catch (e) {
            console.error(e);
            alert(t.cameraError);
        }
    }, 100);
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().then(() => {
        setIsScanning(false);
        scannerRef.current = null;
      }).catch((err) => {
        console.error("Failed to stop scanner", err);
      });
    }
  };

  const onScanSuccess = (decodedText: string, decodedResult: any) => {
    // Play a beep sound (simulated by logic or standard audio if available, skipping for now)
    
    setScannedItems(prev => {
        // Prevent duplicate consecutive scans (debounce)
        if (prev.length > 0 && prev[0].code === decodedText && (Date.now() - new Date(prev[0].timestamp).getTime() < 2000)) {
            return prev;
        }
        
        const newItem: ScannedItem = {
            code: decodedText,
            timestamp: new Date().toLocaleTimeString(),
            format: decodedResult?.result?.format?.formatName || 'BARCODE'
        };
        return [newItem, ...prev];
    });
  };

  const onScanFailure = (error: any) => {
    // console.warn(`Code scan error = ${error}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  const clearList = () => {
      setScannedItems([]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                <ScanLine className="text-orange-500" />
                <span>{t.scanner}</span>
            </h2>
            {isScanning ? (
                <button 
                    onClick={stopScanning}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                    <StopCircle size={18} />
                    <span>{t.stopScan}</span>
                </button>
            ) : (
                <button 
                    onClick={startScanning}
                    className="flex items-center space-x-2 px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
                >
                    <PlayCircle size={18} />
                    <span>{t.startScan}</span>
                </button>
            )}
        </div>

        {/* Camera Container */}
        <div className="relative bg-black rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center">
            {!isScanning && (
                <div className="text-slate-500 flex flex-col items-center">
                    <Camera size={48} className="mb-2 opacity-50" />
                    <p>{t.startScan}</p>
                </div>
            )}
            <div id="reader" className="w-full h-full"></div>
        </div>
      </div>

      {/* Results List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-700">{t.scannedCodes} ({scannedItems.length})</h3>
            {scannedItems.length > 0 && (
                <button onClick={clearList} className="text-sm text-red-500 hover:text-red-700">
                    {t.delete}
                </button>
            )}
        </div>
        <ul className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {scannedItems.map((item, idx) => (
                <li key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50">
                    <div>
                        <p className="font-mono text-lg font-bold text-slate-800">{item.code}</p>
                        <p className="text-xs text-slate-400">{item.format} • {item.timestamp}</p>
                    </div>
                    <button 
                        onClick={() => copyToClipboard(item.code)}
                        className="p-2 text-slate-400 hover:text-orange-500 transition-colors"
                        title={t.copy}
                    >
                        <Copy size={20} />
                    </button>
                </li>
            ))}
            {scannedItems.length === 0 && (
                <li className="p-8 text-center text-slate-400">
                    {t.noData}
                </li>
            )}
        </ul>
      </div>
    </div>
  );
};

export default Scanner;