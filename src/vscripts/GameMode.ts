import { reloadable } from "./lib/tstl-utils";
import { modifier_panic } from "./modifiers/modifier_panic";

const heroSelectionTime = 20;
let gameSeed: number;
let winConditions: [];

// Challenge tracking interfaces
interface ChallengeState {
    completed: boolean;
    completedBy: DotaTeam | null;
    completedAt: number;
    progress: number;
    maxProgress: number;
}

interface PlayerStats {
    lastHits: number;
    denies: number;
    treesCut: number;
    heroDamage: number;
    stunDuration: number;
    level: number;
    dustPurchased: number;
    kills: number;
    lastKillTime: number;
}

// Challenge metadata with human-readable names and descriptions
const challengeMetadata: { [key: string]: { name: string; description: string } } = {
    dust200: { name: "Dust Collector", description: "Buy 200 Dust of Appearance" },
    lotusCombo: { name: "Lotus Master", description: "Combine a Lotus Orb" },
    ultimateOrb: { name: "Ultimate Power", description: "Purchase an Ultimate Orb" },
    fountainDeath: { name: "Fountain Dive", description: "Die to the enemy fountain" },
    doubleKill: { name: "Double Trouble", description: "Get a double kill" },
    cancelChannel: { name: "Interrupt", description: "Cancel a channeling ability" },
    useVeil: { name: "Veil User", description: "Use Veil of Discord" },
    castUltFirst: { name: "Ultimate First", description: "Be first to cast an ultimate" },
    wandCharges20: { name: "Charged Up", description: "Use Magic Wand with 20 charges" },
    lastHits150: { name: "Farming King", description: "Get 150 last hits" },
    denies20: { name: "Deny Master", description: "Get 20 denies" },
    heal1000: { name: "Healer", description: "Heal 1000 HP" },
    maxAttackSpeed: { name: "Speed Demon", description: "Reach maximum attack speed" },
    highestLevel: { name: "Level Leader", description: "Have the highest ending level" },
    armor30: { name: "Tank", description: "Reach at least 30 armor" },
    mostStunDuration: { name: "Stunner", description: "Deal the most stun duration" },
    lowestHeroDamage: { name: "Pacifist", description: "Deal the lowest hero damage" },
    killTower: { name: "Tower Destroyer", description: "Kill a tower" },
    tormentorKill: { name: "Tormentor Slayer", description: "Kill a Tormentor" },
    roshanKill: { name: "Roshan Slayer", description: "Kill Roshan" },
    trees100: { name: "Lumberjack", description: "Destroy 100 trees" },
    deward: { name: "Dewarder", description: "Kill an enemy ward" },
    bottleArcane: { name: "Arcane Bottler", description: "Bottle an Arcane rune" }
};

// Challenge tracking state
const challenges: { [key: string]: ChallengeState } = {
    dust200: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 200 },
    lotusCombo: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    ultimateOrb: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    fountainDeath: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    doubleKill: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    cancelChannel: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    useVeil: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    castUltFirst: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    wandCharges20: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    lastHits150: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 150 },
    denies20: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 20 },
    heal1000: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1000 },
    maxAttackSpeed: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    highestLevel: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    armor30: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    mostStunDuration: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    lowestHeroDamage: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    killTower: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    tormentorKill: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    roshanKill: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    trees100: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 100 },
    deward: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 },
    bottleArcane: { completed: false, completedBy: null, completedAt: 0, progress: 0, maxProgress: 1 }
};

// Player stats tracking
const playerStats: { [playerId: number]: PlayerStats } = {};

// Team stats tracking
const teamStats: { [team: number]: { [stat: string]: number } } = {
    [DotaTeam.GOODGUYS]: { dustPurchased: 0, treesCut: 0 },
    [DotaTeam.BADGUYS]: { dustPurchased: 0, treesCut: 0 }
};

