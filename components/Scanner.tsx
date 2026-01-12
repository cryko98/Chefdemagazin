import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Copy, Trash2, StopCircle, PlayCircle, ScanLine, AlertCircle } from 'lucide-react';
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
  const [permissionError, setPermissionError] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Auto-start scanning when component mounts
    startScanning();

    // Cleanup on unmount
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = () => {
    if (isScanning || scannerRef.current) return;

    // Use a small timeout to ensure DOM element exists
    setTimeout(() => {
        try {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    // Prefer back camera on mobile
                    videoConstraints: {
                        facingMode: "environment" 
                    },
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
            setPermissionError(false);
        } catch (e) {
            console.error(e);
            setPermissionError(true);
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
    setScannedItems(prev => {
        // Prevent duplicate consecutive scans (debounce 2s)
        if (prev.length > 0 && prev[0].code === decodedText && (Date.now() - new Date(prev[0].timestamp as any).getTime() < 2000)) {
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
     // Standard behavior is to ignore frames with no barcode
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearList = () => {
      setScannedItems([]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                <ScanLine className="text-orange-500" />
                <span>{t.scanner}</span>
            </h2>
            {isScanning ? (
                <button 
                    onClick={stopScanning}
                    className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                    <StopCircle size={16} />
                    <span>{t.stopScan}</span>
                </button>
            ) : (
                <button 
                    onClick={startScanning}
                    className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
                >
                    <PlayCircle size={16} />
                    <span>{t.startScan}</span>
                </button>
            )}
        </div>

        {/* Camera Container */}
        <div className="relative bg-black rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center">
            {permissionError && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900 p-6 text-center z-10">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="mb-2">{t.cameraError}</p>
                    <button onClick={startScanning} className="mt-4 px-4 py-2 bg-slate-700 rounded text-sm">Retry</button>
                 </div>
            )}
            <div id="reader" className="w-full h-full"></div>
        </div>
      </div>

      {/* Results List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-700 text-sm">{t.scannedCodes} ({scannedItems.length})</h3>
            {scannedItems.length > 0 && (
                <button onClick={clearList} className="text-xs text-red-500 hover:text-red-700 font-medium uppercase">
                    {t.delete}
                </button>
            )}
        </div>
        <ul className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {scannedItems.map((item, idx) => (
                <li key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50">
                    <div className="overflow-hidden">
                        <p className="font-mono text-lg font-bold text-slate-800 break-all">{item.code}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{item.format} • {item.timestamp}</p>
                    </div>
                    <button 
                        onClick={() => copyToClipboard(item.code)}
                        className="p-3 bg-slate-100 rounded-full text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors ml-4"
                        title={t.copy}
                    >
                        <Copy size={18} />
                    </button>
                </li>
            ))}
            {scannedItems.length === 0 && (
                <li className="p-8 text-center text-slate-400 text-sm">
                    {t.noData}
                </li>
            )}
        </ul>
      </div>
    </div>
  );
};

export default Scanner;