import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Copy, StopCircle, PlayCircle, ScanLine, AlertCircle, RefreshCw, Trash2, Store, CheckCircle2 } from 'lucide-react';
import { Language, Translation, ScannedItem } from '../types';
import { supabase } from '../services/supabase';

interface ScannerProps {
  t: Translation;
  lang: Language;
  storeLocation?: string;
}

const Scanner: React.FC<ScannerProps> = ({ t, lang, storeLocation }) => {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMounted = useRef(true);
  const beepSound = useRef<HTMLAudioElement | null>(null);
  const scanThrottleRef = useRef<boolean>(false);

  useEffect(() => {
    isMounted.current = true;
    beepSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    beepSound.current.volume = 0.4;

    if (storeLocation) {
        fetchScannedItems();
    }

    const channel = supabase.channel('scanned-items-sync')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'scanned_items' },
            () => { if(storeLocation) fetchScannedItems(); }
        )
        .subscribe();
    
    return () => {
      isMounted.current = false;
      stopScanner();
      supabase.removeChannel(channel);
    };
  }, [storeLocation]);

  const fetchScannedItems = async () => {
      if (!storeLocation) return;
      try {
        const { data, error } = await supabase
            .from('scanned_items')
            .select('*')
            .eq('store_location', storeLocation)
            .order('created_at', { ascending: false });
        if (data && !error && isMounted.current) setScannedItems(data);
      } catch (err) { console.error("Fetch error:", err); }
  };

  const handleRefresh = async () => {
      setDataLoading(true);
      await fetchScannedItems();
      setDataLoading(false);
  }

  const stopScanner = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
          try { await scannerRef.current.stop(); } catch (e) { console.warn(e); }
      }
      setIsScanning(false);
  };

  const startScanning = async () => {
    setPermissionError(false);
    setCameraLoading(true);

    if (scannerRef.current) {
        try { await scannerRef.current.clear(); } catch(e) {}
    }
    scannerRef.current = new Html5Qrcode("reader");

    const config = { 
        fps: 20, // High FPS for smoother detection
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            // Optimized box for barcodes (wider, shorter)
            const width = viewfinderWidth * 0.8;
            const height = viewfinderHeight * 0.3;
            return { width, height };
        },
        aspectRatio: 1.0,
        // Barcode-specific formats for better accuracy
        formatsToSupport: [ 
            Html5QrcodeSupportedFormats.EAN_13, 
            Html5QrcodeSupportedFormats.EAN_8, 
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A
        ]
    };

    try {
        await scannerRef.current.start(
            { facingMode: "environment" }, 
            {
                ...config,
                videoConstraints: {
                    facingMode: "environment",
                    // CRITICAL: Request continuous focus
                    focusMode: { ideal: "continuous" } as any,
                    whiteBalanceMode: { ideal: "continuous" } as any,
                    exposureMode: { ideal: "continuous" } as any,
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 },
                }
            },
            onScanSuccess,
            () => {} // Silent frame errors
        );
        
        if (isMounted.current) {
            setIsScanning(true);
            setCameraLoading(false);
        }
    } catch (err) {
        console.error("Scanner start error:", err);
        if (isMounted.current) {
            setIsScanning(false);
            setCameraLoading(false);
            setPermissionError(true);
        }
    }
  };

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    // Prevent duplicate scans within 2 seconds
    if (scanThrottleRef.current || decodedText === lastScannedCode) return;
    
    scanThrottleRef.current = true;
    setLastScannedCode(decodedText);
    
    setTimeout(() => {
        scanThrottleRef.current = false;
        setLastScannedCode(null);
    }, 2500);

    if (beepSound.current) {
        beepSound.current.currentTime = 0;
        beepSound.current.play().catch(() => {});
    }
    if (navigator.vibrate) navigator.vibrate(60);

    if (!storeLocation) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newItemPayload = {
        code: decodedText,
        format: decodedResult?.result?.format?.formatName || 'BARCODE',
        store_location: storeLocation, 
        user_id: user.id
    };

    // Database Insert
    const { data, error } = await supabase
        .from('scanned_items')
        .insert([newItemPayload])
        .select()
        .single();

    if (error) {
        console.error("Save error:", error);
    } else if (data) {
        setScannedItems(prev => [data, ...prev]);
    }
  };

  const handleDelete = async (id: string) => {
      setScannedItems(prev => prev.filter(i => i.id !== id));
      await supabase.from('scanned_items').delete().eq('id', id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    if (navigator.vibrate) navigator.vibrate(20);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
            <div>
                 <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                    <ScanLine className="text-orange-500" />
                    <span>{t.scanner}</span>
                </h2>
                {storeLocation && (
                    <div className="flex items-center text-[10px] md:text-xs text-lime-700 mt-1 bg-lime-50 px-2 py-1 rounded-md w-fit border border-lime-200">
                        <Store size={12} className="mr-1" />
                        <span>Magazin: <strong>{storeLocation}</strong></span>
                    </div>
                )}
            </div>
            <div className="flex space-x-2 w-full md:w-auto">
                {isScanning ? (
                    <button onClick={stopScanner} className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm">
                        <StopCircle size={16} />
                        <span>{t.stopScan}</span>
                    </button>
                ) : (
                    <button onClick={startScanning} disabled={!storeLocation} className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 text-sm disabled:opacity-50">
                        <PlayCircle size={16} />
                        <span>{t.startScan}</span>
                    </button>
                )}
            </div>
        </div>

        <div className="relative bg-slate-900 rounded-lg overflow-hidden min-h-[250px] flex items-center justify-center aspect-video md:aspect-video shadow-inner border border-slate-800">
            {cameraLoading && !permissionError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-black/40">
                    <RefreshCw className="w-8 h-8 animate-spin mb-2 text-lime-500" />
                    <p className="text-xs">Accesare cameră...</p>
                </div>
            )}
            
            <div id="reader" className="w-full h-full"></div>
            
            {isScanning && !cameraLoading && (
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[85%] h-[40%] border-2 border-orange-500/60 rounded-md relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                        <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-orange-500 -ml-1 -mt-1"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-orange-500 -mr-1 -mt-1"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-orange-500 -ml-1 -mb-1"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-orange-500 -mr-1 -mb-1"></div>
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-orange-500/30 animate-pulse"></div>
                    </div>
                    {lastScannedCode && (
                        <div className="absolute top-4 px-4 py-2 bg-lime-500 text-white rounded-full text-xs font-bold animate-bounce shadow-lg">
                           ✓ {lastScannedCode}
                        </div>
                    )}
                 </div>
            )}

            {permissionError && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-20">
                    <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                    <p className="text-sm font-medium mb-3">{t.cameraError}</p>
                    <button onClick={startScanning} className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-xs">Reîncearcă</button>
                 </div>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-tight">{t.scannedCodes} ({scannedItems.length})</h3>
            <button onClick={handleRefresh} disabled={dataLoading} className="p-1.5 text-slate-400">
                <RefreshCw size={14} className={dataLoading ? "animate-spin" : ""} />
            </button>
        </div>
        <ul className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {scannedItems.map((item) => (
                <li key={item.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                        <p className="font-mono text-sm font-bold text-slate-800 truncate pr-2">{item.code}</p>
                        <p className="text-[9px] text-slate-400 uppercase">{item.format} • {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                        <button onClick={() => copyToClipboard(item.code)} className="p-2 text-slate-400 hover:text-orange-500"><Copy size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                </li>
            ))}
            {scannedItems.length === 0 && (
                <li className="p-8 text-center text-slate-400 text-xs">{t.noData}</li>
            )}
        </ul>
      </div>
    </div>
  );
};

export default Scanner;