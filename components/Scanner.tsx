import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Copy, StopCircle, PlayCircle, ScanLine, AlertCircle, RefreshCw, Hand, Trash2 } from 'lucide-react';
import { Language, Translation, ScannedItem } from '../types';
import { supabase } from '../services/supabase';

interface ScannerProps {
  t: Translation;
  lang: Language;
}

const Scanner: React.FC<ScannerProps> = ({ t, lang }) => {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  
  // Ref to hold the scanner instance
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMounted = useRef(true);
  const captureRequested = useRef(false);

  // Sound effect for successful scan
  const beepSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    isMounted.current = true;
    
    // Create audio context or simple audio element
    beepSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    beepSound.current.volume = 0.5;

    fetchScannedItems();
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      stopScanner();
    };
  }, []);

  const fetchScannedItems = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const storeLocation = user?.user_metadata?.store_location;

      if (storeLocation) {
          const { data, error } = await supabase
            .from('scanned_items')
            .select('*')
            .eq('store_location', storeLocation)
            .order('created_at', { ascending: false });
          
          if (data && !error) {
              setScannedItems(data);
          }
      }
  };

  const stopScanner = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
          try {
              await scannerRef.current.stop();
              await scannerRef.current.clear();
          } catch (e) {
              // ignore
          }
      }
      setIsScanning(false);
  };

  const startScanning = async () => {
    setPermissionError(false);
    setCameraLoading(true);

    // If instance exists but not running, try to use it, otherwise create new
    if (!scannerRef.current) {
         scannerRef.current = new Html5Qrcode("reader");
    }

    const config = { 
        fps: 15, // Higher FPS for smoother tracking
        qrbox: { width: 280, height: 180 }, // Rectangular box fits barcodes better
        aspectRatio: 1.0,
        // CRITICAL: Use Native Barcode Detection if available (Chrome Android/Desktop) for perfect performance
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
        }
    };

    // Limit formats to common retail codes to improve accuracy and speed
    const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
    ];

    try {
        await scannerRef.current.start(
            { facingMode: "environment" }, 
            config,
            (decodedText, decodedResult) => {
                // Check if user requested a capture by clicking/tapping
                if (captureRequested.current && isMounted.current) {
                    onScanSuccess(decodedText, decodedResult);
                    captureRequested.current = false; 
                }
            },
            (errorMessage) => {
                // Ignore frame errors
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

  const triggerCapture = () => {
      if (isScanning && !cameraLoading && !permissionError) {
          captureRequested.current = true;
          // Haptic feedback
          if (navigator.vibrate) navigator.vibrate(50);
      }
  }

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    // Play beep
    if (beepSound.current) {
        beepSound.current.currentTime = 0;
        beepSound.current.play().catch(e => console.log('Audio play failed', e));
    }
    
    // Vibrate
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

    // Save to DB
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newItemPayload = {
        code: decodedText,
        format: decodedResult?.result?.format?.formatName || 'BARCODE',
        store_location: user.user_metadata?.store_location || 'Cherechiu',
        user_id: user.id
    };

    // Optimistic UI update
    const tempId = Math.random().toString();
    const tempItem: ScannedItem = {
        id: tempId,
        code: decodedText,
        format: newItemPayload.format,
        created_at: new Date().toISOString(),
        store_location: newItemPayload.store_location
    };
    
    setScannedItems(prev => [tempItem, ...prev]);

    // DB Insert
    const { data, error } = await supabase
        .from('scanned_items')
        .insert([newItemPayload])
        .select()
        .single();

    if (error) {
        console.error("Save error", error);
        // Revert on error
        setScannedItems(prev => prev.filter(i => i.id !== tempId));
    } else if (data) {
        // Replace temp with real data
        setScannedItems(prev => prev.map(i => i.id === tempId ? data : i));
    }
  };

  const handleDelete = async (id: string) => {
      // Optimistic delete
      setScannedItems(prev => prev.filter(i => i.id !== id));
      
      const { error } = await supabase.from('scanned_items').delete().eq('id', id);
      if (error) {
          console.error("Delete error", error);
          fetchScannedItems(); // Revert by refetching
      }
  };

  const handleClearAll = async () => {
      if (!confirm(t.confirmDelete)) return;
      
      // Optimistic
      setScannedItems([]);

      const { data: { user } } = await supabase.auth.getUser();
      const storeLocation = user?.user_metadata?.store_location;
      
      if (storeLocation) {
          const { error } = await supabase
            .from('scanned_items')
            .delete()
            .eq('store_location', storeLocation);
            
          if (error) fetchScannedItems();
      }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    if (navigator.vibrate) navigator.vibrate(20);
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
                        onClick={stopScanner}
                        className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                        <StopCircle size={16} />
                        <span className="hidden sm:inline">{t.stopScan}</span>
                    </button>
                ) : (
                    <button 
                        onClick={startScanning}
                        className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
                    >
                        <PlayCircle size={16} />
                        <span className="hidden sm:inline">{t.startScan}</span>
                    </button>
                )}
            </div>
        </div>

        {/* Camera Container */}
        <div 
            onClick={triggerCapture}
            className="relative bg-black rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center aspect-square md:aspect-video max-h-[60vh] cursor-pointer group active:scale-[0.98] transition-transform select-none"
        >
            
            {/* Loading State */}
            {cameraLoading && !permissionError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 pointer-events-none">
                    <RefreshCw className="w-8 h-8 animate-spin mb-2 text-lime-500" />
                    <p className="text-sm">Starting Camera...</p>
                </div>
            )}

            {/* Tap Instruction Overlay */}
            {isScanning && !cameraLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/40 p-4 rounded-full backdrop-blur-sm border-2 border-white/30 animate-pulse">
                         <Hand className="w-12 h-12 text-white/90" />
                    </div>
                    <p className="mt-4 text-white font-bold text-lg shadow-black drop-shadow-md bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md">
                        {t.tapToScan}
                    </p>
                </div>
            )}

            {/* Error State */}
            {permissionError && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/90 p-6 text-center z-20 cursor-default">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="mb-2 font-bold">{t.cameraError}</p>
                    <p className="text-xs text-slate-400 mb-4 max-w-xs">
                        Check browser permissions.
                    </p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); startScanning(); }} 
                        className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Retry
                    </button>
                 </div>
            )}
            
            {/* Video Element */}
            <div id="reader" className="w-full h-full object-cover"></div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">{t.tapToScan}</p>
      </div>

      {/* Results List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-700 text-sm">{t.scannedCodes} ({scannedItems.length})</h3>
            {scannedItems.length > 0 && (
                <button onClick={handleClearAll} className="text-xs text-red-500 hover:text-red-700 font-medium uppercase">
                    {t.delete}
                </button>
            )}
        </div>
        <ul className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {scannedItems.map((item) => (
                <li key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50 animate-in slide-in-from-left-2">
                    <div className="overflow-hidden">
                        <p className="font-mono text-lg font-bold text-slate-800 break-all">{item.code}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {item.format} • {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={() => copyToClipboard(item.code)}
                            className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                            title={t.copy}
                        >
                            <Copy size={16} />
                        </button>
                        <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title={t.delete}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
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