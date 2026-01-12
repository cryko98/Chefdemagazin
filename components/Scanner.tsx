import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Copy, StopCircle, PlayCircle, ScanLine, AlertCircle, RefreshCw } from 'lucide-react';
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
  const [cameraLoading, setCameraLoading] = useState(true);
  
  // Ref to hold the scanner instance
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Ref to track component mount status to prevent race conditions
  const isMounted = useRef(true);
  // Ref to track last scanned item for debouncing
  const lastScanRef = useRef<{ code: string; time: number } | null>(null);

  useEffect(() => {
    isMounted.current = true;
    
    // Initialize scanner immediately on mount
    const initScanner = async () => {
        // Small delay to ensure the DOM element "reader" is rendered
        await new Promise(r => setTimeout(r, 100));
        
        if (!isMounted.current) return;

        // Cleanup existing instance if any
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                await scannerRef.current.clear();
            } catch (e) { 
                // ignore stop errors
            }
        }

        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        startScanning(html5QrCode);
    };

    initScanner();

    // Cleanup function
    return () => {
      isMounted.current = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop()
            .then(() => scannerRef.current?.clear())
            .catch(err => console.warn("Scanner stop error", err));
      }
    };
  }, []);

  const startScanning = async (scannerInstance: Html5Qrcode) => {
    if (!scannerInstance) return;
    
    setPermissionError(false);
    setCameraLoading(true);

    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };

    try {
        await scannerInstance.start(
            { facingMode: "environment" }, // Prefer back camera
            config,
            (decodedText, decodedResult) => {
                // Success callback
                if (isMounted.current) {
                    onScanSuccess(decodedText, decodedResult);
                }
            },
            (errorMessage) => {
                // Error callback (runs on every frame that doesn't have a code)
                // We ignore this to keep logs clean
            }
        );
        
        if (isMounted.current) {
            setIsScanning(true);
            setCameraLoading(false);
        }
    } catch (err) {
        console.error("Error starting scanner:", err);
        if (isMounted.current) {
            setIsScanning(false);
            setCameraLoading(false);
            setPermissionError(true);
        }
    }
  };

  const handleManualRetry = () => {
      if (scannerRef.current) {
          startScanning(scannerRef.current);
      }
  };

  const handleStop = async () => {
      if (scannerRef.current && isScanning) {
          try {
              await scannerRef.current.stop();
              setIsScanning(false);
          } catch (e) {
              console.error("Stop failed", e);
          }
      }
  };
  
  const handleStart = () => {
      if (scannerRef.current) {
          startScanning(scannerRef.current);
      }
  };

  const onScanSuccess = (decodedText: string, decodedResult: any) => {
    const now = Date.now();
    
    // Check if same code was scanned recently (within 2.5 seconds)
    // This prevents the "machine gun" effect where one barcode triggers multiple scans instantly
    if (lastScanRef.current && 
        lastScanRef.current.code === decodedText && 
        now - lastScanRef.current.time < 2500) {
        return;
    }

    // Update last scan ref
    lastScanRef.current = { code: decodedText, time: now };

    setScannedItems(prev => {
        const newItem: ScannedItem = {
            code: decodedText,
            timestamp: new Date().toLocaleTimeString(),
            format: decodedResult?.result?.format?.formatName || 'BARCODE'
        };
        
        // Vibrate if supported to give feedback
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        return [newItem, ...prev];
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearList = () => {
      setScannedItems([]);
      lastScanRef.current = null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                <ScanLine className="text-orange-500" />
                <span>{t.scanner}</span>
            </h2>
            <div className="flex space-x-2">
                {isScanning ? (
                    <button 
                        onClick={handleStop}
                        className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                        <StopCircle size={16} />
                        <span className="hidden sm:inline">{t.stopScan}</span>
                    </button>
                ) : (
                    <button 
                        onClick={handleStart}
                        className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
                    >
                        <PlayCircle size={16} />
                        <span className="hidden sm:inline">{t.startScan}</span>
                    </button>
                )}
            </div>
        </div>

        {/* Camera Container */}
        <div className="relative bg-black rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center aspect-square md:aspect-video max-h-[60vh]">
            
            {/* Loading State */}
            {cameraLoading && !permissionError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                    <RefreshCw className="w-8 h-8 animate-spin mb-2 text-lime-500" />
                    <p className="text-sm">Starting Camera...</p>
                </div>
            )}

            {/* Error State */}
            {permissionError && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/90 p-6 text-center z-20">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="mb-2 font-bold">{t.cameraError}</p>
                    <p className="text-xs text-slate-400 mb-4 max-w-xs">
                        Please ensure you have granted camera permissions to this site. On mobile, you may need to tap "Retry" below.
                    </p>
                    <button 
                        onClick={handleManualRetry} 
                        className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Retry Camera
                    </button>
                 </div>
            )}
            
            {/* The actual video element container */}
            <div id="reader" className="w-full h-full object-cover"></div>
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