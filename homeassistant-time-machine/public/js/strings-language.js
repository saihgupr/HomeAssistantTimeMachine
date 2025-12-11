// strings.js - Language strings for the Home Assistant Time Machine add-on
window.STRINGS = {
  notifications: {
    haUrlNotConfigured: {
      en: "Home Assistant URL or token not configured.",
      es: "URL de Home Assistant o token no configurado.",
      de: "Home Assistant-URL oder Token nicht konfiguriert.",
      fr: "URL ou jeton Home Assistant non configuré.",
      nl: "Home Assistant URL of token niet geconfigureerd.",
      it: "URL o token di Home Assistant non configurati."
    },
    lovelaceRestored: {
      en: "Lovelace successfully restored! Restart Home Assistant to see changes.",
      es: "¡Lovelace restaurado con éxito! Reinicia Home Assistant para ver los cambios.",
      de: "Lovelace erfolgreich wiederhergestellt! Starte Home Assistant neu, um die Änderungen zu sehen.",
      fr: "Lovelace restauré avec succès ! Redémarrez Home Assistant pour voir les changements.",
      nl: "Lovelace succesvol hersteld! Herstart Home Assistant om de wijzigingen te zien.",
      it: "Lovelace ripristinato con successo! Riavvia Home Assistant per vedere le modifiche."
    },
    automationsReloaded: {
      en: "{mode}s reloaded successfully in Home Assistant!",
      es: "¡{mode}s recargados con éxito en Home Assistant!",
      de: "{mode}s erfolgreich in Home Assistant neugeladen!",
      fr: "{mode}s rechargés avec succès dans Home Assistant !",
      nl: "{mode}s succesvol herladen in Home Assistant!",
      it: "{mode} ricaricati con successo in Home Assistant!"
    },
    errorReloadingHA: {
      en: "Error reloading Home Assistant: {error}",
      es: "Error recargando Home Assistant: {error}",
      de: "Fehler beim Neuladen von Home Assistant: {error}",
      fr: "Erreur lors du rechargement de Home Assistant : {error}",
      nl: "Fout bij herladen van Home Assistant: {error}",
      it: "Errore durante il ricaricamento di Home Assistant: {error}"
    },
    haRestarting: {
      en: "Home Assistant is restarting...",
      es: "Home Assistant se está reiniciando...",
      de: "Home Assistant wird neu gestartet...",
      fr: "Home Assistant est en cours de redémarrage...",
      nl: "Home Assistant wordt opnieuw opgestart...",
      it: "Home Assistant si sta riavviando..."
    },
    errorRestartingHA: {
      en: "Error restarting Home Assistant: {error}",
      es: "Error reiniciando Home Assistant: {error}",
      de: "Fehler beim Neustart von Home Assistant: {error}",
      fr: "Erreur lors du redémarrage de Home Assistant : {error}",
      nl: "Fout bij opnieuw opstarten van Home Assistant: {error}",
      it: "Errore durante il riavvio di Home Assistant: {error}"
    },
    itemRestoredManual: {
      en: "{mode} restored successfully! Manual reload in Home Assistant required, or configure URL/Token in settings.",
      es: "¡{mode} restaurado con éxito! Se requiere recarga manual en Home Assistant, o configure URL/Token en ajustes.",
      de: "{mode} erfolgreich wiederhergestellt! Manuelles Neuladen in Home Assistant erforderlich, oder URL/Token in den Einstellungen konfigurieren.",
      fr: "{mode} restauré avec succès ! Rechargement manuel dans Home Assistant requis, ou configurez l'URL/Jeton dans les paramètres.",
      nl: "{mode} succesvol hersteld! Handmatig herladen in Home Assistant vereist, of configureer URL/Token in instellingen.",
      it: "{mode} ripristinato con successo! È necessario ricaricare manualmente in Home Assistant, oppure configurare URL/Token nelle impostazioni."
    },
    errorGeneric: {
      en: "Error: {error}",
      es: "Error: {error}",
      de: "Fehler: {error}",
      fr: "Erreur : {error}",
      nl: "Fout: {error}",
      it: "Errore: {error}"
    },
    restartManually: {
      en: "Restart from Home Assistant when ready.",
      es: "Reinicia desde Home Assistant cuando esté listo.",
      de: "Starte Home Assistant neu, wenn bereit.",
      fr: "Redémarrez depuis Home Assistant lorsque vous êtes prêt.",
      nl: "Herstart vanuit Home Assistant wanneer gereed.",
      it: "Riavvia da Home Assistant quando è pronto."
    },
    haRestarted: {
      en: "Home Assistant restarted successfully!",
      es: "¡Home Assistant reiniciado con éxito!",
      de: "Home Assistant erfolgreich neu gestartet!",
      fr: "Home Assistant a redémarré avec succès !",
      nl: "Home Assistant succesvol opnieuw opgestart!",
      it: "Home Assistant riavviato con successo!"
    },
    packagesReloaded: {
      en: "Packages file restored and Home Assistant reloaded!",
      es: "¡Archivo de paquetes restaurado y Home Assistant recargado!",
      de: "Paketdatei wiederhergestellt und Home Assistant neugeladen!",
      fr: "Fichier de paquets restauré et Home Assistant rechargé !",
      nl: "Pakkettenbestand hersteld en Home Assistant herladen!",
      it: "File pacchetti ripristinato e Home Assistant ricaricato!"
    },
    packagesManualReload: {
      en: "Packages file restored! Reload Home Assistant manually.",
      es: "¡Archivo de paquetes restaurado! Recarga Home Assistant manualmente.",
      de: "Paketdatei wiederhergestellt! Lade Home Assistant manuell neu.",
      fr: "Fichier de paquets restauré ! Rechargez Home Assistant manuellement.",
      nl: "Pakkettenbestand hersteld! Herlaad Home Assistant handmatig.",
      it: "File pacchetti ripristinato! Ricarica Home Assistant manualmente."
    },
    packagesRestored: {
      en: "Packages file restored!",
      es: "¡Archivo de paquetes restaurado!",
      de: "Paketdatei wiederhergestellt!",
      fr: "Fichier de paquets restauré !",
      nl: "Pakkettenbestand hersteld!",
      it: "File pacchetti ripristinato!"
    },
    restartButton: {
      en: "Restart",
      es: "Reiniciar",
      de: "Neustart",
      fr: "Redémarrer",
      nl: "Herstarten",
      it: "Riavvia"
    }
  },
  ui: {
    labels: {
      backups: {
        en: "Backups",
        es: "Copias de seguridad",
        de: "Backups",
        fr: "Sauvegardes",
        nl: "Back-ups",
        it: "Backup"
      },
      sortDefault: {
        en: "Default Order",
        es: "Orden predeterminado",
        de: "Standard-Reihenfolge",
        fr: "Ordre par défaut",
        nl: "Standaard volgorde",
        it: "Ordine predefinito"
      },
      sortAlphaAsc: {
        en: "A → Z",
        es: "A → Z",
        de: "A → Z",
        fr: "A → Z",
        nl: "A → Z",
        it: "A → Z"
      },
      sortAlphaDesc: {
        en: "Z → A",
        es: "Z → A",
        de: "Z → A",
        fr: "Z → A",
        nl: "Z → A",
        it: "Z → A"
      },
      maxBackups: {
        en: "Max Backups",
        es: "Máx. copias",
        de: "Max. Backups",
        fr: "Sauvegardes max.",
        nl: "Max. back-ups",
        it: "Max Backup"
      },
      backupsToKeep: {
        en: "Backups to keep",
        es: "Copias a conservar",
        de: "Aufzubewahrende Backups",
        fr: "Sauvegardes à conserver",
        nl: "Te bewaren back-ups",
        it: "Backup da conservare"
      },
      textStyle: {
        en: "Text style",
        es: "Estilo de texto",
        de: "Textstil",
        fr: "Style de texte",
        nl: "Tekststijl",
        it: "Stile testo"
      }
    },
    titles: {
      backups: {
        en: "Backups",
        es: "Copias de seguridad",
        de: "Backups",
        fr: "Sauvegardes",
        nl: "Back-ups",
        it: "Backup"
      },
      items: {
        en: "{mode}",
        es: "{mode}",
        de: "{mode}",
        fr: "{mode}",
        nl: "{mode}",
        it: "{mode}"
      }
    },
    hero: {
      subtitle: {
        en: "Browse and restore backups",
        es: "Explorar y restaurar copias de seguridad",
        de: "Backups durchsuchen und wiederherstellen",
        fr: "Parcourir et restaurer les sauvegardes",
        nl: "Door back-ups bladeren en herstellen",
        it: "Sfoglia e ripristina backup"
      }
    },
    backupList: {
      snapshotsAvailable: {
        en: "{count} snapshots available",
        es: "{count} instantáneas disponibles",
        de: "{count} Snapshots verfügbar",
        fr: "{count} instantanés disponibles",
        nl: "{count} snapshots beschikbaar",
        it: "{count} istantanee disponibili"
      },
      noBackups: {
        en: "No backups available yet.",
        es: "Aún no hay copias de seguridad disponibles.",
        de: "Noch keine Backups verfügbar.",
        fr: "Aucune sauvegarde disponible pour le moment.",
        nl: "Nog geen back-ups beschikbaar.",
        it: "Nessun backup ancora disponibile."
      },
      loading: {
        en: "Loading...",
        es: "Cargando...",
        de: "Laden...",
        fr: "Chargement...",
        nl: "Laden...",
        it: "Caricamento..."
      }
    },
    itemsList: {
      noBackupSelected: {
        en: "No backup selected",
        es: "Ninguna copia de seguridad seleccionada",
        de: "Kein Backup ausgewählt",
        fr: "Aucune sauvegarde sélectionnée",
        nl: "Geen back-up geselecteerd",
        it: "Nessun backup selezionato"
      },
      sortOptions: {
        en: "Default Order, A → Z, Z → A",
        es: "Orden predeterminado, A → Z, Z → A",
        de: "Standard-Reihenfolge, A → Z, Z → A",
        fr: "Ordre par défaut, A → Z, Z → A",
        nl: "Standaard volgorde, A → Z, Z → A",
        it: "Ordine predefinito, A → Z, Z → A"
      },
      searchPlaceholder: {
        en: "Search {mode}...",
        es: "Buscar {mode}...",
        de: "{mode} suchen...",
        fr: "Rechercher {mode}...",
        nl: "Zoek {mode}...",
        it: "Cerca {mode}..."
      },
      loading: {
        en: "Loading {mode}...",
        es: "Cargando {mode}...",
        de: "Lade {mode}...",
        fr: "Chargement de {mode}...",
        nl: "{mode} laden...",
        it: "Caricamento {mode}..."
      },
      selectBackup: {
        en: "Select a backup to view {mode}",
        es: "Selecciona una copia de seguridad para ver {mode}",
        de: "Wähle ein Backup, um {mode} anzuzeigen",
        fr: "Sélectionnez une sauvegarde pour voir {mode}",
        nl: "Selecteer een back-up om {mode} te bekijken",
        it: "Seleziona un backup per visualizzare {mode}"
      },
      noItems: {
        en: "No {mode} found in this backup.",
        es: "No se encontraron {mode} en esta copia de seguridad.",
        de: "Keine {mode} in diesem Backup gefunden.",
        fr: "Aucun {mode} trouvé dans cette sauvegarde.",
        nl: "Geen {mode} gevonden in deze back-up.",
        it: "Nessun {mode} trovato in questo backup."
      },
      noMatchingItems: {
        en: "No matching items",
        es: "No hay elementos coincidentes",
        de: "Keine übereinstimmenden Elemente",
        fr: "Aucun élément correspondant",
        nl: "Geen overeenkomende items",
        it: "Nessun elemento corrispondente"
      }
    },
    badges: {
      changed: {
        en: "Changed",
        es: "Cambiado",
        de: "Geändert",
        fr: "Modifié",
        nl: "Gewijzigd",
        it: "Modificato"
      },
      deleted: {
        en: "Deleted",
        es: "Eliminado",
        de: "Gelöscht",
        fr: "Supprimé",
        nl: "Verwijderd",
        it: "Eliminato"
      }
    },
    buttons: {
      automations: {
        en: "Automations",
        es: "Automatizaciones",
        de: "Automationen",
        fr: "Automatisations",
        nl: "Automatiseringen",
        it: "Automazioni"
      },
      scripts: {
        en: "Scripts",
        es: "Guiones",
        de: "Skripte",
        fr: "Scénarios",
        nl: "Scripts",
        it: "Script"
      },
      lovelace: {
        en: "Lovelace",
        es: "Lovelace",
        de: "Lovelace",
        fr: "Lovelace",
        nl: "Lovelace",
        it: "Lovelace"
      },
      esphome: {
        en: "ESPHome",
        es: "ESPHome",
        de: "ESPHome",
        fr: "ESPHome",
        nl: "ESPHome",
        it: "ESPHome"
      },
      packages: {
        en: "Packages",
        es: "Paquetes",
        de: "Pakete",
        fr: "Paquets",
        nl: "Pakketten",
        it: "Pacchetti"
      },
      settings: {
        en: "Settings",
        es: "Ajustes",
        de: "Einstellungen",
        fr: "Paramètres",
        nl: "Instellingen",
        it: "Impostazioni"
      },
      restartNow: {
        en: "Restart Now",
        es: "Reiniciar ahora",
        de: "Jetzt neustarten",
        fr: "Redémarrer maintenant",
        nl: "Nu herstarten",
        it: "Riavvia ora"
      },
      testConnection: {
        en: "Test Connection",
        es: "Probar conexión",
        de: "Verbindung testen",
        fr: "Tester la connexion",
        nl: "Test verbinding",
        it: "Testa connessione"
      },
      backupNow: {
        en: "Backup Now",
        es: "Hacer copia ahora",
        de: "Jetzt sichern",
        fr: "Sauvegarder maintenant",
        nl: "Nu back-uppen",
        it: "Esegui backup ora"
      },
      cancel: {
        en: "Cancel",
        es: "Cancelar",
        de: "Abbrechen",
        fr: "Annuler",
        nl: "Annuleren",
        it: "Annulla"
      },
      save: {
        en: "Save",
        es: "Guardar",
        de: "Speichern",
        fr: "Enregistrer",
        nl: "Opslaan",
        it: "Salva"
      },
      restore: {
        en: "Restore This Version",
        es: "Restaurar esta versión",
        de: "Diese Version wiederherstellen",
        fr: "Restaurer cette version",
        nl: "Deze versie herstellen",
        it: "Ripristina questa versione"
      },
      restoreLovelace: {
        en: "Restore",
        es: "Restaurar",
        de: "Wiederherstellen",
        fr: "Restaurer",
        nl: "Herstellen",
        it: "Ripristina"
      }
    },
    settings: {
      title: {
        en: "Settings",
        es: "Ajustes",
        de: "Einstellungen",
        fr: "Paramètres",
        nl: "Instellingen",
        it: "Impostazioni"
      },
      haUrlLabel: {
        en: "Home Assistant URL",
        es: "URL de Home Assistant",
        de: "Home Assistant-URL",
        fr: "URL Home Assistant",
        nl: "Home Assistant URL",
        it: "URL Home Assistant"
      },
      haTokenLabel: {
        en: "Long-Lived Access Token",
        es: "Token de acceso de larga duración",
        de: "Langlebiger Zugriffstoken",
        fr: "Jeton d'accès longue durée",
        nl: "Langlevend toegangstoken",
        it: "Token di accesso a lunga durata"
      },
      liveConfigPathLabel: {
        en: "Config Folder Path",
        es: "Ruta de la carpeta de configuración",
        de: "Pfad zum Konfigurationsordner",
        fr: "Chemin du dossier de configuration",
        nl: "Pad naar configuratiemap",
        it: "Percorso cartella di configurazione"
      },
      backupFolderPathLabel: {
        en: "Backup Folder Path",
        es: "Ruta de la carpeta de copias",
        de: "Pfad zum Backup-Ordner",
        fr: "Chemin du dossier de sauvegarde",
        nl: "Pad naar back-upmap",
        it: "Percorso cartella di backup"
      },
      enableScheduledBackup: {
        en: "Enable Scheduled Backup",
        es: "Activar copia programada",
        de: "Geplantes Backup aktivieren",
        fr: "Activer la sauvegarde planifiée",
        nl: "Geplande back-up inschakelen",
        it: "Abilita backup pianificato"
      },
      frequencyLabel: {
        en: "Frequency",
        es: "Frecuencia",
        de: "Häufigkeit",
        fr: "Fréquence",
        nl: "Frequentie",
        it: "Frequenza"
      },
      timeLabel: {
        en: "Time",
        es: "Hora",
        de: "Uhrzeit",
        fr: "Heure",
        nl: "Tijd",
        it: "Ora"
      },
      daily: {
        en: "Daily",
        es: "Diario",
        de: "Täglich",
        fr: "Quotidien",
        nl: "Dagelijks",
        it: "Giornaliero"
      },
      hourly: {
        en: "Hourly",
        es: "Por hora",
        de: "Stündlich",
        fr: "Horaire",
        nl: "Per uur",
        it: "Orario"
      },
      weekly: {
        en: "Weekly",
        es: "Semanal",
        de: "Wöchentlich",
        fr: "Hebdomadaire",
        nl: "Wekelijks",
        it: "Settimanale"
      },
      smartBackupLabel: {
        en: "Only Backup Changes",
        es: "Solo respaldar cambios",
        de: "Nur Änderungen sichern",
        fr: "Sauvegarder uniquement les modifications",
        nl: "Alleen wijzigingen back-uppen",
        it: "Esegui backup solo delle modifiche"
      },
      smartBackupHint: {
        en: "Backups only include files that changed since the last backup.",
        es: "Las copias de seguridad solo incluyen archivos que cambiaron desde la última copia.",
        de: "Backups enthalten nur Dateien, die seit dem letzten Backup geändert wurden.",
        fr: "Les sauvegardes n'incluent que les fichiers modifiés depuis la dernière sauvegarde.",
        nl: "Back-ups bevatten alleen bestanden die sinds de laatste back-up zijn gewijzigd.",
        it: "I backup includono solo i file modificati dall'ultimo backup."
      }
    },
    connectionTest: {
      testing: {
        en: "Testing connection...",
        es: "Probando conexión...",
        de: "Teste Verbindung...",
        fr: "Test de la connexion...",
        nl: "Verbinding testen...",
        it: "Test connessione in corso..."
      },
      connected: {
        en: "Connected to Home Assistant successfully.",
        es: "Conectado a Home Assistant con éxito.",
        de: "Erfolgreich mit Home Assistant verbunden.",
        fr: "Connecté à Home Assistant avec succès.",
        nl: "Succesvol verbonden met Home Assistant.",
        it: "Connesso a Home Assistant con successo."
      },
      failed: {
        en: "Connection failed",
        es: "Conexión fallida",
        de: "Verbindung fehlgeschlagen",
        fr: "Échec de la connexion",
        nl: "Verbinding mislukt",
        it: "Connessione fallita"
      }
    },
    settingsMessages: {
      directoryNotFound: {
        en: "We couldn't find {path}. Create it or pick the correct folder.",
        es: "No pudimos encontrar {path}. Créalo o elige la carpeta correcta.",
        de: "Wir konnten {path} nicht finden. Erstelle es oder wähle den korrekten Ordner.",
        fr: "Impossible de trouver {path}. Créez-le ou choisissez le bon dossier.",
        nl: "We konden {path} niet vinden. Maak het aan of kies de juiste map.",
        it: "Impossibile trovare {path}. Crealo o scegli la cartella corretta."
      },
      notDirectory: {
        en: "{path} isn't a folder. Choose a directory instead.",
        es: "{path} no es una carpeta. Elige un directorio en su lugar.",
        de: "{path} ist kein Ordner. Wähle stattdessen ein Verzeichnis.",
        fr: "{path} n'est pas un dossier. Choisissez un répertoire.",
        nl: "{path} is geen map. Kies in plaats daarvan een map.",
        it: "{path} non è una cartella. Scegli invece una directory."
      },
      missingAutomations: {
        en: "We couldn't find automations.yaml in {path}. Please ensure you have mounted your Home Assistant configuration directory to this path.",
        es: "No pudimos encontrar automations.yaml en {path}. Apunta a tu carpeta de configuración de Home Assistant.",
        de: "Wir konnten automations.yaml in {path} nicht finden. Zeige auf deinen Home Assistant-Konfigurationsordner.",
        fr: "Impossible de trouver automations.yaml dans {path}. Pointez vers votre dossier de configuration Home Assistant.",
        nl: "We konden automations.yaml niet vinden in {path}. Verwijs naar je Home Assistant configuratiemap.",
        it: "Impossibile trovare automations.yaml in {path}. Indica la cartella di configurazione di Home Assistant."
      },
      cannotAccess: {
        en: "We couldn't open {path}. Check permissions and try again.",
        es: "No pudimos abrir {path}. Comprueba los permisos e inténtalo de nuevo.",
        de: "Wir konnten {path} nicht öffnen. Überprüfe die Berechtigungen und versuche es erneut.",
        fr: "Impossible d'ouvrir {path}. Vérifiez les autorisations et réessayez.",
        nl: "We konden {path} niet openen. Controleer de permissies en probeer het opnieuw.",
        it: "Impossibile aprire {path}. Controlla i permessi e riprova."
      },
      backupDirUnwritable: {
        en: "We can't write to {path}. Update permissions or pick another backup folder.",
        es: "No podemos escribir en {path}. Actualiza los permisos o elige otra carpeta de copias.",
        de: "Wir können nicht in {path} schreiben. Aktualisiere die Berechtigungen oder wähle einen anderen Backup-Ordner.",
        fr: "Impossible d'écrire dans {path}. Mettez à jour les autorisations ou choisissez un autre dossier de sauvegarde.",
        nl: "We kunnen niet schrijven naar {path}. Werk de permissies bij of kies een andere back-upmap.",
        it: "Impossibile scrivere su {path}. Aggiorna i permessi o scegli un'altra cartella di backup."
      },
      backupDirCreateFailed: {
        en: "We couldn't create a backup folder inside {parent}. Check permissions or free up space.",
        es: "No pudimos crear una carpeta de copias dentro de {parent}. Comprueba los permisos o libera espacio.",
        de: "Wir konnten keinen Backup-Ordner in {parent} erstellen. Überprüfe die Berechtigungen oder schaffe Speicherplatz.",
        fr: "Impossible de créer un dossier de sauvegarde dans {parent}. Vérifiez les autorisations ou libérez de l'espace.",
        nl: "We konden geen back-upmap maken binnen {parent}. Controleer permissies of maak ruimte vrij.",
        it: "Impossibile creare una cartella di backup all'interno di {parent}. Controlla i permessi o libera spazio."
      },
      unknownError: {
        en: "Something went wrong. Please try again.",
        es: "Algo salió mal. Por favor, inténtalo de nuevo.",
        de: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
        fr: "Quelque chose s'est mal passé. Veuillez réessayer.",
        nl: "Er is iets misgegaan. Probeer het opnieuw.",
        it: "Qualcosa è andato storto. Per favore, riprova."
      }
    },
    backupNow: {
      creating: {
        en: "Creating backup...",
        es: "Creando copia de seguridad...",
        de: "Erstelle Backup...",
        fr: "Création de la sauvegarde...",
        nl: "Back-up maken...",
        it: "Creazione backup in corso..."
      },
      successWithPath: {
        en: "Backup stored at {path}.",
        es: "Copia de seguridad guardada en {path}.",
        de: "Backup gespeichert unter {path}.",
        fr: "Sauvegarde stockée à {path}.",
        nl: "Back-up opgeslagen op {path}.",
        it: "Backup salvato in {path}."
      }
    },
    diffViewer: {
      noChanges: {
        en: "No changes between backup and live version.",
        es: "No hay cambios entre la copia de seguridad y la versión activa.",
        de: "Keine Änderungen zwischen Backup und Live-Version.",
        fr: "Aucun changement entre la sauvegarde et la version actuelle.",
        nl: "Geen wijzigingen tussen back-up en live versie.",
        it: "Nessuna modifica tra il backup e la versione live."
      },
      compareVersions: {
        en: "Compare backup with current live version.",
        es: "Comparar copia de seguridad con la versión activa actual.",
        de: "Backup mit aktueller Live-Version vergleichen.",
        fr: "Comparer la sauvegarde avec la version actuelle.",
        nl: "Vergelijk back-up met huidige live versie.",
        it: "Confronta il backup con la versione live attuale."
      },
      loadingLive: {
        en: "Loading live version...",
        es: "Cargando versión activa...",
        de: "Lade Live-Version...",
        fr: "Chargement de la version actuelle...",
        nl: "Live versie laden...",
        it: "Caricamento versione live..."
      },
      itemDeleted: {
        en: "This item has been deleted. Restore it from this backup version when you are ready.",
        es: "Este elemento ha sido eliminado. Restáuralo desde esta versión de la copia de seguridad cuando estés listo.",
        de: "Dieses Element wurde gelöscht. Stelle es aus dieser Backup-Version wieder her, wenn du bereit bist.",
        fr: "Cet élément a été supprimé. Restaurez-le à partir de cette version de sauvegarde lorsque vous êtes prêt.",
        nl: "Dit item is verwijderd. Herstel het vanuit deze back-upversie wanneer je klaar bent.",
        it: "Questo elemento è stato eliminato. Ripristinalo da questa versione di backup quando sei pronto."
      },
      fileDeleted: {
        en: "This file has been deleted. Restore it from this backup version when you are ready.",
        es: "Este archivo ha sido eliminado. Restáuralo desde esta versión de la copia de seguridad cuando estés listo.",
        de: "Diese Datei wurde gelöscht. Stelle sie aus dieser Backup-Version wieder her, wenn du bereit bist.",
        fr: "Ce fichier a été supprimé. Restaurez-le à partir de cette version de sauvegarde lorsque vous êtes prêt.",
        nl: "Dit bestand is verwijderd. Herstel het vanuit deze back-upversie wanneer je klaar bent.",
        it: "Questo file è stato eliminato. Ripristinalo da questa versione di backup quando sei pronto."
      },
      currentVersion: {
        en: "Current Version",
        es: "Versión actual",
        de: "Aktuelle Version",
        fr: "Version actuelle",
        nl: "Huidige versie",
        it: "Versione corrente"
      },
      liveVersion: {
        en: "Live Version",
        es: "Versión en vivo",
        de: "Live-Version",
        fr: "Version live",
        nl: "Live versie",
        it: "Versione live"
      },
      backupVersion: {
        en: "Backup Version",
        es: "Versión de respaldo",
        de: "Sicherungsversion",
        fr: "Version de sauvegarde",
        nl: "Back-upversie",
        it: "Versione di backup"
      },
      expandContext: {
        en: "Expand context...",
        es: "Ampliar contexto...",
        de: "Kontext erweitern...",
        fr: "Étendre le contexte...",
        nl: "Context uitvouwen...",
        it: "Espandi contesto..."
      },
      linesPrefix: {
        en: "Lines",
        es: "Líneas",
        de: "Zeilen",
        fr: "Lignes",
        nl: "Regels",
        it: "Linee"
      },
      linesArrow: {
        en: "→",
        es: "→",
        de: "→",
        fr: "→",
        nl: "→",
        it: "→"
      }
    },
    lovelace: {
      title: {
        en: "Lovelace",
        es: "Lovelace",
        de: "Lovelace",
        fr: "Lovelace",
        nl: "Lovelace",
        it: "Lovelace"
      },
      searchPlaceholder: {
        en: "Search lovelace files...",
        es: "Buscar archivos de lovelace...",
        de: "Lovelace-Dateien suchen...",
        fr: "Rechercher des fichiers lovelace...",
        nl: "Zoek lovelace-bestanden...",
        it: "Cerca file lovelace..."
      },
      loading: {
        en: "Loading Lovelace files...",
        es: "Cargando archivos de Lovelace...",
        de: "Lade Lovelace-Dateien...",
        fr: "Chargement des fichiers Lovelace...",
        nl: "Lovelace-bestanden laden...",
        it: "Caricamento file Lovelace..."
      },
      selectBackup: {
        en: "Select a backup to view Lovelace files",
        es: "Selecciona una copia de seguridad para ver archivos de Lovelace",
        de: "Wähle ein Backup, um Lovelace-Dateien anzuzeigen",
        fr: "Sélectionnez une sauvegarde pour voir les fichiers Lovelace",
        nl: "Selecteer een back-up om Lovelace-bestanden te bekijken",
        it: "Seleziona un backup per visualizzare i file Lovelace"
      },
      noFiles: {
        en: "No Lovelace files found in this backup",
        es: "No se encontraron archivos de Lovelace en esta copia de seguridad",
        de: "Keine Lovelace-Dateien in diesem Backup gefunden",
        fr: "Aucun fichier Lovelace trouvé dans cette sauvegarde",
        nl: "Geen Lovelace-bestanden gevonden in deze back-up",
        it: "Nessun file Lovelace trovato in questo backup"
      }
    },
    esphome: {
      title: {
        en: "ESPHome",
        es: "ESPHome",
        de: "ESPHome",
        fr: "ESPHome",
        nl: "ESPHome",
        it: "ESPHome"
      },
      searchPlaceholder: {
        en: "Search ESPHome files...",
        es: "Buscar archivos de ESPHome...",
        de: "ESPHome-Dateien suchen...",
        fr: "Rechercher des fichiers ESPHome...",
        nl: "Zoek ESPHome-bestanden...",
        it: "Cerca file ESPHome..."
      },
      loading: {
        en: "Loading ESPHome files...",
        es: "Cargando archivos de ESPHome...",
        de: "Lade ESPHome-Dateien...",
        fr: "Chargement des fichiers ESPHome...",
        nl: "ESPHome-bestanden laden...",
        it: "Caricamento file ESPHome..."
      },
      selectBackup: {
        en: "Select a backup to view ESPHome files",
        es: "Selecciona una copia de seguridad para ver archivos de ESPHome",
        de: "Wähle ein Backup, um ESPHome-Dateien anzuzeigen",
        fr: "Sélectionnez une sauvegarde pour voir les fichiers ESPHome",
        nl: "Selecteer een back-up om ESPHome-bestanden te bekijken",
        it: "Seleziona un backup per visualizzare i file ESPHome"
      },
      noFiles: {
        en: "No ESPHome files found in this backup",
        es: "No se encontraron archivos de ESPHome en esta copia de seguridad",
        de: "Keine ESPHome-Dateien in diesem Backup gefunden",
        fr: "Aucun fichier ESPHome trouvé dans cette sauvegarde",
        nl: "Geen ESPHome-bestanden gevonden in deze back-up",
        it: "Nessun file ESPHome trovato in questo backup"
      },
      disabled: {
        en: "ESPHome backups are disabled. Enable them in Settings to view files.",
        es: "Las copias de ESPHome están desactivadas. Actívalas en Ajustes para ver los archivos.",
        de: "ESPHome-Backups sind deaktiviert. Aktiviere sie in den Einstellungen, um Dateien anzuzeigen.",
        fr: "Les sauvegardes ESPHome sont désactivées. Activez-les dans les Paramètres pour voir les fichiers.",
        nl: "ESPHome back-ups zijn uitgeschakeld. Schakel ze in bij Instellingen om bestanden te bekijken.",
        it: "I backup di ESPHome sono disabilitati. Abilitali nelle Impostazioni per visualizzare i file."
      }
    },
    packages: {
      title: {
        en: "Packages",
        es: "Paquetes",
        de: "Pakete",
        fr: "Paquets",
        nl: "Pakketten",
        it: "Pacchetti"
      },
      searchPlaceholder: {
        en: "Search Packages files...",
        es: "Buscar archivos de Paquetes...",
        de: "Paket-Dateien suchen...",
        fr: "Rechercher des fichiers Paquets...",
        nl: "Zoek Pakketten-bestanden...",
        it: "Cerca file Pacchetti..."
      },
      loading: {
        en: "Loading Packages files...",
        es: "Cargando archivos de Paquetes...",
        de: "Lade Paket-Dateien...",
        fr: "Chargement des fichiers Paquets...",
        nl: "Pakketten-bestanden laden...",
        it: "Caricamento file Pacchetti..."
      },
      selectBackup: {
        en: "Select a backup to view Packages files",
        es: "Selecciona una copia de seguridad para ver archivos de Paquetes",
        de: "Wähle ein Backup, um Paket-Dateien anzuzeigen",
        fr: "Sélectionnez une sauvegarde pour voir les fichiers Paquets",
        nl: "Selecteer een back-up om Pakketten-bestanden te bekijken",
        it: "Seleziona un backup per visualizzare i file Pacchetti"
      },
      noFiles: {
        en: "No Packages files found in this backup",
        es: "No se encontraron archivos de Paquetes en esta copia de seguridad",
        de: "Keine Paket-Dateien in diesem Backup gefunden",
        fr: "Aucun fichier Paquet trouvé dans cette sauvegarde",
        nl: "Geen Pakketten-bestanden gevonden in deze back-up",
        it: "Nessun file Pacchetti trovato in questo backup"
      },
      disabled: {
        en: "Packages backups are disabled. Enable them in Settings to view files.",
        es: "Las copias de Paquetes están desactivadas. Actívalas en Ajustes para ver los archivos.",
        de: "Paket-Backups sind deaktiviert. Aktiviere sie in den Einstellungen, um Dateien anzuzeigen.",
        fr: "Les sauvegardes de Paquets sont désactivées. Activez-les dans les Paramètres pour voir les fichiers.",
        nl: "Pakketten back-ups zijn uitgeschakeld. Schakel ze in bij Instellingen om bestanden te bekijken.",
        it: "I backup dei Pacchetti sono disabilitati. Abilitali nelle Impostazioni per visualizzare i file."
      }
    },
    placeholders: {
      search: {
        en: "Search {mode}...",
        es: "Buscar {mode}...",
        de: "{mode} suchen...",
        fr: "Rechercher {mode}...",
        nl: "Zoek {mode}...",
        it: "Cerca {mode}..."
      },
      managedByHA: {
        en: "Automatically managed by Home Assistant",
        es: "Gestionado automáticamente por Home Assistant",
        de: "Automatisch von Home Assistant verwaltet",
        fr: "Géré automatiquement par Home Assistant",
        nl: "Automatisch beheerd door Home Assistant",
        it: "Gestito automaticamente da Home Assistant"
      }
    },
    snapshotFilter: {
      showOnlyChanges: {
        en: "Show Changed Only",
        es: "Mostrar solo cambios",
        de: "Nur Geänderte anzeigen",
        fr: "Afficher les modifiés seulement",
        nl: "Alleen gewijzigd tonen",
        it: "Mostra solo modificati"
      },
      checking: {
        en: "Checking {current} of {total}...",
        es: "Comprobando {current} de {total}...",
        de: "Prüfe {current} von {total}...",
        fr: "Vérification {current} sur {total}...",
        nl: "Controleren {current} van {total}...",
        it: "Verifica {current} di {total}..."
      },
      noChangesFound: {
        en: "No snapshots with changes found",
        es: "No se encontraron instantáneas con cambios",
        de: "Keine Snapshots mit Änderungen gefunden",
        fr: "Aucun instantané avec modifications trouvé",
        nl: "Geen snapshots met wijzigingen gevonden",
        it: "Nessuna istantanea con modifiche trovata"
      },
      snapshotsWithChanges: {
        en: "{count} snapshots with changes",
        es: "{count} instantáneas con cambios",
        de: "{count} Snapshots mit Änderungen",
        fr: "{count} instantanés avec modifications",
        nl: "{count} snapshots met wijzigingen",
        it: "{count} istantanee con modifiche"
      },
      loading: {
        en: "Loading snapshots with changes...",
        es: "Cargando instantáneas con cambios...",
        de: "Lade Snapshots mit Änderungen...",
        fr: "Chargement des instantanés avec modifications...",
        nl: "Snapshots met wijzigingen laden...",
        it: "Caricamento istantanee con modifiche..."
      }
    }
  }
};