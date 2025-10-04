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
    'invoiced': 'Invoiced',
    'paid': 'Paid',
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
    'summary': 'Summary',
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
    'swedish': 'Swedish',
    'authentication': 'Authentication',
    'signIn': 'Sign In',
    'signUp': 'Sign Up',
    'signOut': 'Sign Out',
    'email': 'Email',
    'password': 'Password',
    'fullName': 'Full Name',
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Success',
    'accountCreated': 'Account created successfully!',
    'signInOrCreateAccount': 'Sign in or create a new account',
    'userManagement': 'User Management',
    'manageUserRoles': 'Manage user roles and permissions',
    'makeAdmin': 'Make Admin',
    'removeAdmin': 'Remove Admin',
    'admin': 'Admin',
    'deleteUser': 'Delete User',
    'confirmDelete': 'Are you sure you want to delete this user?',
    'userDeleted': 'User deleted successfully',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'edit': 'Edit',
    'save': 'Save',
    'editOrder': 'Edit Order',
    'orderUpdated': 'Order updated successfully',
    'orderBasis': 'Order Basis',
    'uploadFiles': 'Upload Files',
    'noFilesUploaded': 'No files uploaded yet',
    'uploadedFiles': 'Uploaded Files',
    'download': 'Download',
    'timeTracking': 'Time Tracking',
    'totalHours': 'Total Hours',
    'editEntry': 'Edit Entry',
    'deleteEntry': 'Delete Entry',
    'updateEntry': 'Update Entry',
    'entryUpdated': 'Entry updated successfully',
    'entryDeleted': 'Entry deleted successfully',
    'exportPDF': 'Export PDF',
    'exportAllEntries': 'Export All Entries',
    'addUser': 'Add User',
    'addNewUser': 'Add New User',
    'createUser': 'Create User',
    'enterCredentials': '',
    'manageAssignments': 'Manage Assignments',
    'deleteOrder': 'Delete Order',
    'deleteOrderConfirm': 'Are you sure you want to delete',
    'cannotBeUndone': 'This action cannot be undone.',
    'orderDetails': 'Order Details',
    'additionalInformation': 'Additional Information',
    'orderCreatedSuccess': 'Your new order has been created successfully.',
    'failedToCreateOrder': 'Failed to create order. Please try again.',
    'failedToUpdateOrder': 'Failed to update order. Please try again.',
    'setPending': 'Set to Pending',
    'setInProgress': 'Set to In Progress',
    'setCompleted': 'Set to Completed',
    'setInvoiced': 'Set to Invoiced',
    'setPaid': 'Set to Paid',
    'setCancelled': 'Set to Cancelled',
    'updated': 'Updated',
    'due': 'Due',
    'ref': 'Ref'
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
    'invoiced': 'Fakturerad',
    'paid': 'Betald',
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
    'summary': 'Sammanfattning',
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
    'swedish': 'Svenska',
    'authentication': 'Autentisering',
    'signIn': 'Logga in',
    'signUp': 'Registrera',
    'signOut': 'Logga ut',
    'email': 'E-post',
    'password': 'Lösenord',
    'fullName': 'Fullständigt namn',
    'loading': 'Laddar...',
    'error': 'Fel',
    'success': 'Framgång',
    'accountCreated': 'Konto skapat framgångsrikt!',
    'signInOrCreateAccount': 'Logga in eller skapa ett nytt konto',
    'userManagement': 'Användarhantering',
    'manageUserRoles': 'Hantera användarroller och behörigheter',
    'makeAdmin': 'Gör till Admin',
    'removeAdmin': 'Ta bort Admin',
    'admin': 'Admin',
    'deleteUser': 'Ta bort Användare',
    'confirmDelete': 'Är du säker på att du vill ta bort denna användare?',
    'userDeleted': 'Användare borttagen',
    'cancel': 'Avbryt',
    'delete': 'Ta bort',
    'edit': 'Redigera',
    'save': 'Spara',
    'editOrder': 'Redigera Beställning',
    'orderUpdated': 'Beställning uppdaterad',
    'orderBasis': 'Beställningsunderlag',
    'uploadFiles': 'Ladda upp Filer',
    'noFilesUploaded': 'Inga filer uppladdade ännu',
    'uploadedFiles': 'Uppladdade Filer',
    'download': 'Ladda ner',
    'timeTracking': 'Tidsregistrering',
    'totalHours': 'Totalt Antal Timmar',
    'editEntry': 'Redigera Inlägg',
    'deleteEntry': 'Ta bort Inlägg',
    'updateEntry': 'Uppdatera Inlägg',
    'entryUpdated': 'Inlägg uppdaterat',
    'entryDeleted': 'Inlägg borttaget',
    'exportPDF': 'Exportera PDF',
    'exportAllEntries': 'Exportera alla inlägg',
    'addUser': 'Lägg till Användare',
    'addNewUser': 'Lägg till Ny Användare',
    'createUser': 'Skapa Användare',
    'enterCredentials': '',
    'manageAssignments': 'Hantera Uppdrag',
    'deleteOrder': 'Ta bort Beställning',
    'deleteOrderConfirm': 'Är du säker på att du vill ta bort',
    'cannotBeUndone': 'Denna åtgärd kan inte ångras.',
    'orderDetails': 'Beställningsdetaljer',
    'additionalInformation': 'Ytterligare Information',
    'orderCreatedSuccess': 'Din nya beställning har skapats framgångsrikt.',
    'failedToCreateOrder': 'Misslyckades med att skapa beställning. Försök igen.',
    'failedToUpdateOrder': 'Misslyckades med att uppdatera beställning. Försök igen.',
    'setPending': 'Sätt till Väntande',
    'setInProgress': 'Sätt till Pågående',
    'setCompleted': 'Sätt till Slutförd',
    'setInvoiced': 'Sätt till Fakturerad',
    'setPaid': 'Sätt till Betald',
    'setCancelled': 'Sätt till Avbruten',
    'updated': 'Uppdaterad',
    'due': 'Förfaller',
    'ref': 'Ref'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('sv');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'sv')) {
      setLanguage(savedLanguage);
    } else {
      // Set Swedish as default
      localStorage.setItem('language', 'sv');
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