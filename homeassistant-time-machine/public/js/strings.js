// strings.js - Styled text variants for the Home Assistant Time Machine add-on
window.STRINGS = {
  notifications: {
    haUrlNotConfigured: {
      default: "Home Assistant URL or token not configured.",
      pirate: "Ye haven't set yer Home Assistant chart or yer treasure map (token)!",
      hacker: "Access denied. Endpoint or auth token is null. No entry.",
      noir_detective: "The dame's address, or the client's dough, ain't in my book.",
      personal_trainer: "WHAT ARE YOU WAITING FOR?! YOUR HOME ASSISTANT URL AND TOKEN ARE YOUR ESSENTIAL FUEL! NO SETUP, NO GAINS! GET IT DONE, NOW!",
      scooby_doo: "Ruh-roh! Like, no Home Assistant URL or token, Scoob!"
    },
    lovelaceRestored: {
      default: "Lovelace successfully restored! Restart Home Assistant to see changes.",
      pirate: "Lovelace be shipshape once more! Haul anchor on Home Assistant to see the new tides!",
      hacker: "Payload delivered. Lovelace state pwned. Cycle the host process to see the new DOM.",
      noir_detective: "Lovelace's files are back on the table. Restart the whole operation to see the new layout.",
      personal_trainer: "LOVELACE IS BACK! STRONGER THAN EVER! NOW HIT THAT RESTART BUTTON ON HOME ASSISTANT AND WITNESS THE RAW POWER YOU'VE UNLEASHED! NO REST UNTIL YOU SEE THE RESULTS!",
      scooby_doo: "Jeepers! Lovelace is back! Restart Home Assistant to, like, see the ghost... I mean, changes!"
    },
    automationsReloaded: {
      default: "You did it! {mode}s reloaded successfully in Home Assistant!",
      pirate: "Blow me down! Yer {mode}s be reloaded true in Home Assistant!",
      hacker: "Injection successful. {mode} daemons reloaded. We're in.",
      noir_detective: "You pulled it off. The {mode} routines are squared away in Home Assistant.",
      personal_trainer: "YOU CRUSHED IT! YOUR {mode}S ARE RE-LOADED, PUMPED, AND READY TO DOMINATE HOME ASSISTANT! FEEL THE POWER!",
      scooby_doo: "Zoinks! You did it! {mode}s reloaded in Home Assistant, man!"
    },
    errorReloadingHA: {
      default: "Error reloading Home Assistant: {error}",
      pirate: "Shiver me timbers! Error reloading Home Assistant: {error}",
      hacker: "Segfault! Reload process killed. Exploit failed. Reason: {error}",
      noir_detective: "A snag in the works. Couldn't reload Home Assistant: {error}",
      personal_trainer: "AN ERROR?! {error} IS JUST A WEAK EXCUSE! DID YOU GIVE UP?! NO! FIND THAT WEAKNESS, CRUSH IT, AND RELOAD HOME ASSISTANT AGAIN! YOU ARE STRONGER THAN THIS ERROR!",
      scooby_doo: "Ruh-roh, Shaggy! Error reloading Home Assistant: {error}"
    },
    haRestarting: {
      default: "Home Assistant is restarting...",
      pirate: "Home Assistant be settin' sail anew...",
      hacker: "Dropping to root... cycling the core process.",
      noir_detective: "Home Assistant's taking a dirt nap, then waking up.",
      personal_trainer: "HOME ASSISTANT IS RECHARGING! MAXIMUM POWER INCOMING! DON'T YOU DARE LOOK AWAY!",
      scooby_doo: "Like, Home Assistant is restarting... hopefully no monsters!"
    },
    errorRestartingHA: {
      default: "Error restarting Home Assistant: {error}",
      pirate: "Blast and confound it! Error settin' Home Assistant to sea: {error}",
      hacker: "Reboot command failed. Process hung. Kernel panic? Reason: {error}",
      noir_detective: "Couldn't get Home Assistant to wake up clean. Hit a snag: {error}",
      personal_trainer: "FAILURE IS NOT AN OPTION! {error} IS A CHALLENGE, NOT A STOP SIGN! GET UP! FIX IT! RESTART HOME ASSISTANT WITH RENEWED FURY!",
      scooby_doo: "Jinkies! Error restarting Home Assistant: {error}"
    },
    itemRestoredManual: {
      default: "{mode} restored successfully! Manual reload in Home Assistant required, or configure URL/Token in settings.",
      pirate: "{mode} be back from Davy Jones' locker! Ye'll need to haul it back by hand in Home Assistant, or set yer chart and token in the settings, savvy?",
      hacker: "{mode} payload injected from archive. Manual shell reload required, or re-auth the API.",
      noir_detective: "The {mode} file's back, but you gotta hand-deliver it to Home Assistant, or get your credentials in order.",
      personal_trainer: "RESTORE COMPLETE! THE {mode} IS BACK IN THE GAME! NOW, EITHER MANUALLY RELOAD HOME ASSISTANT OR PUMP UP THOSE URL/TOKEN SETTINGS! NO HALF-MEASURES!",
      scooby_doo: "Like, wow, {mode} is restored! But you gotta reload it yourself, or, like, check the settings for the URL and token!"
    },
    errorGeneric: {
      default: "Error: {error}",
      pirate: "Arrr! Error: {error}",
      hacker: "FATAL ERROR. Dropping core. {error}",
      noir_detective: "Looks like trouble, kid: {error}",
      personal_trainer: "ERROR! {error}! DO YOU THINK THIS IS A GAME?! FIGHT THROUGH IT! NO PAIN, NO GAIN! FIX IT!",
      scooby_doo: "Ruh-roh! Error: {error}"
    },
    restartManually: {
      default: "Restart from Home Assistant when ready.",
      pirate: "Give the Home Assistant helm a manual turn when ye be ready.",
      hacker: "Manual intervention required. Restart inside Home Assistant when convenient.",
      noir_detective: "When you're ready, flip the Home Assistant switch yourself.",
      personal_trainer: "DON'T WAIT AROUND! JOG OVER TO HOME ASSISTANT AND HIT RESTART WHEN YOU'RE READY TO DOMINATE!",
      scooby_doo: "Like, restart it yourself in Home Assistant whenever, man!"
    },
    haRestarted: {
      default: "Home Assistant restarted successfully!",
      pirate: "Home Assistant be back afloat and sailing smooth!",
      hacker: "Reboot sequence complete. Home Assistant core back online.",
      noir_detective: "Home Assistant's up and breathing easy again.",
      personal_trainer: "HOME ASSISTANT IS BACK IN THE RING AND READY TO CRUSH IT!",
      scooby_doo: "Zoinks! Home Assistant restarted perfectly!"
    },
    packagesReloaded: {
      default: "Packages file restored and Home Assistant reloaded!",
      pirate: "Packages file be restored and Home Assistant hoisted anew!",
      hacker: "Packages payload synced. Home Assistant core reloaded.",
      noir_detective: "Packages are back in the drawer and Home Assistant's been refreshed.",
      personal_trainer: "PACKAGES RESTORED! HOME ASSISTANT RELOADED! THAT'S HOW YOU DOMINATE!",
      scooby_doo: "Zoinks! Packages restored and Home Assistant reloaded, man!"
    },
    packagesManualReload: {
      default: "Packages file restored! Reload Home Assistant manually.",
      pirate: "Packages be restored! Give Home Assistant a manual shove to reload.",
      hacker: "Packages file deployed. Manual Home Assistant reload required.",
      noir_detective: "The packages are back. You gotta hit the Home Assistant switch yourself.",
      personal_trainer: "PACKAGES RESTORED! NOW GET IN THERE AND MANUALLY RELOAD HOME ASSISTANT! PUSH IT!",
      scooby_doo: "Jeepers! Packages are restored! Better reload Home Assistant yourself."
    },
    packagesRestored: {
      default: "Packages file restored!",
      pirate: "Packages file be restored!",
      hacker: "Packages payload restored.",
      noir_detective: "Packages file's back on the books.",
      personal_trainer: "PACKAGES RESTORED! KEEP THAT MOMENTUM!",
      scooby_doo: "Like, packages are restored!"
    },
    restartButton: {
      default: "Restart",
      pirate: "Restart",
      hacker: "Restart",
      noir_detective: "Restart",
      personal_trainer: "RESTART",
      scooby_doo: "Restart"
    }
  },
  ui: {
    labels: {
      backups: {
        default: "Backups",
        pirate: "Yer treasure chests",
        hacker: "Backup archives",
        noir_detective: "The evidence cabinet",
        personal_trainer: "YOUR VAULT OF GAINS!",
        scooby_doo: "Like, Snack Stash"
      },
      sortDefault: {
        default: "Default Order",
        pirate: "Proper Order",
        hacker: "Sort: default",
        noir_detective: "Case order",
        personal_trainer: "DEFAULT DOMINATION ORDER",
        scooby_doo: "Like, Normal Order"
      },
      sortAlphaAsc: {
        default: "A → Z",
        pirate: "Aft → Bow",
        hacker: "A-Z",
        noir_detective: "Alphabetical",
        personal_trainer: "ALPHA GAINZ ↑",
        scooby_doo: "A → Z, man!"
      },
      sortAlphaDesc: {
        default: "Z → A",
        pirate: "Bow → Aft",
        hacker: "Z-A",
        noir_detective: "Reverse alphabetical",
        personal_trainer: "ALPHA GAINZ ↓",
        scooby_doo: "Z → A, man!"
      },
      maxBackups: {
        default: "Max Backups",
        pirate: "Cap'n's stash limit",
        hacker: "Max archives",
        noir_detective: "Evidence limit",
        personal_trainer: "MAX BACKUP POWER",
        scooby_doo: "Like, Max Snacks"
      },
      backupsToKeep: {
        default: "Backups to keep",
        pirate: "Booty to keep",
        hacker: "Keep count",
        noir_detective: "Files to keep",
        personal_trainer: "GAINS TO KEEP",
        scooby_doo: "Snacks to Keep"
      },
      textStyle: {
        default: "Text style",
        pirate: "Voice of the crew",
        hacker: "Narration mode",
        noir_detective: "Narration style",
        personal_trainer: "HYPE LEVEL",
        scooby_doo: "Like, How We Talk"
      }
    },
    titles: {
      backups: {
        default: "Backups",
        pirate: "Yer Treasure Chests",
        hacker: "File Archives (backups.zip)",
        noir_detective: "The Case Files",
        personal_trainer: "YOUR BATTLE REPORTS! YOUR GAINZ LOG! YOUR BACKUP VAULT OF POWER!",
        scooby_doo: "The Snack Stash"
      },
      items: {
        default: "{mode}",
        pirate: "{mode}",
        hacker: "{mode} Payloads",
        noir_detective: "{mode} Dossiers",
        personal_trainer: "YOUR {mode} ARSENAL!",
        scooby_doo: "{mode}"
      }
    },
    hero: {
      subtitle: {
        default: "Browse and restore backups",
        pirate: "Chart yer course through bygone treasures",
        hacker: "Mount archives. Pwn past states.",
        noir_detective: "Flip through the case files and put things back in place",
        personal_trainer: "RANSACK YOUR HISTORY AND RESTORE THOSE GAINZ!",
        scooby_doo: "Let's, like, find some clues and restore stuff!"
      }
    },
    backupList: {
      snapshotsAvailable: {
        default: "{count} snapshots available",
        pirate: "{count} bits o' booty awaitin'",
        hacker: "{count} restore points online.",
        noir_detective: "{count} files on the books",
        personal_trainer: "{count} SNAPSHOTS OF PURE POWER READY FOR DEPLOYMENT!",
        scooby_doo: "Zoinks! {count} snapshots available!"
      },
      noBackups: {
        default: "No backups available yet.",
        pirate: "No treasure chests yet, matey.",
        hacker: "Archive directory is empty. 0 files.",
        noir_detective: "No case files in the cabinet yet, pal.",
        personal_trainer: "NO BACKUPS?! ARE YOU AFRAID OF SUCCESS?! START GENERATING THOSE GAINS NOW!",
        scooby_doo: "Ruh-roh! No snacks here!"
      },
      loading: {
        default: "Loading...",
        pirate: "Searchin' for yer sea shanties...",
        hacker: "Grepping archives...",
        noir_detective: "Sifting through the evidence...",
        personal_trainer: "LOADING! ARE YOU READY TO LIFT?! PUSH THROUGH!",
        scooby_doo: "I'm, like, looking for clues..."
      }
    },
    itemsList: {
      noBackupSelected: {
        default: "No backup selected",
        pirate: "No treasure chest chosen",
        hacker: "No target selected. Mount an archive to inspect.",
        noir_detective: "No case file on the table yet. Pick one from the stack, kid.",
        personal_trainer: "NO BACKUP SELECTED?! PICK ONE AND SHOW IT WHO’S BOSS!",
        scooby_doo: "Like, pick a snack, man!"
      },
      sortOptions: {
        default: "Default Order, A → Z, Z → A",
        pirate: "Proper Order, Aft → Bow, Bow → Aft",
        hacker: "Sort: default | A-Z | Z-A",
        noir_detective: "Sort by: case order, alphabetical, reverse alphabetical",
        personal_trainer: "SORT BY: DEFAULT ORDER | ALPHABETICAL GAINZ ↑ | REVERSE ALPHABETICAL GAINZ ↓",
        scooby_doo: "Like, sort by: Normal, A-Z, Z-A"
      },
      searchPlaceholder: {
        default: "Search {mode}...",
        pirate: "Hunt for {mode}...",
        hacker: "grep {mode}...",
        noir_detective: "Find that {mode} file...",
        personal_trainer: "SEARCH YOUR {mode} ARSENAL... FIND THAT PERFECT WEAPON!",
        scooby_doo: "Search for {mode}..."
      },
      loading: {
        default: "Loading {mode}...",
        pirate: "Haulin' in {mode}...",
        hacker: "Loading {mode} payloads...",
        noir_detective: "Digging through {mode} files...",
        personal_trainer: "LOADING YOUR {mode} ARSENAL! GET READY TO CONQUER!",
        scooby_doo: "Like, loading {mode}..."
      },
      selectBackup: {
        default: "Select a backup to view {mode}",
        pirate: "Choose a chest to see yer {mode}",
        hacker: "Mount archive to view {mode} payloads",
        noir_detective: "Pick a case file to see {mode} dossiers",
        personal_trainer: "CHOOSE YOUR BACKUP WEAPON TO VIEW YOUR {mode} ARSENAL!",
        scooby_doo: "Like, pick a snack to see the {mode}"
      },
      noItems: {
        default: "No {mode} found in this backup.",
        pirate: "No {mode} be found in this here treasure chest.",
        hacker: "No {mode} payloads in this archive.",
        noir_detective: "No {mode} dossiers in this case file.",
        personal_trainer: "NO {mode} IN THIS BACKUP?! YOUR ARSENAL NEEDS MORE WEAPONS! BUILD IT UP!",
        scooby_doo: "Ruh-roh! No {mode} in this snack."
      },
      noMatchingItems: {
        default: "No matching items",
        pirate: "No matchin' booty",
        hacker: "grep: no results found",
        noir_detective: "Nothing matches the description",
        personal_trainer: "NO MATCHING WEAPONS FOUND! ADJUST YOUR SEARCH AND CONQUER!",
        scooby_doo: "Zoinks! No matches!"
      }
    },
    badges: {
      changed: {
        default: "Changed",
        pirate: "Altered!",
        hacker: "Diff",
        noir_detective: "Modified",
        personal_trainer: "LEVEL UP!",
        scooby_doo: "Jinkies!"
      },
      deleted: {
        default: "Deleted",
        pirate: "Gone Fathoms Deep!",
        hacker: "Deleted",
        noir_detective: "Gone",
        personal_trainer: "DESTROYED!",
        scooby_doo: "Zoinks!"
      }
    },
    buttons: {
      automations: {
        default: "Automations",
        pirate: "Sea Shanties",
        hacker: "Automation Daemons",
        noir_detective: "The Routine Files",
        personal_trainer: "YOUR AUTOMATION BEAST MODE!",
        scooby_doo: "Ghostly Gadgets"
      },
      scripts: {
        default: "Scripts",
        pirate: "Swashbuckles",
        hacker: "Shell Scripts",
        noir_detective: "The Action Files",
        personal_trainer: "YOUR SCRIPT DOMINATION!",
        scooby_doo: "Trap Plans"
      },
      lovelace: {
        default: "Lovelace",
        pirate: "Lovelace's Logbook",
        hacker: "The DOM",
        noir_detective: "The Layouts",
        personal_trainer: "YOUR DASHBOARD GAINS!",
        scooby_doo: "The Mystery Machine's Dashboard"
      },
      esphome: {
        default: "ESPHome",
        pirate: "ESPHome's Logbook",
        hacker: "The Devices",
        noir_detective: "The Gadgets",
        personal_trainer: "YOUR EQUIPMENT!",
        scooby_doo: "The Gang's Gadgets"
      },
      packages: {
        default: "Packages",
        pirate: "Ship's Cargo",
        hacker: "Package Modules",
        noir_detective: "The Ledgers",
        personal_trainer: "YOUR WORKOUT PLANS!",
        scooby_doo: "The Trap Blueprints"
      },
      settings: {
        default: "Settings",
        pirate: "Ship's Log",
        hacker: "config.sys",
        noir_detective: "The Control Panel",
        personal_trainer: "YOUR COMMAND CENTER!",
        scooby_doo: "The Gang's Plans"
      },
      restartNow: {
        default: "Restart Now",
        pirate: "Set Sail Anew!",
        hacker: "Reboot",
        noir_detective: "Wake Up Call",
        personal_trainer: "POWER RESTART NOW!",
        scooby_doo: "Let's split up, gang!"
      },
      testConnection: {
        default: "Test Connection",
        pirate: "Test yer Sextant!",
        hacker: "Ping",
        noir_detective: "Test the Line",
        personal_trainer: "TEST YOUR CONNECTION STRENGTH!",
        scooby_doo: "Is the coast clear?"
      },
      backupNow: {
        default: "Backup Now",
        pirate: "Stow Yer Booty Now!",
        hacker: "tar -czf",
        noir_detective: "File the Case",
        personal_trainer: "BACKUP YOUR GAINS NOW!",
        scooby_doo: "Let's grab some snacks!"
      },
      cancel: {
        default: "Cancel",
        pirate: "Belay That!",
        hacker: "Ctrl+C",
        noir_detective: "Never Mind",
        personal_trainer: "NO MERCY! CANCEL WEAKNESS!",
        scooby_doo: "Let's get out of here!"
      },
      save: {
        default: "Save",
        pirate: "Secure The Loot!",
        hacker: "Commit",
        noir_detective: "Lock It In",
        personal_trainer: "SAVE YOUR VICTORY!",
        scooby_doo: "Let's do it, Scoob!"
      },
      restore: {
        default: "Restore This Version",
        pirate: "Haul Back This Booty!",
        hacker: "Rollback",
        noir_detective: "Back to the Drawing Board",
        personal_trainer: "RESTORE YOUR POWER LEVEL!",
        scooby_doo: "Let's, like, go back in time!"
      },
      restoreLovelace: {
        default: "Restore",
        pirate: "Haul Back!",
        hacker: "Restore",
        noir_detective: "Bring Back",
        personal_trainer: "POWER RESTORE!",
        scooby_doo: "Restore the dashboard!"
      }
    },
    settings: {
      title: {
        default: "Settings",
        pirate: "Ship's Log",
        hacker: "Root Config",
        noir_detective: "The Control Room",
        personal_trainer: "YOUR WAR ROOM!",
        scooby_doo: "The Gang's Plans"
      },
      haUrlLabel: {
        default: "Home Assistant URL",
        pirate: "Home Assistant Chart",
        hacker: "Target IP / Endpoint",
        noir_detective: "The Dame's Address",
        personal_trainer: "YOUR HOME ASSISTANT BATTLEGROUND URL!",
        scooby_doo: "Mystery Machine's Location"
      },
      haTokenLabel: {
        default: "Long-Lived Access Token",
        pirate: "Long-Lasting Treasure Map",
        hacker: "Auth Token (key)",
        noir_detective: "The Client's Dough",
        personal_trainer: "YOUR ACCESS TOKEN OF POWER!",
        scooby_doo: "The Secret Password"
      },
      liveConfigPathLabel: {
        default: "Config Folder Path",
        pirate: "Yer Config Crate Path",
        hacker: "Config Dir",
        noir_detective: "The Config Case Path",
        personal_trainer: "YOUR CONFIG GYM FLOOR PATH!",
        scooby_doo: "Clue Folder Path"
      },
      backupFolderPathLabel: {
        default: "Backup Folder Path",
        pirate: "Yer Backup Chest Path",
        hacker: "Archive Dir",
        noir_detective: "The Evidence Locker",
        personal_trainer: "YOUR BACKUP VAULT OF POWER!",
        scooby_doo: "Snack Stash Path"
      },
      enableScheduledBackup: {
        default: "Enable Scheduled Backup",
        pirate: "Set Timed Booty Stowing",
        hacker: "Enable cronjob",
        noir_detective: "Enable Case Filing",
        personal_trainer: "ENABLE YOUR AUTOMATED GAINZ MACHINE!",
        scooby_doo: "Time for a Snack Break?"
      },
      frequencyLabel: {
        default: "Frequency",
        pirate: "How Oft?",
        hacker: "cron Schedule",
        noir_detective: "Filing Frequency",
        personal_trainer: "GAINZ INTERVAL!",
        scooby_doo: "How often?"
      },
      timeLabel: {
        default: "Time",
        pirate: "The Hour",
        hacker: "Time (24h)",
        noir_detective: "The Deadline",
        personal_trainer: "CRUSH TIME!",
        scooby_doo: "What time?"
      }
    },
    connectionTest: {
      testing: {
        default: "Testing connection...",
        pirate: "Testin' the seas...",
        hacker: "Pinging target...",
        noir_detective: "Testing the line...",
        personal_trainer: "TESTING YOUR CONNECTION STRENGTH!",
        scooby_doo: "Like, is anyone there...?"
      },
      connected: {
        default: "Connected to Home Assistant successfully.",
        pirate: "We be in, arrr!",
        hacker: "Ping successful. We're in.",
        noir_detective: "We're in. The line's good.",
        personal_trainer: "CONNECTION CRUSHED! YOU'RE CONNECTED TO HOME ASSISTANT POWER!",
        scooby_doo: "Jinkies! We're in!"
      },
      failed: {
        default: "Connection failed",
        pirate: "Couldn't find the rum barrel, matey!",
        hacker: "Ping failed. Check creds or firewall.",
        noir_detective: "The line's dead. Wrong number?",
        personal_trainer: "CONNECTION FAILED! FIX IT! NO EXCUSES! TEST AGAIN!",
        scooby_doo: "Ruh-roh! It's a ghost!"
      }
    },
    settingsMessages: {
      directoryNotFound: {
        default: "We couldn't find {path}. Create it or pick the correct folder.",
        pirate: "Can't chart a course to {path}, matey. Make the berth or choose another harbor.",
        hacker: "ENOENT on {path}. Create directory or update the pointer.",
        noir_detective: "{path}? Never heard of it. Make the joint or point me somewhere real.",
        personal_trainer: "{path} DOESN'T EXIST! BUILD THAT DIRECTORY OR CHOOSE ONE THAT'S READY TO WORK!",
        scooby_doo: "Ruh-roh! We can't find {path}. Let's, like, make it or pick another."
      },
      notDirectory: {
        default: "{path} isn't a folder. Choose a directory instead.",
        pirate: "{path} be no cargo hold. Pick a true chest, savvy?",
        hacker: "{path} is not a directory. Provide a proper folder path.",
        noir_detective: "{path}? That's not a back room—it's something else. Pick the real stash.",
        personal_trainer: "{path} ISN'T EVEN A FOLDER! GIVE ME A REAL DIRECTORY TO TRAIN IN!",
        scooby_doo: "Zoinks! {path} isn't a folder. We need a folder, man."
      },
      missingAutomations: {
        default: "We couldn't find automations.yaml in {path}. Point to your Home Assistant config folder.",
        pirate: "No automations.yaml stowed in {path}. Hoist yer true Home Assistant hold.",
        hacker: "automations.yaml missing under {path}. Aim at the HA config root.",
        noir_detective: "{path} is missing automations.yaml. Give me the real HQ.",
        personal_trainer: "NO AUTOMATIONS.YAML IN {path}! POINT ME TO YOUR REAL HOME ASSISTANT TRAINING GROUND!",
        scooby_doo: "Jinkies! We can't find automations.yaml in {path}. Let's look in the right place."
      },
      cannotAccess: {
        default: "We couldn't open {path}. Check permissions and try again.",
        pirate: "Couldn't pry open {path}. Check yer locks and give it another go.",
        hacker: "Access denied on {path}. Review permissions and retry.",
        noir_detective: "{path} won't let us in. Fix the locks and we'll talk.",
        personal_trainer: "PERMISSION DENIED ON {path}! ADJUST THOSE RIGHTS AND GET BACK IN THE FIGHT!",
        scooby_doo: "Ruh-roh! We can't get into {path}. Check for ghosts... or permissions."
      },
      backupDirUnwritable: {
        default: "We can't write to {path}. Update permissions or pick another backup folder.",
        pirate: "Can't stash yer booty in {path}. Fix the permissions or choose a new chest.",
        hacker: "Write access refused on {path}. Grant perms or select another directory.",
        noir_detective: "{path} won't take the deposit. Grease the skids or find a new location.",
        personal_trainer: "CAN'T WRITE TO {path}! GIVE IT THE RIGHT PERMISSIONS OR CHOOSE A STRONGER BACKUP SPOT!",
        scooby_doo: "Zoinks! We can't write to {path}. Let's, like, fix it or pick a new spot."
      },
      backupDirCreateFailed: {
        default: "We couldn't create a backup folder inside {parent}. Check permissions or free up space.",
        pirate: "Couldn't carve out a new hold in {parent}. Loosen the rules or clear the deck.",
        hacker: "mkdir failed under {parent}. Verify permissions or disk space.",
        noir_detective: "{parent} wouldn't give us room for a new folder. Fix the setup or find another joint.",
        personal_trainer: "COULDN'T CREATE A BACKUP SPOT IN {parent}! CLEAR SPACE OR GRANT PERMISSIONS AND GO AGAIN!",
        scooby_doo: "Jinkies! We couldn't make a snack stash in {parent}. Maybe it's full?"
      },
      unknownError: {
        default: "Something went wrong. Please try again.",
        pirate: "Somethin' went sideways. Give it another go, matey.",
        hacker: "Unexpected exception. Retry the operation.",
        noir_detective: "Something's off. Let's run it back and see what shakes loose.",
        personal_trainer: "UNKNOWN ERROR?! SHAKE IT OFF AND TRY AGAIN—YOU'VE GOT THIS!",
        scooby_doo: "Ruh-roh! Something went wrong. Let's try again, Scoob!"
      }
    },
    backupNow: {
      creating: {
        default: "Creating backup...",
        pirate: "Stowin' away yer booty...",
        hacker: "Compressing archive...",
        noir_detective: "Filing the case...",
        personal_trainer: "CREATING YOUR POWER BACKUP! HOLD NOTHING BACK!",
        scooby_doo: "Like, making a snack..."
      },
      successWithPath: {
        default: "Backup stored at {path}.",
        pirate: "Booty secured at {path}.",
        hacker: "Archive written to {path}.",
        noir_detective: "Case file stamped and filed at {path}.",
        personal_trainer: "BACKUP LOCKED IN AT {path}! FEEL THAT SECURITY!",
        scooby_doo: "Snack stored at {path}!"
      }
    },
    diffViewer: {
      noChanges: {
        default: "No changes between backup and live version.",
        pirate: "No changes 'tween yer stowed booty and yer live haul, captain.",
        hacker: "Diff: no changes. Files are identical.",
        noir_detective: "No differences in the files.",
        personal_trainer: "NO CHANGES?! YOUR SYSTEM IS ALREADY AT PEAK PERFORMANCE!",
        scooby_doo: "Like, nothing's changed, man."
      },
      compareVersions: {
        default: "Compare backup with current live version.",
        pirate: "Compare yer stowed booty with yer current live haul.",
        hacker: "Running diff on archive vs. live.",
        noir_detective: "Compare the old case with the current investigation.",
        personal_trainer: "COMPARE YOUR PAST GAINS WITH YOUR CURRENT POWER LEVEL!",
        scooby_doo: "Let's, like, compare the clues."
      },
      loadingLive: {
        default: "Loading live version...",
        pirate: "Haulin' in the live haul...",
        hacker: "Reading live file system...",
        noir_detective: "Checking the current case...",
        personal_trainer: "LOADING YOUR CURRENT POWER LEVEL! GET READY TO COMPARE!",
        scooby_doo: "Like, what's happening now...?"
      },
      itemDeleted: {
        default: "This item has been deleted. Restore it from this backup version when you are ready.",
        pirate: "This item be gone to Davy Jones' Locker. Ye can haul it back from this here booty, though.",
        hacker: "File not found (44). Restore from archive?",
        noir_detective: "This file's been shredded. Restore it from the backup case.",
        personal_trainer: "THIS WEAPON HAS BEEN DESTROYED! RESTORE IT AND REBUILD YOUR ARSENAL!",
        scooby_doo: "Zoinks! It's gone! Let's, like, bring it back."
      },
      fileDeleted: {
        default: "This file has been deleted. Restore it from this backup version when you are ready.",
        pirate: "This log entry be gone to Davy Jones' Locker. Ye can haul it back from this here booty, though.",
        hacker: "File deleted. Restore from archive?",
        noir_detective: "This file's been burned. Restore it from the backup cabinet.",
        personal_trainer: "THIS FILE HAS BEEN OBLITERATED! RESTORE IT AND DOMINATE ONCE MORE!",
        scooby_doo: "Ruh-roh! The file is gone! Let's, like, restore it."
      },
      currentVersion: {
        default: "Current Version",
        pirate: "Current Haul",
        hacker: "Live System",
        noir_detective: "Live Case",
        personal_trainer: "CURRENT POWER LEVEL",
        scooby_doo: "Like, right now."
      }
    },
    lovelace: {
      title: {
        default: "Lovelace",
        pirate: "Lovelace's Logbook",
        hacker: "UI Config",
        noir_detective: "The Layout Files",
        personal_trainer: "YOUR STATS DASHBOARD!",
        scooby_doo: "The Mystery Machine's Dashboard"
      },
      searchPlaceholder: {
        default: "Search lovelace files...",
        pirate: "Scour for Lovelace's entries...",
        hacker: "grep UI files...",
        noir_detective: "Hunt for layout files...",
        personal_trainer: "SEARCH YOUR DASHBOARD GAINS... FIND YOUR PERFECT STATS!",
        scooby_doo: "Search for clues..."
      },
      loading: {
        default: "Loading Lovelace files...",
        pirate: "Haulin' in Lovelace's Logs...",
        hacker: "Loading UI modules...",
        noir_detective: "Digging through layout files...",
        personal_trainer: "LOADING YOUR STATS! PREPARE FOR PEAK PERFORMANCE!",
        scooby_doo: "Like, looking for clues..."
      },
      selectBackup: {
        default: "Select a backup to view Lovelace files",
        pirate: "Pick a chest to see Lovelace's entries",
        hacker: "Mount archive to view UI modules",
        noir_detective: "Pick a case file to see layout files",
        personal_trainer: "CHOOSE YOUR BACKUP TO VIEW YOUR DASHBOARD STATS!",
        scooby_doo: "Pick a snack to see the clues."
      },
      noFiles: {
        default: "No Lovelace files found in this backup",
        pirate: "No Lovelace entries be found in this here treasure chest",
        hacker: "No UI modules in this archive.",
        noir_detective: "No layout files found in this backup",
        personal_trainer: "NO DASHBOARD STATS IN THIS BACKUP?! GET TO WORK!",
        scooby_doo: "Ruh-roh! No clues in this snack."
      }
    },
    esphome: {
      title: {
        default: "ESPHome",
        pirate: "ESPHome's Logbook",
        hacker: "Device Configs",
        noir_detective: "The Gadget Files",
        personal_trainer: "YOUR EQUIPMENT ROSTER!",
        scooby_doo: "The Gang's Gadgets"
      },
      searchPlaceholder: {
        default: "Search ESPHome files...",
        pirate: "Scour for ESPHome's entries...",
        hacker: "grep device files...",
        noir_detective: "Hunt for gadget files...",
        personal_trainer: "SEARCH YOUR EQUIPMENT... FIND YOUR PERFECT DEVICE!",
        scooby_doo: "Search for the gang's gadgets..."
      },
      loading: {
        default: "Loading ESPHome files...",
        pirate: "Haulin' in ESPHome's Logs...",
        hacker: "Loading device modules...",
        noir_detective: "Digging through gadget files...",
        personal_trainer: "LOADING YOUR EQUIPMENT ROSTER! PREPARE FOR ACTION!",
        scooby_doo: "Like, looking for gadgets..."
      },
      selectBackup: {
        default: "Select a backup to view ESPHome files",
        pirate: "Pick a chest to see ESPHome's entries",
        hacker: "Mount archive to view ESPHome modules",
        noir_detective: "Pick a case file to see gadget files",
        personal_trainer: "CHOOSE YOUR BACKUP TO VIEW YOUR EQUIPMENT!",
        scooby_doo: "Pick a snack to see the gadgets."
      },
      noFiles: {
        default: "No ESPHome files found in this backup",
        pirate: "No ESPHome entries be found in this here treasure chest",
        hacker: "No device modules in this archive.",
        noir_detective: "No gadget files in this case file",
        personal_trainer: "NO EQUIPMENT IN THIS BACKUP?! BUILD YOUR ARSENAL NOW!",
        scooby_doo: "Ruh-roh! No gadgets in this snack."
      },
      disabled: {
        default: "ESPHome backups are disabled. Enable them in Settings to view files.",
        pirate: "ESPHome backups be sleeping. Flip the switch in Settings to see the logs.",
        hacker: "ESPHome module disabled. Toggle it on in Settings to inspect payloads.",
        noir_detective: "ESPHome's off the books. Switch it back on in Settings if you want the files.",
        personal_trainer: "ESPHOME BACKUPS ARE OFF! HIT THAT SETTINGS SWITCH AND BRING THE POWER BACK!",
        scooby_doo: "Zoinks! ESPHome backups are, like, turned off. Turn them on in the Gang's Plans."
      }
    },
    packages: {
      title: {
        default: "Packages",
        pirate: "Ship's Cargo Log",
        hacker: "Package Modules",
        noir_detective: "The Ledgers",
        personal_trainer: "YOUR CUSTOM ROUTINES!",
        scooby_doo: "The Trap Blueprints"
      },
      searchPlaceholder: {
        default: "Search Packages files...",
        pirate: "Scour for Packages entries...",
        hacker: "grep package files...",
        noir_detective: "Hunt for ledger files...",
        personal_trainer: "SEARCH YOUR ROUTINES... FIND YOUR PERFECT WORKOUT!",
        scooby_doo: "Search for trap blueprints..."
      },
      loading: {
        default: "Loading Packages files...",
        pirate: "Haulin' in Packages...",
        hacker: "Loading package modules...",
        noir_detective: "Digging through the ledgers...",
        personal_trainer: "LOADING YOUR CUSTOM ROUTINES! PREPARE FOR CONFIGURATION DOMINATION!",
        scooby_doo: "Like, looking for trap blueprints..."
      },
      selectBackup: {
        default: "Select a backup to view Packages files",
        pirate: "Pick a chest to see Packages entries",
        hacker: "Mount archive to view package modules",
        noir_detective: "Pick a case file to see the ledgers",
        personal_trainer: "CHOOSE YOUR BACKUP TO VIEW YOUR CUSTOM ROUTINES!",
        scooby_doo: "Pick a snack to see the trap blueprints."
      },
      noFiles: {
        default: "No Packages files found in this backup",
        pirate: "No Packages entries be found in this here treasure chest",
        hacker: "No package modules in this archive.",
        noir_detective: "No ledgers in this case file",
        personal_trainer: "NO ROUTINES IN THIS BACKUP?! BUILD YOUR WORKOUTS NOW!",
        scooby_doo: "Ruh-roh! No trap blueprints in this snack."
      },
      disabled: {
        default: "Packages backups are disabled. Enable them in Settings to view files.",
        pirate: "Packages backups be sleeping. Flip the switch in Settings to see the logs.",
        hacker: "Packages module disabled. Toggle it on in Settings to inspect payloads.",
        noir_detective: "Packages are off the books. Switch it back on in Settings if you want the files.",
        personal_trainer: "PACKAGES BACKUPS ARE OFF! HIT THAT SETTINGS SWITCH AND BRING THE POWER BACK!",
        scooby_doo: "Zoinks! Packages backups are, like, turned off. Turn them on in the Gang's Plans."
      }
    },
    placeholders: {
      search: {
        default: "Search {mode}...",
        pirate: "Hunt for {mode}...",
        hacker: "grep {mode}...",
        noir_detective: "Find that {mode} file...",
        personal_trainer: "SEARCH YOUR {mode} ARSENAL... FIND THAT PERFECT WEAPON!",
        scooby_doo: "Search for {mode}..."
      },
      managedByHA: {
        default: "Automatically managed by Home Assistant",
        pirate: "Managed by the Home Assistant fleet",
        hacker: "Managed by HA core",
        noir_detective: "Handled by the main office",
        personal_trainer: "HOME ASSISTANT'S GOT THIS!",
        scooby_doo: "Like, Home Assistant is on the case!"
      }
    }
  }
};