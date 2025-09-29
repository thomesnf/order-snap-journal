import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'sv';

interface Translations {
  en: Record<string, string>;
  sv: Record<string, string>;
}

const translations: Translations = {
  en: {
    // Navigation
    'orders': 'Orders',
    'newOrder': 'New Order',
    'back': 'Back',
    
    // Order status
    'pending': 'Pending',
    'inProgress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    
    // Priority
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    
    // Order form
    'createNewOrder': 'Create New Order',
    'orderTitle': 'Order Title',
    'description': 'Description',
    'priority': 'Priority',
    'status': 'Status',
    'customer': 'Customer',
    'customerRef': 'Customer Reference Number',
    'location': 'Location',
    'dueDate': 'Due Date',
    'createOrder': 'Create Order',
    'creatingOrder': 'Creating Order...',
    
    // Order details
    'orderInformation': 'Order Information',
    'journalEntries': 'Journal Entries',
    'photos': 'Photos',
    'addNote': 'Add Note',
    'addEntry': 'Add Entry',
    'takePhoto': 'Take Photo',
    'photoCaption': 'Photo Caption (Optional)',
    'startWork': 'Start Work',
    'complete': 'Complete',
    
    // Search and filter
    'searchOrders': 'Search orders...',
    'all': 'All',
    'noOrdersFound': 'No orders found',
    'tryAdjusting': 'Try adjusting your search or filters',
    'getStarted': 'Get started by creating your first order',
    'createFirstOrder': 'Create First Order',
    
    // Export
    'exportOptions': 'Export Options',
    'exportSingle': 'Export This Entry',
    'exportSelected': 'Export Selected',
    'exportAll': 'Export All Entries',
    'selectEntries': 'Select Entries',
    'exportToPdf': 'Export to PDF',
    
    // Messages
    'journalEntryAdded': 'Journal entry added',
    'photoAdded': 'Photo added',
    'orderCreated': 'Order Created',
    'validationError': 'Validation Error',
    'fillRequired': 'Please fill in all required fields.',
    'cameraError': 'Camera error',
    'unableToAccessCamera': 'Unable to access camera. Please try again.',
    
    // Settings
    'settings': 'Settings',
    'theme': 'Theme',
    'language': 'Language',
    'lightMode': 'Light Mode',
    'darkMode': 'Dark Mode',
    'english': 'English',
    'swedish': 'Swedish'
  },
  sv: {
    // Navigation
    'orders': 'Beställningar',
    'newOrder': 'Ny Beställning',
    'back': 'Tillbaka',
    
    // Order status
    'pending': 'Väntande',
    'inProgress': 'Pågående',
    'completed': 'Slutförd',
    'cancelled': 'Avbruten',
    
    // Priority
    'low': 'Låg',
    'medium': 'Medium',
    'high': 'Hög',
    
    // Order form
    'createNewOrder': 'Skapa Ny Beställning',
    'orderTitle': 'Beställningstitel',
    'description': 'Beskrivning',
    'priority': 'Prioritet',
    'status': 'Status',
    'customer': 'Kund',
    'customerRef': 'Kundreferensnummer',
    'location': 'Plats',
    'dueDate': 'Förfallodatum',
    'createOrder': 'Skapa Beställning',
    'creatingOrder': 'Skapar Beställning...',
    
    // Order details
    'orderInformation': 'Beställningsinformation',
    'journalEntries': 'Journalanteckningar',
    'photos': 'Foton',
    'addNote': 'Lägg till Anteckning',
    'addEntry': 'Lägg till Post',
    'takePhoto': 'Ta Foto',
    'photoCaption': 'Fotobeskrivning (Valfritt)',
    'startWork': 'Börja Arbeta',
    'complete': 'Slutför',
    
    // Search and filter
    'searchOrders': 'Sök beställningar...',
    'all': 'Alla',
    'noOrdersFound': 'Inga beställningar hittades',
    'tryAdjusting': 'Försök justera din sökning eller filter',
    'getStarted': 'Kom igång genom att skapa din första beställning',
    'createFirstOrder': 'Skapa Första Beställningen',
    
    // Export
    'exportOptions': 'Exportalternativ',
    'exportSingle': 'Exportera Denna Post',
    'exportSelected': 'Exportera Valda',
    'exportAll': 'Exportera Alla Poster',
    'selectEntries': 'Välj Poster',
    'exportToPdf': 'Exportera till PDF',
    
    // Messages
    'journalEntryAdded': 'Journalpost tillagd',
    'photoAdded': 'Foto tillagt',
    'orderCreated': 'Beställning Skapad',
    'validationError': 'Valideringsfel',
    'fillRequired': 'Vänligen fyll i alla obligatoriska fält.',
    'cameraError': 'Kamerafel',
    'unableToAccessCamera': 'Kan inte komma åt kameran. Försök igen.',
    
    // Settings
    'settings': 'Inställningar',
    'theme': 'Tema',
    'language': 'Språk',
    'lightMode': 'Ljust Läge',
    'darkMode': 'Mörkt Läge',
    'english': 'Engelska',
    'swedish': 'Svenska'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'sv')) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};