// Challenge helper functions
function initializePlayerStats(playerId: PlayerID): void {
    if (!playerStats[playerId]) {
        playerStats[playerId] = {
            lastHits: 0,
            denies: 0,
            treesCut: 0,
            heroDamage: 0,
            stunDuration: 0,
            level: 1,
            dustPurchased: 0,
            kills: 0,
            lastKillTime: 0
        };
    }
}

function completeChallenge(challengeKey: string, team: DotaTeam, message: string): void {
    if (!challenges[challengeKey].completed) {
        challenges[challengeKey].completed = true;
        challenges[challengeKey].completedBy = team;
        challenges[challengeKey].completedAt = GameRules.GetGameTime();
        
        const teamName = team === DotaTeam.GOODGUYS ? "Radiant" : "Dire";
        GameRules.SendCustomMessage(`${teamName} completed: ${message}`, 0, 0);
        
        // Broadcast challenge completion to all players
        CustomGameEventManager.Send_ServerToAllClients("challenge_completed", {
            challengeKey: challengeKey,
            challengeName: challengeMetadata[challengeKey].name,
            team: team,
            teamName: teamName
        });
        
        // Broadcast updated progress to all players
        if (GameRules.Addon) {
            GameRules.Addon.BroadcastChallengeProgress();
        }
        
        // Check if this should end the game (you can customize this logic)
        // GameRules.SetGameWinner(team);
    }
}

function isUltimateAbility(abilityName: string): boolean {
    // Common ultimate ability patterns
    const ultPatterns = ["_ultimate", "_ult", "_4"];
    return ultPatterns.some(pattern => abilityName.includes(pattern)) || 
           abilityName.endsWith("_r") || 
           abilityName.includes("invoker_invoke");
}

function getStunDuration(abilityName: string): number {
    // Simplified stun duration lookup - you can expand this
    const stunDurations: { [key: string]: number } = {
        "storm_bolt": 2.5,
        "magic_missile": 1.75,
        "wraithfire_blast": 2.0,
        "chaos_bolt": 2.0,
        // Add more abilities as needed
    };
    return stunDurations[abilityName] || 0;
}

declare global {
    interface CDOTAGameRules {
        Addon: GameMode;
    }
}

@reloadable
export class GameMode {
    public static Precache(this: void, context: CScriptPrecacheContext) {
        PrecacheResource("particle", "particles/units/heroes/hero_meepo/meepo_earthbind_projectile_fx.vpcf", context);
        PrecacheResource("soundfile", "soundevents/game_sounds_heroes/game_sounds_meepo.vsndevts", context);
    }

    public static Activate(this: void) {
        // When the addon activates, create a new instance of this GameMode class.
        GameRules.Addon = new GameMode();
    }

