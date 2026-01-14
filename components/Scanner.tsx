
import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Copy, StopCircle, PlayCircle, ScanLine, AlertCircle, RefreshCw, Trash2, Store, Zap, ZapOff, Focus, Camera } from 'lucide-react';
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
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMounted = useRef(true);
  const beepSound = useRef<HTMLAudioElement | null>(null);
  const scanThrottleRef = useRef<boolean>(false);

  useEffect(() => {
    isMounted.current = true;
    beepSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    beepSound.current.volume = 0.4;

    if (storeLocation) handleRefresh();

    const channel = supabase.channel('scanned-items-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'scanned_items' }, () => { 
            if(storeLocation) handleRefresh(); 
        })
        .subscribe();
    
    return () => {
      isMounted.current = false;
      stopScanner();
      supabase.removeChannel(channel);
    };
  }, [storeLocation]);

  // Renamed from fetchScannedItems to handleRefresh to resolve reference error and added loading state
  const handleRefresh = async () => {
      if (!storeLocation) return;
      setDataLoading(true);
      try {
        const { data, error } = await supabase
            .from('scanned_items')
            .select('*')
            .eq('store_location', storeLocation)
            .order('created_at', { ascending: false });
        if (data && !error && isMounted.current) setScannedItems(data);
      } catch (err) { 
          console.error("Fetch error:", err); 
      } finally {
          if (isMounted.current) setDataLoading(false);
      }
  };

  const toggleTorch = async () => {
      if (!scannerRef.current || !hasTorch) return;
      try {
          const newState = !torchOn;
          await scannerRef.current.applyVideoConstraints({
              // @ts-ignore
              advanced: [{ torch: newState }]
          });
          setTorchOn(newState);
      } catch (e) {
          console.error("Torch error", e);
      }
  };

  const stopScanner = async () => {
      if (scannerRef.current) {
          try {
              if (scannerRef.current.isScanning) {
                if (torchOn) await toggleTorch();
                await scannerRef.current.stop();
              }
              await scannerRef.current.clear();
          } catch (e) {
              console.warn("Stop error", e);
          }
      }
      setIsScanning(false);
      setHasTorch(false);
      setTorchOn(false);
  };

  const startScanning = async () => {
    setPermissionError(null);
    setCameraLoading(true);

    try {
        // 1. Megállítjuk a régit ha van
        if (scannerRef.current) {
            await stopScanner();
        }
        
        // 2. Új példány
        scannerRef.current = new Html5Qrcode("reader");

        // 3. Lekérjük a kamerákat az engedély ellenőrzéséhez és választáshoz
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
            throw new Error("Nu s-a găsit nicio cameră.");
        }

        // 4. Konfiguráció
        const config = { 
            fps: 30, 
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                const width = Math.min(viewfinderWidth * 0.85, 300);
                const height = Math.min(viewfinderHeight * 0.4, 180);
                return { width, height };
            },
            aspectRatio: 1.0,
            formatsToSupport: [ 
                Html5QrcodeSupportedFormats.EAN_13, 
                Html5QrcodeSupportedFormats.EAN_8, 
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.QR_CODE
            ]
        };

        // 5. Indítás a hátlapi kamerával
        await scannerRef.current.start(
            { facingMode: "environment" }, 
            {
                ...config,
                videoConstraints: {
                    facingMode: "environment",
                    // @ts-ignore
                    focusMode: "continuous",
                    width: { min: 640, ideal: 1280 },
                    height: { min: 480, ideal: 720 },
                }
            },
            onScanSuccess,
            () => {}
        );
        
        if (isMounted.current) {
            setIsScanning(true);
            setCameraLoading(false);
            
            // Torch check
            const track = scannerRef.current.getRunningTrack();
            const capabilities = track.getCapabilities() as any;
            if (capabilities.torch) setHasTorch(true);
        }
    } catch (err: any) {
        console.error("Scanner Error:", err);
        if (isMounted.current) {
            setIsScanning(false);
            setCameraLoading(false);
            setPermissionError(err.message || "Eroare la accesarea camerei.");
        }
    }
  };

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
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
    if (navigator.vibrate) navigator.vibrate(80);

    if (!storeLocation) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('scanned_items')
        .insert([{
            code: decodedText,
            format: decodedResult?.result?.format?.formatName || 'BARCODE',
            store_location: storeLocation, 
            user_id: user.id
        }])
        .select()
        .single();

    if (data && !error) {
        setScannedItems(prev => [data, ...prev]);
    }
  };

  const handleDelete = async (id: string) => {
      setScannedItems(prev => prev.filter(i => i.id !== id));
      await supabase.from('scanned_items').delete().eq('id', id);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                <ScanLine className="text-orange-500" size={18} />
                <span>{t.scanner}</span>
            </h2>
            <div className="flex space-x-2">
                {isScanning ? (
                    <button onClick={stopScanner} className="flex items-center space-x-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                        <StopCircle size={14} />
                        <span>{t.stopScan}</span>
                    </button>
                ) : (
                    <button onClick={startScanning} disabled={!storeLocation || cameraLoading} className="flex items-center space-x-1 px-3 py-1.5 bg-lime-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                        {cameraLoading ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={14} />}
                        <span>{t.startScan}</span>
                    </button>
                )}
            </div>
        </div>

        <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-[250px] flex items-center justify-center aspect-square md:aspect-video shadow-xl border-2 border-slate-900">
            {cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 bg-slate-900/90 backdrop-blur-sm">
                    <RefreshCw className="w-8 h-8 animate-spin mb-3 text-lime-500" />
                    <p className="text-xs font-bold uppercase tracking-widest text-lime-100">Se inițializează...</p>
                </div>
            )}
            
            <div id="reader" className="w-full h-full"></div>
            
            {isScanning && (
                 <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-[85%] h-[40%] border-2 border-orange-500/80 rounded-lg relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-orange-500 rounded-tl"></div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-orange-500 rounded-tr"></div>
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-orange-500 rounded-bl"></div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-orange-500 rounded-br"></div>
                        
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.8)] animate-[scan_2s_linear_infinite]"></div>
                    </div>

                    <div className="mt-6">
                        <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                            <Focus size={12} className="text-lime-400 animate-pulse" />
                            <span className="text-white text-[9px] font-black uppercase tracking-widest">Focus Actv</span>
                        </div>
                    </div>

                    {hasTorch && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleTorch(); }} 
                            className={`pointer-events-auto absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 transition-all ${
                                torchOn ? 'bg-orange-500 border-white text-white' : 'bg-black/50 border-white/20 text-white/70'
                            }`}
                        >
                            {torchOn ? <Zap size={18} fill="currentColor" /> : <ZapOff size={18} />}
                        </button>
                    )}
                    
                    {lastScannedCode && (
                        <div className="absolute top-8 px-5 py-2 bg-lime-500 text-white rounded-full text-xs font-black shadow-2xl animate-bounce border-2 border-white">
                           {lastScannedCode}
                        </div>
                    )}
                 </div>
            )}

            {permissionError && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center bg-slate-900 z-30">
                    <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                    <p className="text-xs font-bold mb-1">Eroare Cameră</p>
                    <p className="text-[10px] text-slate-400 mb-4">{permissionError}</p>
                    <button onClick={startScanning} className="px-5 py-2 bg-orange-500 text-white rounded-xl font-bold text-xs shadow-lg">Reîncearcă</button>
                 </div>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-2.5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-black text-slate-700 text-[9px] uppercase tracking-widest">{t.scannedCodes} ({scannedItems.length})</h3>
            <button onClick={handleRefresh} disabled={dataLoading} className="p-1 text-slate-400">
                <RefreshCw size={12} className={dataLoading ? "animate-spin" : ""} />
            </button>
        </div>
        <ul className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto">
            {scannedItems.map((item) => (
                <li key={item.id} className="p-2.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                        <p className="font-mono text-sm font-black text-slate-800 truncate">{item.code}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase">{item.format} • {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                        <button onClick={() => {
                            navigator.clipboard.writeText(item.code);
                            if (navigator.vibrate) navigator.vibrate(20);
                        }} className="p-2 text-slate-400 hover:text-orange-500"><Copy size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                </li>
            ))}
            {scannedItems.length === 0 && (
                <li className="p-6 text-center text-slate-300 text-[10px] italic font-medium">Niciun cod scanat</li>
            )}
        </ul>
      </div>

      <style>{`
        @keyframes scan {
            0% { top: 0%; opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Scanner;
