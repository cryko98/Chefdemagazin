import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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
  
  const [isCapturePending, setIsCapturePending] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMounted = useRef(true);
  const captureTriggeredRef = useRef(false);
  const beepSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    isMounted.current = true;
    beepSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    beepSound.current.volume = 0.5;

    if (storeLocation) {
        fetchScannedItems();
    }

    // Subscribe specifically to scanned_items for this store
    const channel = supabase.channel('scanned-items-sync')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'scanned_items' },
            (payload) => {
                if(storeLocation) fetchScannedItems();
            }
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
        
        if (data && !error && isMounted.current) {
            setScannedItems(data);
        }
      } catch (err) {
          console.error("Error fetching items:", err);
      }
  };

  const handleRefresh = async () => {
      setDataLoading(true);
      await fetchScannedItems();
      setDataLoading(false);
  }

  const stopScanner = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
          try {
              await scannerRef.current.stop();
          } catch (e) {
              console.warn("Stop scanner error", e);
          }
      }
      setIsScanning(false);
      setIsCapturePending(false);
      captureTriggeredRef.current = false;
  };

  const startScanning = async () => {
    setPermissionError(false);
    setCameraLoading(true);

    // Always clear existing instance if any
    if (scannerRef.current) {
        try { await scannerRef.current.clear(); } catch(e) {}
    }
    scannerRef.current = new Html5Qrcode("reader");

    const config = { 
        fps: 15,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0,
        videoConstraints: {
            facingMode: "environment",
            focusMode: "continuous",
        }
    };

    try {
        await scannerRef.current.start(
            { facingMode: "environment" }, 
            config,
            (decodedText, decodedResult) => {
                if (isMounted.current && captureTriggeredRef.current) {
                     onScanSuccess(decodedText, decodedResult);
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
      if (!isScanning || cameraLoading || permissionError) return;
      
      captureTriggeredRef.current = true;
      setIsCapturePending(true);
      
      if (navigator.vibrate) navigator.vibrate(10);
      
      // Safety timeout
      setTimeout(() => {
          if (isMounted.current && captureTriggeredRef.current) {
              captureTriggeredRef.current = false;
              setIsCapturePending(false);
          }
      }, 3000);
  }

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    captureTriggeredRef.current = false;
    setIsCapturePending(false);

    if (beepSound.current) {
        beepSound.current.currentTime = 0;
        beepSound.current.play().catch(e => console.log('Audio play failed', e));
    }
    if (navigator.vibrate) navigator.vibrate([50]);

    // CRITICAL FIX: Ensure storeLocation is valid
    if (!storeLocation) {
        alert("Error: Store location not identified. Please re-login.");
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    // Fallback if user is missing (rare)
    if (!user) {
        alert("Authentication error. Please re-login.");
        return;
    }

    const newItemPayload = {
        code: decodedText,
        format: decodedResult?.result?.format?.formatName || 'BARCODE',
        store_location: storeLocation, 
        user_id: user.id
    };

    // Optimistic UI
    const tempId = Math.random().toString();
    const tempItem: ScannedItem = {
        id: tempId,
        code: decodedText,
        format: newItemPayload.format,
        created_at: new Date().toISOString(),
        store_location: newItemPayload.store_location
    };
    
    setScannedItems(prev => [tempItem, ...prev]);

    // Database Insert
    const { data, error } = await supabase
        .from('scanned_items')
        .insert([newItemPayload])
        .select()
        .single();

    if (error) {
        console.error("Save error details:", error);
        setScannedItems(prev => prev.filter(i => i.id !== tempId));
        
        if (error.code === '42501') {
            alert(`Permission denied. The store location '${storeLocation}' might not match your account.`);
        } else {
            alert(`Failed to save: ${error.message}`);
        }
    } else if (data) {
        // Update optimistic item with real data
        setScannedItems(prev => prev.map(i => i.id === tempId ? data : i));
    }
  };

  const handleDelete = async (id: string) => {
      const prevList = [...scannedItems];
      setScannedItems(prev => prev.filter(i => i.id !== id));
      
      const { error } = await supabase.from('scanned_items').delete().eq('id', id);
      if (error) {
          console.error("Delete error", error);
          setScannedItems(prevList);
          alert("Could not delete item.");
      }
  };

  const handleClearAll = async () => {
      if (!confirm(t.confirmDelete)) return;
      if (!storeLocation) return;

      const prevList = [...scannedItems];
      setScannedItems([]);
      
      const { error } = await supabase
        .from('scanned_items')
        .delete()
        .eq('store_location', storeLocation);
        
      if (error) {
          setScannedItems(prevList);
          alert("Could not clear list.");
      }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    if (navigator.vibrate) navigator.vibrate(20);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <div>
                 <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                    <ScanLine className="text-orange-500" />
                    <span>{t.scanner}</span>
                </h2>
                {storeLocation ? (
                    <div className="flex items-center text-xs text-lime-700 mt-1 bg-lime-50 px-2 py-1 rounded-md w-fit border border-lime-200">
                        <CheckCircle2 size={12} className="mr-1" />
                        <span>Saving to: <strong>{storeLocation}</strong></span>
                    </div>
                ) : (
                    <div className="flex items-center text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded-md w-fit border border-red-200">
                        <AlertCircle size={12} className="mr-1" />
                        <span>Store location missing!</span>
                    </div>
                )}
            </div>
            <div className="flex space-x-2 w-full md:w-auto">
                {isScanning ? (
                    <button 
                        onClick={stopScanner}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                        <StopCircle size={16} />
                        <span>{t.stopScan}</span>
                    </button>
                ) : (
                    <button 
                        onClick={startScanning}
                        disabled={!storeLocation}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2 text-sm bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PlayCircle size={16} />
                        <span>{t.startScan}</span>
                    </button>
                )}
            </div>
        </div>

        {/* Camera Container */}
        <div className="relative bg-black rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center aspect-square md:aspect-video max-h-[60vh] select-none shadow-inner border border-slate-800">
            
            {cameraLoading && !permissionError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 pointer-events-none bg-black/50">
                    <RefreshCw className="w-8 h-8 animate-spin mb-2 text-lime-500" />
                    <p className="text-sm">Starting Camera...</p>
                </div>
            )}

            {permissionError && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900 p-6 text-center z-20 cursor-default">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="mb-2 font-bold">{t.cameraError}</p>
                    <button onClick={startScanning} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors">Retry</button>
                 </div>
            )}
            
            <div id="reader" className="w-full h-full object-cover"></div>
            
            {/* Capture Button */}
            {isScanning && !cameraLoading && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none">
                     <button
                        onClick={triggerCapture}
                        disabled={isCapturePending}
                        className={`pointer-events-auto w-16 h-16 rounded-full border-4 flex items-center justify-center shadow-lg transition-all transform active:scale-95 ${
                            isCapturePending 
                                ? 'bg-orange-600 border-orange-300 animate-pulse' 
                                : 'bg-white/20 backdrop-blur-sm border-white hover:bg-white/40'
                        }`}
                     >
                        {isCapturePending ? (
                            <RefreshCw className="text-white w-8 h-8 animate-spin" />
                        ) : (
                            <div className="w-12 h-12 bg-white rounded-full"></div>
                        )}
                     </button>
                </div>
            )}
            
             {/* Reticle */}
            {isScanning && !cameraLoading && (
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-48 border-2 border-orange-500/50 rounded-lg relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                        <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-orange-500 -ml-1 -mt-1"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-orange-500 -mr-1 -mt-1"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-orange-500 -ml-1 -mb-1"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-orange-500 -mr-1 -mb-1"></div>
                    </div>
                    <div className="absolute bottom-24 text-white text-sm font-medium bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm shadow-sm">
                        Tap button to capture
                    </div>
                 </div>
            )}

        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-700 text-sm">{t.scannedCodes} ({scannedItems.length})</h3>
                <button 
                    onClick={handleRefresh}
                    disabled={dataLoading}
                    className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <RefreshCw size={14} className={dataLoading ? "animate-spin" : ""} />
                </button>
            </div>
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
                        >
                            <Copy size={16} />
                        </button>
                        <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
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