    constructor() {
        this.configure();

        // Register event listeners for dota engine events
        ListenToGameEvent("game_rules_state_change", () => this.OnStateChange(), undefined);
        ListenToGameEvent("npc_spawned", event => this.OnNpcSpawned(event), undefined);
        
        // Challenge tracking event listeners
        ListenToGameEvent("dota_item_purchased", (event) => this.OnItemPurchased(event), undefined);
        ListenToGameEvent("dota_item_combined", (event) => this.OnItemCombined(event), undefined);
        ListenToGameEvent("dota_item_used", (event) => this.OnItemUsed(event), undefined);
        ListenToGameEvent("dota_player_killed", (event) => this.OnPlayerKilled(event), undefined);
        ListenToGameEvent("dota_player_used_ability", (event) => this.OnPlayerUsedAbility(event), undefined);
        ListenToGameEvent("dota_ability_channel_finished", (event) => this.OnAbilityChannelFinished(event), undefined);
        ListenToGameEvent("last_hit", (event) => this.OnLastHit(event), undefined);
        ListenToGameEvent("dota_tower_kill", (event) => this.OnTowerKill(event), undefined);
        ListenToGameEvent("dota_roshan_kill", (event) => this.OnRoshanKill(event), undefined);
        ListenToGameEvent("dota_miniboss_kill", (event) => this.OnMinibossKill(event), undefined);
        ListenToGameEvent("tree_cut", (event) => this.OnTreeCut(event), undefined);
        ListenToGameEvent("dota_ward_killed", (event) => this.OnWardKilled(event), undefined);
        ListenToGameEvent("dota_rune_pickup", (event) => this.OnRunePickup(event), undefined);
        ListenToGameEvent("dota_player_gained_level", (event) => this.OnPlayerGainedLevel(event), undefined);
        ListenToGameEvent("dota_combatlog", (event) => this.OnCombatLog(event), undefined);

        // Register event listeners for events from the UI
        CustomGameEventManager.RegisterListener("ui_panel_closed", (_, data) => {
            print(`Player ${data.PlayerID} has closed their UI panel.`);

            // Respond by sending back an example event
            const player = PlayerResource.GetPlayer(data.PlayerID)!;
            CustomGameEventManager.Send_ServerToPlayer(player, "example_event", {
                myNumber: 42,
                myBoolean: true,
                myString: "Hello!",
                myArrayOfNumbers: [1.414, 2.718, 3.142]
            });

            // Also apply the panic modifier to the sending player's hero
            const hero = player.GetAssignedHero();
            if (hero != undefined) { // Hero didn't spawn yet or dead
                hero.AddNewModifier(hero, undefined, modifier_panic.name, { duration: 5 });
            }
        });

        // Register challenge progress event listeners
        CustomGameEventManager.RegisterListener("challenge_progress_request", (_, data) => {
            const player = PlayerResource.GetPlayer(data.PlayerID)!;
            this.SendChallengeProgressToPlayer(player);
        });
    }

    private configure(): void {
        GameRules.SetCustomGameTeamMaxPlayers(DotaTeam.GOODGUYS, 3);
        GameRules.SetCustomGameTeamMaxPlayers(DotaTeam.BADGUYS, 3);

        GameRules.SetShowcaseTime(20);
        GameRules.SetHeroSelectionTime(heroSelectionTime);
        
        // Configure hero selection
        GameRules.SetSameHeroSelectionEnabled(true); // Allow both teams to pick same heroes
        GameRules.GetGameModeEntity().SetCustomGameForceHero("npc_dota_hero_magnataur"); // Default to Magnus
        
        // Set up hero selection restrictions
        this.SetupHeroSelection();
    }

    private SetupHeroSelection(): void {
        // List of allowed heroes
        const allowedHeroes = [
            "npc_dota_hero_magnataur",  // Magnus
            "npc_dota_hero_lina",       // Lina
            "npc_dota_hero_leshrac"     // Leshrac
        ];

        // Use a simpler approach - just set the allowed heroes
        // The game mode will handle the restrictions
        print("Hero selection restricted to Magnus, Lina, and Leshrac");
    }

    public OnStateChange(): void {
        const state = GameRules.State_Get();

        // Add 4 bots to lobby in tools
        if (IsInToolsMode() && state == GameState.CUSTOM_GAME_SETUP) {
            for (let i = 0; i < 3; i++) {
                Tutorial.AddBot("npc_dota_hero_lina", "", "", false);
            }
        }

        if (state === GameState.CUSTOM_GAME_SETUP) {
            // Automatically skip setup in tools
            if (IsInToolsMode()) {
                Timers.CreateTimer(3, () => {
                    GameRules.FinishCustomGameSetup();
                });
            }
        }

        // Start game once pregame hits
        if (state === GameState.PRE_GAME) {
            gameSeed = RandomInt(0,50);
            Timers.CreateTimer(0.2, () => this.StartGame());
        }
    }

    private StartGame(): void {
        print("Game starting!");
        
        GameRules.SendCustomMessage(gameSeed.toString(), 1,1);

        // Initialize all players' stats
        for (let i = 0; i < PlayerResource.GetPlayerCount(); i++) {
            if (PlayerResource.IsValidPlayer(i)) {
                initializePlayerStats(i);
            }
        }

        // Start periodic stat checking for challenges that need continuous monitoring
        this.StartPeriodicChecks();
    }

