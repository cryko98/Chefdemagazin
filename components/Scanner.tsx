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
    try {
        beepSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        beepSound.current.volume = 0.4;
    } catch (e) {
        console.warn("Audio not supported");
    }

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
        if (!Html5Qrcode) {
            throw new Error("Biblioteca de scanare nu a putut fi încărcată.");
        }

        if (scannerRef.current) {
            await stopScanner();
        }
        
        scannerRef.current = new Html5Qrcode("reader");

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
            throw new Error("Nu s-a găsit nicio cameră.");
        }

        // Expanded formats for retail
        const formats = Html5QrcodeSupportedFormats ? [ 
            Html5QrcodeSupportedFormats.EAN_13, 
            Html5QrcodeSupportedFormats.EAN_8, 
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE
        ] : undefined;

        // Wider qrbox for EAN-13 codes
        const config = { 
            fps: 30, // Higher FPS for better tracking
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                const width = Math.min(viewfinderWidth * 0.9, 350);
                const height = Math.min(viewfinderHeight * 0.35, 120); // Taller than wide? No, 1D is wide.
                return { width, height };
            },
            aspectRatio: 1.0,
            formatsToSupport: formats,
            disableFlip: true // Usually helpful for back camera
        };

        await scannerRef.current.start(
            { facingMode: "environment" }, 
            {
                ...config,
                videoConstraints: {
                    facingMode: "environment",
                    // @ts-ignore
                    focusMode: "continuous",
                    // Higher ideal resolution for sharp barcode detection
                    width: { min: 640, ideal: 1920, max: 1920 },
                    height: { min: 480, ideal: 1080, max: 1080 },
                }
            },
            onScanSuccess,
            () => {}
        );
        
        if (isMounted.current) {
            setIsScanning(true);
            setCameraLoading(false);
            
            try {
                const track = scannerRef.current.getRunningTrack();
                const capabilities = track.getCapabilities() as any;
                if (capabilities.torch) setHasTorch(true);
            } catch (e) {}
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
    // Avoid double scans or jittery reads
    if (scanThrottleRef.current) return;
    
    // Validate if the read looks like a real barcode (min 8 digits)
    if (decodedText.length < 8 && decodedResult?.result?.format?.formatName !== 'QR_CODE') return;

    scanThrottleRef.current = true;
    setLastScannedCode(decodedText);
    
    setTimeout(() => {
        scanThrottleRef.current = false;
        if (isMounted.current) setLastScannedCode(null);
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
                    <button onClick={stopScanner} className="flex items-center space-x-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-all active:scale-95">
                        <StopCircle size={14} />
                        <span>{t.stopScan}</span>
                    </button>
                ) : (
                    <button onClick={startScanning} disabled={!storeLocation || cameraLoading} className="flex items-center space-x-1 px-3 py-1.5 bg-lime-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-all active:scale-95 shadow-sm">
                        {cameraLoading ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={14} />}
                        <span>{t.startScan}</span>
                    </button>
                )}
            </div>
        </div>

        <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-[300px] flex items-center justify-center aspect-square md:aspect-video shadow-2xl border-2 border-slate-900 ring-1 ring-white/5">
            {cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 bg-slate-900/90 backdrop-blur-sm">
                    <RefreshCw className="w-10 h-10 animate-spin mb-3 text-lime-500" />
                    <p className="text-xs font-bold uppercase tracking-widest text-lime-100">Căutare cameră HD...</p>
                </div>
            )}
            
            <div id="reader" className="w-full h-full"></div>
            
            {isScanning && (
                 <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    {/* Precision Reticle */}
                    <div className="w-[90%] h-[35%] border-2 border-orange-500/80 rounded-lg relative shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] backdrop-brightness-125">
                        <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-orange-500 rounded-tl-lg"></div>
                        <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-orange-500 rounded-tr-lg"></div>
                        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-orange-500 rounded-bl-lg"></div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-orange-500 rounded-br-lg"></div>
                        
                        {/* Thin laser line */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-orange-400 shadow-[0_0_15px_rgba(251,146,60,1)] animate-[pulse_1s_infinite]"></div>
                        
                        {/* Horizontal guide lines */}
                        <div className="absolute top-[20%] left-0 right-0 border-t border-white/10"></div>
                        <div className="absolute top-[80%] left-0 right-0 border-t border-white/10"></div>
                    </div>

                    <div className="mt-8">
                        <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
                            <Focus size={14} className="text-lime-400 animate-pulse" />
                            <span className="text-white text-[10px] font-black uppercase tracking-widest">Aliniere kód</span>
                        </div>
                    </div>

                    {hasTorch && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleTorch(); }} 
                            className={`pointer-events-auto absolute bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl border-2 transition-all active:scale-90 ${
                                torchOn ? 'bg-orange-500 border-white text-white' : 'bg-black/50 border-white/20 text-white/70'
                            }`}
                        >
                            {torchOn ? <Zap size={20} fill="currentColor" /> : <ZapOff size={20} />}
                        </button>
                    )}
                    
                    {lastScannedCode && (
                        <div className="absolute top-12 px-6 py-2.5 bg-lime-500 text-white rounded-full text-sm font-black shadow-[0_10px_40px_rgba(34,197,94,0.5)] animate-bounce border-2 border-white">
                           {lastScannedCode}
                        </div>
                    )}
                 </div>
            )}

            {permissionError && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center bg-slate-900 z-30">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-sm font-bold mb-1">Eroare Scanare</p>
                    <p className="text-xs text-slate-400 mb-6 px-4">{permissionError}</p>
                    <button onClick={startScanning} className="px-8 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-xl active:scale-95 transition-transform">Reîncearcă</button>
                 </div>
            )}
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-3 font-medium uppercase tracking-tighter">Sfat: Țineți telefonul la 10-15 cm de vonalkód</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-black text-slate-700 text-[10px] uppercase tracking-widest">{t.scannedCodes} ({scannedItems.length})</h3>
            <button onClick={handleRefresh} disabled={dataLoading} className="p-1.5 text-slate-400 hover:text-orange-500 transition-colors">
                <RefreshCw size={14} className={dataLoading ? "animate-spin" : ""} />
            </button>
        </div>
        <ul className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto">
            {scannedItems.map((item) => (
                <li key={item.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                        <p className="font-mono text-base font-black text-slate-800 truncate tracking-tighter">{item.code}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{item.format} • {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                        <button onClick={() => {
                            navigator.clipboard.writeText(item.code);
                            if (navigator.vibrate) navigator.vibrate(20);
                        }} className="p-2.5 text-slate-400 hover:text-orange-500 active:scale-90 transition-transform"><Copy size={18} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2.5 text-slate-400 hover:text-red-500 active:scale-90 transition-transform"><Trash2 size={18} /></button>
                    </div>
                </li>
            ))}
            {scannedItems.length === 0 && (
                <li className="p-10 text-center text-slate-300 text-xs italic font-medium">Încă nu s-a scanat niciun produs</li>
            )}
        </ul>
      </div>
    </div>
  );
};

export default Scanner;