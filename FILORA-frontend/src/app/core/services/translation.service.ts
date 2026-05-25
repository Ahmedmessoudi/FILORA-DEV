import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly http = inject(HttpClient);
  
  // Current active language signal
  readonly currentLang = signal<'fr' | 'en'>('fr');
  
  // Loaded dictionary signal
  private readonly dictionary = signal<Record<string, string>>({});

  // Static fallback translations to guarantee UI renders even if HTTP request is slow/fails
  private readonly fallbackFr: Record<string, string> = {
    'nav.tools': 'Outils',
    'nav.users': 'Utilisateurs',
    'nav.entities': 'Entités',
    'nav.doctypes': 'Types de documents',
    'nav.partners': 'Tiers (Partenaires)',
    'nav.partnertypes': 'Types de tiers',
    'nav.groups': 'Groupes',
    'nav.settings': 'Paramètres Système',
    'nav.logout': 'Déconnexion',
    
    'sidebar.temp_docs': 'Documents Temporaires',
    'sidebar.companies': 'Entités & Dossiers',
    'sidebar.no_companies': 'Aucune entité disponible.',
    'sidebar.add_companies': 'Ajoutez des entités dans Outils.',
    'sidebar.loading': 'Chargement du workspace...',
    'sidebar.no_folders': 'Aucun dossier',
    
    'auth.login': 'Connexion',
    'auth.username': 'Nom d\'utilisateur ou Email',
    'auth.password': 'Mot de passe',
    'auth.forgot_password': 'Mot de passe oublié ?',
    'auth.reset_password': 'Réinitialiser le mot de passe',
    'auth.otp_title': 'Authentification à 2 facteurs',
    'auth.otp_desc': 'Entrez le code OTP à 6 chiffres envoyé à votre adresse e-mail.',
    'auth.otp_code': 'Code de vérification',
    'auth.verify': 'Vérifier',
    'auth.send_reset': 'Envoyer le lien de réinitialisation',
    'auth.back_to_login': 'Retour à la connexion',
    
    'dms.temp_title': 'Pool des Documents Temporaires',
    'dms.upload_btn': 'Téléverser des fichiers',
    'dms.promote_btn': 'Promouvoir',
    'dms.delete_btn': 'Supprimer',
    'dms.bulk_delete': 'Suppression groupée',
    'dms.search_placeholder': 'Rechercher des documents...',
    'dms.loading': 'Chargement des documents...',
    'dms.empty': 'Aucun document trouvé.',
    'dms.file_name': 'Nom du fichier',
    'dms.upload_date': 'Date de téléversement',
    'dms.actions': 'Actions',
    
    'dms.promote_title': 'Promouvoir le document',
    'dms.select_company': 'Sélectionner l\'entité',
    'dms.select_doctype': 'Sélectionner le type de document',
    'dms.cancel': 'Annuler',
    'dms.confirm': 'Confirmer',
    
    'dms.ocr_title': 'Vérification OCR',
    'dms.ocr_meta': 'Données Extraites',
    'dms.invoice_num': 'Numéro de facture',
    'dms.invoice_date': 'Date de facture',
    'dms.amount_ht': 'Montant HT',
    'dms.amount_tva': 'Montant TVA',
    'dms.amount_ttc': 'Montant TTC',
    'dms.vendor': 'Fournisseur / Tiers',
    'dms.line_items': 'Lignes d\'articles',
    'dms.description': 'Description',
    'dms.quantity': 'Quantité',
    'dms.unit_price': 'Prix unitaire',
    'dms.total': 'Total',
    'dms.reprocess_ocr': 'Retraiter OCR',
    'dms.save_changes': 'Enregistrer les modifications',
    
    'dms.share_title': 'Partager le document par e-mail',
    'dms.share_to': 'Destinataire (Email)',
    'dms.share_subject': 'Sujet',
    'dms.share_body': 'Message',
    'dms.attach_original': 'Joindre le fichier original',
    'dms.attach_ocr': 'Joindre le PDF avec annotations OCR',
    'dms.attach_json': 'Joindre les métadonnées au format JSON',
    'dms.send': 'Envoyer',
    
    'tools.users_title': 'Gestion des Utilisateurs',
    'tools.create_user': 'Créer un utilisateur',
    'tools.edit_user': 'Modifier l\'utilisateur',
    'tools.entities_title': 'Gestion des Entités',
    'tools.create_entity': 'Créer une entité',
    'tools.doctypes_title': 'Gestion des Types de Documents',
    'tools.create_doctype': 'Créer un type de document',
    'tools.partners_title': 'Gestion des Partenaires',
    'tools.create_partner': 'Créer un partenaire',
    'tools.groups_title': 'Gestion des Groupes',
    'tools.create_group': 'Créer un groupe de documents',
    
    'settings.title': 'Paramètres Système (Configuration)',
    'settings.general': 'Général',
    'settings.smtp': 'Configuration SMTP (Emails)',
    'settings.ocr': 'Configuration OCR / Tesseract',
    'settings.limits': 'Seuils & Limites',
    'settings.save': 'Enregistrer la configuration'
  };

  private readonly fallbackEn: Record<string, string> = {
    'nav.tools': 'Tools',
    'nav.users': 'Users',
    'nav.entities': 'Entities',
    'nav.doctypes': 'Document Types',
    'nav.partners': 'Partners',
    'nav.partnertypes': 'Partner Types',
    'nav.groups': 'Groups',
    'nav.settings': 'System Settings',
    'nav.logout': 'Logout',
    
    'sidebar.temp_docs': 'Temp Documents Pool',
    'sidebar.companies': 'Entities & Folders',
    'sidebar.no_companies': 'No entities available.',
    'sidebar.add_companies': 'Add entities via Tools dashboard.',
    'sidebar.loading': 'Loading workspace...',
    'sidebar.no_folders': 'No folders assigned',
    
    'auth.login': 'Sign In',
    'auth.username': 'Username or Email',
    'auth.password': 'Password',
    'auth.forgot_password': 'Forgot Password?',
    'auth.reset_password': 'Reset Password',
    'auth.otp_title': '2-Factor Authentication',
    'auth.otp_desc': 'Enter the 6-digit OTP sent to your email.',
    'auth.otp_code': 'Verification Code',
    'auth.verify': 'Verify',
    'auth.send_reset': 'Send Reset Link',
    'auth.back_to_login': 'Back to Login',
    
    'dms.temp_title': 'Temporary Documents Pool',
    'dms.upload_btn': 'Upload Files',
    'dms.promote_btn': 'Promote',
    'dms.delete_btn': 'Delete',
    'dms.bulk_delete': 'Bulk Delete',
    'dms.search_placeholder': 'Search documents...',
    'dms.loading': 'Loading documents...',
    'dms.empty': 'No documents found.',
    'dms.file_name': 'File Name',
    'dms.upload_date': 'Upload Date',
    'dms.actions': 'Actions',
    
    'dms.promote_title': 'Promote Document',
    'dms.select_company': 'Select Entity',
    'dms.select_doctype': 'Select Document Type',
    'dms.cancel': 'Cancel',
    'dms.confirm': 'Confirm',
    
    'dms.ocr_title': 'OCR Verification',
    'dms.ocr_meta': 'Extracted Metadata',
    'dms.invoice_num': 'Invoice Number',
    'dms.invoice_date': 'Invoice Date',
    'dms.amount_ht': 'Amount Excl. Tax',
    'dms.amount_tva': 'VAT Amount',
    'dms.amount_ttc': 'Total Incl. Tax',
    'dms.vendor': 'Vendor / Partner',
    'dms.line_items': 'Line Items',
    'dms.description': 'Description',
    'dms.quantity': 'Quantity',
    'dms.unit_price': 'Unit Price',
    'dms.total': 'Total',
    'dms.reprocess_ocr': 'Reprocess OCR',
    'dms.save_changes': 'Save Changes',
    
    'dms.share_title': 'Share Document via Email',
    'dms.share_to': 'Recipient Email',
    'dms.share_subject': 'Subject',
    'dms.share_body': 'Message',
    'dms.attach_original': 'Attach original file',
    'dms.attach_ocr': 'Attach OCR-annotated PDF',
    'dms.attach_json': 'Attach metadata JSON',
    'dms.send': 'Send Email',
    
    'tools.users_title': 'User Accounts Management',
    'tools.create_user': 'Create User',
    'tools.edit_user': 'Edit User',
    'tools.entities_title': 'Entities Management',
    'tools.create_entity': 'Create Entity',
    'tools.doctypes_title': 'Document Types Management',
    'tools.create_doctype': 'Create Document Type',
    'tools.partners_title': 'Partners Management',
    'tools.create_partner': 'Create Partner',
    'tools.groups_title': 'Document Groups Management',
    'tools.create_group': 'Create Group',
    
    'settings.title': 'System Configuration Settings',
    'settings.general': 'General Settings',
    'settings.smtp': 'SMTP Server Settings',
    'settings.ocr': 'OCR Engine Settings',
    'settings.limits': 'Thresholds & Limits',
    'settings.save': 'Save Configuration'
  };

  constructor() {
    // Load preference from localStorage if set
    const savedLang = localStorage.getItem('filora_lang') as 'fr' | 'en';
    if (savedLang === 'fr' || savedLang === 'en') {
      this.currentLang.set(savedLang);
    }
    
    // Initialize dictionary from fallback
    this.dictionary.set(this.currentLang() === 'fr' ? this.fallbackFr : this.fallbackEn);
    
    // Load full JSON dictionary from backend assets folder asynchronously
    this.loadDictionary(this.currentLang());
  }

  setLanguage(lang: 'fr' | 'en') {
    this.currentLang.set(lang);
    localStorage.setItem('filora_lang', lang);
    // Switch to fallback first for instant changes
    this.dictionary.set(lang === 'fr' ? this.fallbackFr : this.fallbackEn);
    // Refresh with full JSON
    this.loadDictionary(lang);
  }

  // Reactive translation fetcher
  translate(key: string, interpolations?: Record<string, string | number>): string {
    let text = this.dictionary()[key];
    if (text === undefined) {
      // Fallback search in statics just in case
      text = this.currentLang() === 'fr' ? this.fallbackFr[key] : this.fallbackEn[key];
    }
    if (text === undefined) {
      return key; // return key if translation does not exist
    }

    if (interpolations) {
      Object.entries(interpolations).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), String(v));
      });
    }
    return text;
  }

  private loadDictionary(lang: 'fr' | 'en') {
    this.http.get<Record<string, string>>(`/assets/i18n/${lang}.json`).pipe(
      catchError(() => {
        console.warn(`Could not load translations from assets JSON for language: ${lang}. Using built-in local dictionary fallback.`);
        return of(lang === 'fr' ? this.fallbackFr : this.fallbackEn);
      })
    ).subscribe(data => {
      if (data) {
        this.dictionary.set(data);
      }
    });
  }
}