    private StartPeriodicChecks(): void {
        // Check armor, attack speed, and healing every 5 seconds
        Timers.CreateTimer(5, () => {
            this.CheckPeriodicStats();
            return 5; // Repeat every 5 seconds
        });
    }

    private CheckPeriodicStats(): void {
        for (let i = 0; i < PlayerResource.GetPlayerCount(); i++) {
            if (PlayerResource.IsValidPlayer(i)) {
                const player = PlayerResource.GetPlayer(i);
                if (player) {
                    const hero = player.GetAssignedHero();
                    if (hero && hero.IsAlive()) {
                        const playerId = i;
                        const playerTeam = PlayerResource.GetTeam(playerId);
                        
                        // Check armor challenge
                        const armor = hero.GetPhysicalArmorValue(false);
                        if (armor >= 30 && !challenges.armor30.completed) {
                            completeChallenge("armor30", playerTeam, "Reach 30 Armor");
                        }
                        
                        // Check attack speed challenge (simplified - max attack speed is around 600)
                        const attackSpeed = hero.GetAttacksPerSecond(false);
                        if (attackSpeed >= 2.5 && !challenges.maxAttackSpeed.completed) { // 2.5 attacks per second is very high
                            completeChallenge("maxAttackSpeed", playerTeam, "Max Attack Speed");
                        }
                    }
                }
            }
        }
    }

    // Called on script_reload
    public Reload() {
        print("Script reloaded!");
    }

    private OnNpcSpawned(event: NpcSpawnedEvent) {
        // After a hero unit spawns, apply modifier_panic for 8 seconds
    }

    // Challenge tracking event handlers
    private OnItemPurchased(event: DotaItemPurchasedEvent): void {
        const playerId = event.PlayerID;
        const itemName = event.itemname;
        const playerTeam = PlayerResource.GetTeam(playerId);
        
        initializePlayerStats(playerId);
        
        // Track dust purchases
        if (itemName === "item_dust") {
            teamStats[playerTeam].dustPurchased++;
            challenges.dust200.progress = teamStats[playerTeam].dustPurchased;
            
            if (teamStats[playerTeam].dustPurchased >= 200) {
                completeChallenge("dust200", playerTeam, "Buy 200 Dust");
            }
        }
        
        // Track ultimate orb purchase
        if (itemName === "item_ultimate_orb") {
            completeChallenge("ultimateOrb", playerTeam, "Purchase Ultimate Orb");
        }
        
        // Keep original fluffy hat logic for testing
        if (itemName === "item_fluffy_hat") { 
            GameRules.SendCustomMessage("congrats", 1, 1);
            GameRules.SetGameWinner(playerTeam);
        }
    }

    private OnItemCombined(event: DotaItemCombinedEvent): void {
        const playerId = event.PlayerID;
        const itemName = event.itemname;
        const playerTeam = PlayerResource.GetTeam(playerId);
        
        if (itemName === "item_lotus_orb") {
            completeChallenge("lotusCombo", playerTeam, "Combine a Lotus Orb");
        }
    }

    private OnItemUsed(event: DotaItemUsedEvent): void {
        const playerId = event.PlayerID;
        const itemName = event.itemname;
        const playerTeam = PlayerResource.GetTeam(playerId);
        
        if (itemName === "item_veil_of_discord") {
            completeChallenge("useVeil", playerTeam, "Use Veil of Discord");
        }
    }

