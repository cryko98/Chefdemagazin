import { Language, Translation } from './types';

export const DAYS_RO = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
export const DAYS_HU = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];

export const METHODS_RO = ["Email", "Telefon", "Online", "Agent"];
export const METHODS_HU = ["Email", "Telefon", "Online", "Ügynök"];

export const STORE_LOCATIONS = ['Cherechiu', 'Adoni', 'Valea lui Mihai'];

export const TRANSLATIONS: Record<Language, Translation> = {
  RO: {
    dashboard: "Panou de Control",
    inventory: "Produse",
    suppliers: "Furnizori",
    orders: "Comenzi",
    wishlist: "Listă Dorințe",
    advisor: "Asistent AI",
    scanner: "Scanare",
    
    totalSuppliers: "Total Furnizori",
    productsListed: "Produse Listate",
    activeOrders: "Articole de Comandat",
    wishlistItems: "Produse Dorite",
    welcome: "Bine ai venit",

    add: "Adaugă",
    save: "Salvează",
    delete: "Șterge",
    cancel: "Anulează",
    edit: "Editează",
    addToOrder: "Adaugă la Comandă",
    generateOrder: "Generează Email Comandă",

    name: "Nume",
    contact: "Contact (Email/Tel)",
    method: "Metodă",
    customMethod: "Scrie metoda...",
    orderDay: "Zi Comandă",
    deliveryDay: "Zi Livrare",
    category: "Categorie",
    stock: "Stoc",
    price: "Preț (RON)",
    quantity: "Cantitate",
    unit: "UM",
    supplier: "Furnizor",
    notes: "Notițe",

    units: {
        pcs: "Buc",
        kg: "Kg",
        box: "Bax"
    },

    addProduct: "Adaugă Produs Nou",
    addSupplier: "Adaugă Furnizor Nou",
    addWishlist: "Adaugă în Lista de Dorințe",
    orderList: "Listă de Cumpărături",
    selectSupplier: "Selectează un furnizor pentru a vedea lista",

    askAi: "Întreabă Asistentul",
    aiPlaceholder: "Ex: Cum pot crește vânzările?",
    loading: "Se procesează...",
    emailPreview: "Previzualizare Email",
    send: "Trimite",
    close: "Închide",

    startScan: "Start Cameră",
    stopScan: "Oprește Cameră",
    scannedCodes: "Coduri Scanate",
    copy: "Copiază",
    cameraError: "Eroare la accesarea camerei. Verifică permisiunile.",
    tapToScan: "Apasă pe video pentru a scana",

    role: "Rol",
    language: "Limbă / Nyelv",
    noData: "Nu există date. Adaugă ceva!",
    confirmDelete: "Ești sigur?",
    other: "Altă metodă (Scrie manual)",

    selectStore: "Selectează Magazinul",
    selectRole: "Selectează Rolul",
    roles: {
        manager: "Șef de Magazin",
        cashier: "Casier"
    }
  },
  HU: {
    dashboard: "Vezérlőpult",
    inventory: "Termékek",
    suppliers: "Beszállítók",
    orders: "Rendelések",
    wishlist: "Kívánságlista",
    advisor: "AI Asszisztens",
    scanner: "Vonalkód",
    
    totalSuppliers: "Összes Beszállító",
    productsListed: "Listázott Termékek",
    activeOrders: "Rendelendő Tételek",
    wishlistItems: "Kívánt Termékek",
    welcome: "Üdvözöljük",

    add: "Hozzáadás",
    save: "Mentés",
    delete: "Törlés",
    cancel: "Mégse",
    edit: "Szerkesztés",
    addToOrder: "Hozzáadás a Rendeléshez",
    generateOrder: "Rendelési Email Generálása",

    name: "Név",
    contact: "Kapcsolat (Email/Tel)",
    method: "Mód",
    customMethod: "Írja be a módot...",
    orderDay: "Rendelés Napja",
    deliveryDay: "Szállítás Napja",
    category: "Kategória",
    stock: "Készlet",
    price: "Ár (RON)",
    quantity: "Mennyiség",
    unit: "Egység",
    supplier: "Beszállító",
    notes: "Megjegyzés",

    units: {
        pcs: "Db",
        kg: "Kg",
        box: "Bax"
    },

    addProduct: "Új Termék Hozzáadása",
    addSupplier: "Új Beszállító Hozzáadása",
    addWishlist: "Hozzáadás a Kívánságlistához",
    orderList: "Bevásárlólista",
    selectSupplier: "Válasszon beszállítót a lista megtekintéséhez",

    askAi: "Kérdezze az Asszisztenst",
    aiPlaceholder: "Pl: Hogyan növelhetem az eladásokat?",
    loading: "Feldolgozás...",
    emailPreview: "Email Előnézet",
    send: "Küldés",
    close: "Bezárás",

    startScan: "Kamera Indítása",
    stopScan: "Kamera Leállítása",
    scannedCodes: "Beolvasott Kódok",
    copy: "Másolás",
    cameraError: "Hiba a kamera elérésekor. Ellenőrizze a jogosultságokat.",
    tapToScan: "Koppintson a képre a beolvasáshoz",

    role: "Szerepkör",
    language: "Limbă / Nyelv",
    noData: "Nincs adat. Adjon hozzá valamit!",
    confirmDelete: "Biztos benne?",
    other: "Egyéb mód (Kézi megadás)",

    selectStore: "Válasszon Üzletet",
    selectRole: "Válasszon Szerepkört",
    roles: {
        manager: "Üzletvezető",
        cashier: "Pénztáros (Casier)"
    }
  }
};