    private OnPlayerKilled(event: DotaPlayerKilledEvent): void {
        const victimId = event.PlayerID;
        const playerTeam = PlayerResource.GetTeam(victimId);
        
        initializePlayerStats(victimId);
        
        // Track double kills (simplified logic)
        const currentTime = GameRules.GetGameTime();
        for (let i = 0; i < PlayerResource.GetPlayerCount(); i++) {
            if (PlayerResource.IsValidPlayer(i)) {
                const stats = playerStats[i];
                if (stats && currentTime - stats.lastKillTime < 18) {
                    stats.kills++;
                    if (stats.kills >= 2) {
                        const killerTeam = PlayerResource.GetTeam(i);
                        completeChallenge("doubleKill", killerTeam, "Double Kill");
                    }
                }
                if (stats) {
                    stats.lastKillTime = currentTime;
                }
            }
        }
    }

    private OnPlayerUsedAbility(event: DotaPlayerUsedAbilityEvent): void {
        const playerId = event.PlayerID;
        const abilityName = event.abilityname;
        const playerTeam = PlayerResource.GetTeam(playerId);
        
        initializePlayerStats(playerId);
        
        // Check for first ultimate cast
        if (isUltimateAbility(abilityName)) {
            completeChallenge("castUltFirst", playerTeam, "Cast Ultimate First");
        }
        
        // Track stun duration
        const stunDuration = getStunDuration(abilityName);
        if (stunDuration > 0) {
            playerStats[playerId].stunDuration += stunDuration;
        }
    }

    private OnAbilityChannelFinished(event: DotaAbilityChannelFinishedEvent): void {
        const casterEntity = EntIndexToHScript(event.caster_entindex) as CDOTA_BaseNPC_Hero;
        if (casterEntity && casterEntity.IsRealHero && casterEntity.IsRealHero()) {
            const playerId = casterEntity.GetPlayerID();
            const playerTeam = PlayerResource.GetTeam(playerId);
            
            if (event.interrupted === 1) {
                completeChallenge("cancelChannel", playerTeam, "Cancel a Channel");
            }
        }
    }

    private OnLastHit(event: LastHitEvent): void {
        const playerId = event.PlayerID;
        const playerTeam = PlayerResource.GetTeam(playerId);
        
        initializePlayerStats(playerId);
        
        if (event.HeroKill === 0) {
            playerStats[playerId].lastHits++;
            challenges.lastHits150.progress = Math.max(challenges.lastHits150.progress, playerStats[playerId].lastHits);
            
            if (playerStats[playerId].lastHits >= 150) {
                completeChallenge("lastHits150", playerTeam, "150 Last Hits");
            }
        }
    }

    private OnTowerKill(event: DotaTowerKillEvent): void {
        const killerEntity = EntIndexToHScript(event.killer_userid) as CDOTA_BaseNPC_Hero;
        if (killerEntity && killerEntity.IsRealHero && killerEntity.IsRealHero()) {
            const playerId = killerEntity.GetPlayerID();
            const killerTeam = PlayerResource.GetTeam(playerId);
            completeChallenge("killTower", killerTeam, "Kill a Tower");
        }
    }

    private OnRoshanKill(event: DotaRoshanKillEvent): void {
        completeChallenge("roshanKill", event.teamnumber, "Kill Roshan");
    }

    private OnMinibossKill(event: DotaMinibossKillEvent): void {
        completeChallenge("tormentorKill", event.teamnumber, "Kill Tormentor");
    }

    private OnTreeCut(event: TreeCutEvent): void {
        teamStats[DotaTeam.GOODGUYS].treesCut++;
        teamStats[DotaTeam.BADGUYS].treesCut++;
        
        challenges.trees100.progress = Math.max(teamStats[DotaTeam.GOODGUYS].treesCut, teamStats[DotaTeam.BADGUYS].treesCut);
        
        if (teamStats[DotaTeam.GOODGUYS].treesCut >= 100) {
            completeChallenge("trees100", DotaTeam.GOODGUYS, "Destroy 100 Trees");
        }
        if (teamStats[DotaTeam.BADGUYS].treesCut >= 100) {
            completeChallenge("trees100", DotaTeam.BADGUYS, "Destroy 100 Trees");
        }
    }

    private OnWardKilled(event: DotaWardKilledEvent): void {
        const killerEntity = EntIndexToHScript(event.userid) as CDOTA_BaseNPC_Hero;
        if (killerEntity && killerEntity.IsRealHero && killerEntity.IsRealHero()) {
            const playerId = killerEntity.GetPlayerID();
            const killerTeam = PlayerResource.GetTeam(playerId);
            completeChallenge("deward", killerTeam, "Deward");
        }
    }

    private OnRunePickup(event: DotaRunePickupEvent): void {
        const playerEntity = EntIndexToHScript(event.userid) as CDOTA_BaseNPC_Hero;
        if (playerEntity && playerEntity.IsRealHero && playerEntity.IsRealHero()) {
            const playerId = playerEntity.GetPlayerID();
            const playerTeam = PlayerResource.GetTeam(playerId);
            
            if (event.rune === 6) {
                const player = PlayerResource.GetPlayer(playerId);
                if (player) {
                    const hero = player.GetAssignedHero();
                    if (hero) {
                        for (let i = 0; i < 6; i++) {
                            const item = hero.GetItemInSlot(i);
                            if (item && item.GetAbilityName() === "item_bottle") {
                                completeChallenge("bottleArcane", playerTeam, "Bottle Arcane Rune");
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    private OnPlayerGainedLevel(event: DotaPlayerGainedLevelEvent): void {
        const playerId = event.PlayerID;
        const level = event.level;
        
        initializePlayerStats(playerId);
        playerStats[playerId].level = level;
        
        challenges.highestLevel.progress = Math.max(challenges.highestLevel.progress, level);
    }

    private OnCombatLog(event: DotaCombatlogEvent): void {
        // Track hero damage for "lowest hero damage" challenge
        if (event.targethero === 1 && event.attackerhero === 1) {
            // You'd need to implement proper damage tracking here
        }
    }

    // Send challenge progress data to a specific player
    public SendChallengeProgressToPlayer(player: any): void {
        const challengeData: { [key: string]: any } = {};
        
        for (const [key, challenge] of Object.entries(challenges)) {
            const metadata = challengeMetadata[key];
            challengeData[key] = {
                name: metadata.name,
                description: metadata.description,
                progress: challenge.progress,
                maxProgress: challenge.maxProgress,
                completed: challenge.completed,
                completedBy: challenge.completedBy || -1,
                completedAt: challenge.completedAt
            };
        }

        CustomGameEventManager.Send_ServerToPlayer(player, "challenge_progress_update", {
            challenges: challengeData
        });
    }

    // Broadcast challenge progress to all players
    public BroadcastChallengeProgress(): void {
        const challengeData: { [key: string]: any } = {};
        
        for (const [key, challenge] of Object.entries(challenges)) {
            const metadata = challengeMetadata[key];
            challengeData[key] = {
                name: metadata.name,
                description: metadata.description,
                progress: challenge.progress,
                maxProgress: challenge.maxProgress,
                completed: challenge.completed,
                completedBy: challenge.completedBy || -1,
                completedAt: challenge.completedAt
            };
        }

        CustomGameEventManager.Send_ServerToAllClients("challenge_progress_update", {
            challenges: challengeData
        });
    }

    // Utility method to display challenge progress (for debugging/testing)
    public DisplayChallengeProgress(): void {
        print("=== CHALLENGE PROGRESS ===");
        for (const [key, challenge] of Object.entries(challenges)) {
            const status = challenge.completed ? "COMPLETED" : `${challenge.progress}/${challenge.maxProgress}`;
            const completedBy = challenge.completed ? ` by ${challenge.completedBy === DotaTeam.GOODGUYS ? "Radiant" : "Dire"}` : "";
            print(`${key}: ${status}${completedBy}`);
        }
        print("========================");
    }

    // Method to manually trigger challenge progress display (can be called from console)
    public ShowProgress(): void {
        this.DisplayChallengeProgress();
    }
}
