function startGame() {
    window.doWork = new Worker("interval.js");
    window.doWork.onmessage = function(event) {
        if (event.data === "interval.start") {
            tick();
        }
    };
    load();
    setScreenSize();
}

function cheat() {
    if (gameSpeed === 1) gameSpeed = 20;
    else gameSpeed = 1;
}

function cheatBonus()
{
    totalOfflineMs = 1000000000000000;
}

function cheatSurvey()
{
    for(i= 0; i<9; i++)
    {
        varName = "SurveyZ" + i
        towns[i][`exp${varName}`] = 505000;
        view.updateProgressAction({name: varName, town: towns[i]});
    }
}

function cheatProgress()
{
    for (const action of totalActionList)
    {
        if (action.type == "progress")
        {
            towns[action.townNum][`exp${action.varName}`] = 505000;
            view.updateProgressAction({name: action.varName, town: towns[action.townNum]});
        }
    }
    stonesUsed = {1:250, 3:250, 5:250, 6:250};
}

function cheatTalent(stat, targetTalentLevel)
{
    if (stat === "all" || stat === "All")
        for (const stat in stats)
        stats[stat].talent = getExpOfLevel(targetTalentLevel);
    else stats[stat].talent = getExpOfLevel(targetTalentLevel);
    view.updateStats();
}

function cheatSoulstone(stat, targetSS)
{
    if (stat === "all" || stat === "All")
        for (const stat in stats)
            stats[stat].soulstone = targetSS;
    else stats[stat].soulstone = targetSS;
    view.updateSoulstones();
}

function cheatSkill(skill, targetSkillLevel)
{
    if (skill === "all" || skill === "All")
        for (const skill in skills)
            skills[skill].exp = getExpOfLevel(targetSkillLevel);
    else skills[skill].exp = getExpOfLevel(targetSkillLevel);
    view.updateSkills();
}


let mainTickLoop;
const defaultSaveName = "idleLoops1";
const challengeSaveName = "idleLoopsChallenge";
let saveName = defaultSaveName;

// this is to hide the cheat button if you aren't supposed to cheat
if (window.location.href.includes("http://127.0.0.2:8080")) document.getElementById("cheat").style.display = "inline-block";

const timeNeededInitial = 5 * 50;
// eslint-disable-next-line prefer-const
let timer = timeNeededInitial;
// eslint-disable-next-line prefer-const
let timeNeeded = timeNeededInitial;
// eslint-disable-next-line prefer-const
let stop = false;
const view = new View();
const actions = new Actions();
const towns = [];
// eslint-disable-next-line prefer-const
let curTown = 0;

const statList = ["Dex", "Str", "Con", "Spd", "Per", "Cha", "Int", "Luck", "Soul"];
const stats = {};
let totalTalent = 0;
// eslint-disable-next-line prefer-const
let shouldRestart = true;

// eslint-disable-next-line prefer-const
let resources = {
    gold: 0,
    reputation: 0,
    herbs: 0,
    hide: 0,
    potions: 0,
    teamMembers: 0,
    armor: 0,
    blood: 0,
    artifacts: 0,
    favors: 0,
    enchantments: 0,
    houses: 0,
    pylons: 0,
    zombie: 0,
    map: 0,
    completedMap: 0,
    heart: 0,
    power: 0,
    glasses: false,
    supplies: false,
    pickaxe: false,
    loopingPotion: false,
    citizenship: false,
    pegasus: false,
    key: false,
    stone: false
};
let hearts = [];
const resourcesTemplate = copyObject(resources);
//Temp variables
// eslint-disable-next-line prefer-const
let guild = "";
let escapeStarted = false;
let portalUsed = false;
let stoneLoc = 0;

let curLoadout = 0;
let loadouts;
let loadoutnames;
//let loadoutnames = ["1", "2", "3", "4", "5"];
const skillList = ["Combat", "Magic", "Practical", "Alchemy", "Crafting", "Dark", "Chronomancy", "Pyromancy", "Restoration", "Spatiomancy", "Mercantilism", "Divine", "Commune", "Wunderkind", "Gluttony", "Thievery", "Leadership", "Assassin"];
const skills = {};
const buffList = ["Ritual", "Imbuement", "Imbuement2", "Feast", "Aspirant", "Heroism", "Imbuement3"];
const dungeonFloors = [6, 9, 20];
const trialFloors = [50, 100, 7, 1000, 25];
const buffHardCaps = {
    Ritual: 666,
    Imbuement: 500,
    Imbuement2: 500,
    Imbuement3: 7,
    Feast: 100,
    Aspirant: 20,
    Heroism: 50
};
const buffCaps = {
    Ritual: 666,
    Imbuement: 500,
    Imbuement2: 500,
    Imbuement3: 7,
    Feast: 100,
    Aspirant: 20,
    Heroism: 50
};
const buffs = {};
let goldInvested = 0;
let stonesUsed;
// eslint-disable-next-line prefer-const
let townShowing = 0;
// eslint-disable-next-line prefer-const
let actionStoriesShowing = false;
let townsUnlocked = [];
let completedActions = [];
let statShowing;
let skillShowing;
let buffShowing;
let curActionShowing;
let dungeonShowing;
let actionTownNum;
let trainingLimits = 10;
let storyShowing = 0;
let storyMax = 0;
let unreadActionStories;
const storyReqs = {
    maxSQuestsInALoop: false,
    realMaxSQuestsInALoop: false,
    maxLQuestsInALoop: false,
    realMaxLQuestsInALoop: false,
    heal10PatientsInALoop: false,
    failedHeal: false,
    clearSDungeon: false,
    haggle: false,
    haggle15TimesInALoop: false,
    haggle16TimesInALoop: false,
    glassesBought: false,
    partyThrown: false,
    partyThrown2: false,
    strengthTrained: false,
    suppliesBought: false,
    suppliesBoughtWithoutHaggling: false,
    smallDungeonAttempted: false,
    satByWaterfall: false,
    dexterityTrained: false,
    speedTrained: false,
    birdsWatched: false,
    darkRitualThirdSegmentReached: false,
    brewed50PotionsInALoop: false,
    failedBrewPotions: false,
    failedBrewPotionsNegativeRep: false,
    potionBrewed: false,
    failedGamble: false,
    failedGambleLowMoney: false,
    potionSold: false,
    sell20PotionsInALoop: false,
    sellPotionFor100Gold: false,
    sellPotionFor1kGold: false,
    manaZ3Bought:false,
    advGuildTestsTaken: false,
    advGuildRankEReached: false,
    advGuildRankDReached: false,
    advGuildRankCReached: false,
    advGuildRankBReached: false,
    advGuildRankAReached: false,
    advGuildRankSReached: false,
    advGuildRankUReached: false,
    advGuildRankGodlikeReached: false,
    teammateGathered: false,
    fullParty: false,
    failedGatherTeam: false,
    largeDungeonAttempted: false,
    clearLDungeon: false,
    craftGuildTestsTaken: false,
    craftGuildRankEReached: false,
    craftGuildRankDReached: false,
    craftGuildRankCReached: false,
    craftGuildRankBReached: false,
    craftGuildRankAReached: false,
    craftGuildRankSReached: false,
    craftGuildRankUReached: false,
    craftGuildRankGodlikeReached: false,
    armorCrafted: false,
    craft10Armor: false,
    craft20Armor: false,
    failedCraftArmor: false,
    booksRead: false,
    pickaxeBought: false,
    heroTrial1Done: false,
    heroTrial10Done: false,
    heroTrial25Done: false,
    heroTrial50Done: false,
    charonPaid: false,
    loopingPotionMade: false,
    slay6TrollsInALoop: false,
    slay20TrollsInALoop: false,
    imbueMindThirdSegmentReached: false,
    imbueBodyThirdSegmentReached: false,
    failedImbueBody: false,
    judgementFaced: false,
    acceptedIntoValhalla: false,
    castIntoShadowRealm: false,
    spokeToGuru: false,
    fellFromGrace: false,
    donatedToCharity: false,
    receivedDonation: false,
    failedReceivedDonations: false,
    tidiedUp: false,
    tidiedUp1Time: false,
    tidiedUp6Times: false,
    tidiedUp20Times: false,
    manaZ5Bought: false,
    artifactSold: false,
    artifactDonated: false,
    donated20Artifacts: false,
    donated40Artifacts: false,
    charmSchoolVisited: false,
    oracleVisited: false,
    armorEnchanted: false,
    enchanted10Armor: false,
    enchanted20Armor: false,
    wizardGuildTestTaken: false,
    wizardGuildRankEReached: false,
    wizardGuildRankDReached: false,
    wizardGuildRankCReached: false,
    wizardGuildRankBReached: false,
    wizardGuildRankAReached: false,
    wizardGuildRankSReached: false,
    wizardGuildRankSSReached: false,
    wizardGuildRankSSSReached: false,
    wizardGuildRankUReached: false,
    wizardGuildRankGodlikeReached: false,
    repeatedCitizenExam: false,
    houseBuilt: false,
    housesBuiltGodlike: false,
    built50Houses: false,
    collectedTaxes: false,
    collected50Taxes: false,
    acquiredPegasus: false,
    acquiredPegasusWithTeam: false,
    giantGuildTestTaken: false,
    giantGuildRankDReached: false,
    giantGuildRankCReached: false,
    giantGuildRankEReached: false,
    giantGuildRankBReached: false,
    giantGuildRankAReached: false,
    giantGuildRankSReached: false,
    giantGuildRankSSReached: false,
    giantGuildRankSSSReached: false,
    giantGuildRankUReached: false,
    giantGuildRankGodlikeReached: false,
    blessingSought: false,
    greatBlessingSought: false,
    feastAttempted: false,
    wellDrawn: false,
    drew10Wells: false,
    drew15Wells: false,
    drewDryWell: false,
    attemptedRaiseZombie: false,
    failedRaiseZombie: false,
    spireAttempted: false,
    clearedSpire: false,
    spire10Pylons: false,
    spire20Pylons: false,
    suppliesPurchased: false,
    deadTrial1Done: false,
    deadTrial10Done: false,
    deadTrial25Done: false,
    monsterGuildTestTaken: false,
    monsterGuildRankDReached: false,
    monsterGuildRankCReached: false,
    monsterGuildRankBReached: false,
    monsterGuildRankAReached: false,
    monsterGuildRankAReached: false,
    monsterGuildRankSReached: false,
    monsterGuildRankSSReached: false,
    monsterGuildRankSSSReached: false,
    monsterGuildRankUReached: false,
    monsterGuildRankGodlikeReached: false,
    survivorRescued: false,
    rescued6Survivors: false,
    rescued20Survivors: false,
    buffetHeld: false,
    buffetFor1: false,
    buffetFor6: false,
    portalOpened: false,
    excursionAsGuildmember: false,
    explorerGuildTestTaken: false,
    mapTurnedIn: false,
    thiefGuildTestsTaken: false,
    thiefGuildRankEReached: false,
    thiefGuildRankDReached: false,
    thiefGuildRankCReached: false,
    thiefGuildRankBReached: false,
    thiefGuildRankAReached: false,
    thiefGuildRankSReached: false,
    thiefGuildRankUReached: false,
    thiefGuildRankGodlikeReached: false,
    assassinHeartDelivered: false,
    assassin4HeartsDelivered: false,
    assassin8HeartsDelivered: false,
    investedOne:false,
    investedTwo:false,
    interestCollected:false,
    collected1KInterest:false,
    collected1MInterest:false,
    collectedMaxInterest:false,
    seminarAttended:false,
    leadership10:false,
    leadership100:false,
    leadership1k:false,
    keyBought:false,
    trailSecretFaced:false,
    trailSecret1Done:false,
    trailSecret10Done:false,
    trailSecret100Done:false,
    trailSecret500Done:false,
    trailSecretAllDone:false,
    soulInfusionAttempted:false,
    trailGodsFaced:false,
    trailGods10Done:false,
    trailGods20Done:false,
    trailGods30Done:false,
    trailGods40Done:false,
    trailGods50Done:false,
    trailGods60Done:false,
    trailGods70Done:false,
    trailGods80Done:false,
    trailGods90Done:false,
    trailGodsAllDone:false,
    fightGods01:false,
    fightGods02:false,
    fightGods03:false,
    fightGods04:false,
    fightGods05:false,
    fightGods06:false,
    fightGods07:false,
    fightGods08:false,
    fightGods09:false,
    fightGods10:false,
    fightGods11:false,
    fightGods12:false,
    fightGods13:false,
    fightGods14:false,
    fightGods15:false,
    fightGods16:false,
    fightGods17:false,
    fightGods18:false,
};

const curDate = new Date();
let totalOfflineMs = 0;
// eslint-disable-next-line prefer-const
let bonusSpeed = 1;
const offlineRatio = 1;
let totals = {
    time: 0,
    effectiveTime: 0,
    loops: 0,
    actions: 0
};

let challengeSave = {
    challengeMode: 0,
    inChallenge: false
};

let totalMerchantMana = 7500;

// eslint-disable-next-line prefer-const
let curAdvGuildSegment = 0;
// eslint-disable-next-line prefer-const
let curCraftGuildSegment = 0;
// eslint-disable-next-line prefer-const
let curWizCollegeSegment = 0;
// eslint-disable-next-line prefer-const
let curFightFrostGiantsSegment = 0;
// eslint-disable-next-line prefer-const
let curFightJungleMonstersSegment = 0;
// eslint-disable-next-line prefer-const
let curThievesGuildSegment = 0;
// eslint-disable-next-line prefer-const
let curGodsSegment = 0;

const options = {
    theme: "normal",
    keepCurrentList: false,
    repeatLastAction: false,
    addActionsToTop: false,
    pauseBeforeRestart: false,
    pauseOnFailedLoop: false,
    pauseOnComplete: false,
    highlightNew: true,
    statColors: false,
    pingOnPause: false,
    autoMaxTraining: false,
    hotkeys: true,
    updateRate: 50,
    autosaveRate: 30,
};

function setOption(option, value) {
    options[option] = value;
    if (option === "updateRate") recalcInterval(options.updateRate);
}

function loadOption(option, value) {
    if (option === "updateRate") document.getElementById(`${option}Input`).value = value;
    if (option === "autosaveRate") document.getElementById(`${option}Input`).value = value;
    else document.getElementById(`${option}Input`).checked = value;
}

function closeTutorial() {
    document.getElementById("tutorial").style.display = "none";
}

function clearSave() {
    window.localStorage[defaultSaveName] = "";
    window.localStorage[challengeSaveName] = "";
    location.reload();
}

function loadDefaults() {
    initializeStats();
    initializeSkills();
    initializeBuffs();
}

function loadUISettings() {
    document.getElementById("expandableList").style.height = localStorage.getItem("actionListHeight");
    curActionsDiv.style.maxHeight = `${parseInt(localStorage.getItem("actionListHeight")) - 43}px`;
    nextActionsDiv.style.maxHeight = `${parseInt(localStorage.getItem("actionListHeight")) - 43}px`;
}

function saveUISettings() {
    if ((document.getElementById("expandableList").style.height === "")) localStorage.setItem("actionListHeight", document.getElementById("expandableList").style.height = "500px");
    else localStorage.setItem("actionListHeight", document.getElementById("expandableList").style.height);
}

function load(inChallenge) {
    loadDefaults();
    loadUISettings();

    loadouts = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []];
    loadoutnames = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], []];
    // loadoutnames[-1] is what displays in the loadout renaming box when no loadout is selected
    // It isn't technically part of the array, just a property on it, so it doesn't count towards loadoutnames.length
    loadoutnames[-1] = "";

    let toLoad = {};
    // has a save file
    if (window.localStorage[saveName] && window.localStorage[saveName] !== "null") {
        closeTutorial();
        toLoad = JSON.parse(window.localStorage[saveName]);
    }

    console.log("Loading game from: " + saveName + " inChallenge: " + inChallenge);

    if(toLoad.challengeSave !== undefined)
    for (let challengeProgress in toLoad.challengeSave)
        challengeSave[challengeProgress] = toLoad.challengeSave[challengeProgress];
    if (inChallenge !== undefined) challengeSave.inChallenge = inChallenge;

    console.log("Challenge Mode: " + challengeSave.challengeMode + " In Challenge: " + challengeSave.inChallenge);


    if (saveName === defaultSaveName && challengeSave.inChallenge === true) {
        console.log("Switching to challenge save");
        saveName = challengeSaveName;
        load(true);
        return;
    }

    if (challengeSave.challengeMode !== 0)
        saveName = challengeSaveName;

    for (const property in toLoad.stats) {
        if (toLoad.stats.hasOwnProperty(property)) {
            stats[property].talent =  toLoad.stats[property].talent > 0 ? toLoad.stats[property].talent : 0;
            stats[property].soulstone = toLoad.stats[property].soulstone > 0 ? toLoad.stats[property].soulstone : 0;
        }
    }


    for (const property in toLoad.skills) {
        if (toLoad.skills.hasOwnProperty(property)) {
            skills[property].exp = toLoad.skills[property].exp > 0 ? toLoad.skills[property].exp : toLoad.skills[property].exp;
        }
    }

    for (const property in toLoad.buffs) {
        if (toLoad.buffs.hasOwnProperty(property)) {
            // need the min for people with broken buff amts from pre 0.93
            buffs[property].amt = Math.min(toLoad.buffs[property].amt, buffHardCaps[property]);
        }
    }

    if (toLoad.buffCaps !== undefined) {
        for (const property in buffCaps) {
            if (toLoad.buffCaps.hasOwnProperty(property)) {
                buffCaps[property] = toLoad.buffCaps[property];
                document.getElementById(`buff${property}Cap`).value = buffCaps[property];
            }
        }
    }

    if (toLoad.storyReqs !== undefined) {
        for (const property in storyReqs) {
            if (toLoad.storyReqs.hasOwnProperty(property)) {
                storyReqs[property] = toLoad.storyReqs[property];
            }
        }
    }

    if (toLoad.totalTalent === undefined) {
        let temptotalTalent = 0;
        for (const property in toLoad.stats) {
            if (toLoad.stats.hasOwnProperty(property)) {
                temptotalTalent += toLoad.stats[property].talent * 100;
            }
        }
        totalTalent = temptotalTalent;
    } else {
        totalTalent = toLoad.totalTalent;
    }

    if (toLoad.maxTown) {
        townsUnlocked = [0];
        for (let i = 1; i <= toLoad.maxTown; i++) {
            townsUnlocked.push(i);
        }
    } else {
        townsUnlocked = toLoad.townsUnlocked === undefined ? [0] : toLoad.townsUnlocked;
    }
    completedActions = [];
    if (toLoad.completedActions && toLoad.completedActions.length > 0)
        toLoad.completedActions.forEach(action => {
            completedActions.push(action);
        });
    completedActions.push("FoundGlasses");
    for (let i = 0; i <= 8; i++) {
        towns[i] = new Town(i);
    }
    actionTownNum = toLoad.actionTownNum === undefined ? 0 : toLoad.actionTownNum;
    trainingLimits = 10 + getBuffLevel("Imbuement");
    goldInvested = toLoad.goldInvested === undefined ? 0 : toLoad.goldInvested;
    stonesUsed = toLoad.stonesUsed === undefined ? {1:0, 3:0, 5:0, 6:0} : toLoad.stonesUsed;

    actions.next = [];
    if (toLoad.nextList) {
        for (const action of toLoad.nextList) {
            if (action.name === "Sell Gold") {
                action.name = "Buy Mana";
            }
            if (action.name === "Buy Mana Challenge")
                action.name = "Buy Mana Z1";
            if (action.name === "Tournament") {
                action.name = "Buy Pickaxe";
            }
            if (action.name === "Train Dex") {
                action.name = "Train Dexterity";
            }
            if (action.name === "Buy Mana") {
                action.name = "Buy Mana Z1";
            }
            if (action.name === "Purchase Mana") {
                action.name = "Buy Mana Z3";
            }
            if(totalActionList.some(x => x.name === action.name))
                actions.next.push(action);
        }
    }
    actions.nextLast = copyObject(actions.next);

    if (toLoad.loadouts) {
        for (let i = 0; i < loadouts.length; i++) {
            if (!toLoad.loadouts[i]) {
                continue;
            }
            //Translates old actions that no longer exist
            for (const action of toLoad.loadouts[i]) {
                if (action.name === "Sell Gold") {
                    action.name = "Buy Mana";
                }
                if (action.name === "Tournament") {
                    action.name = "Buy Pickaxe";
                }
                if (action.name === "Train Dex") {
                    action.name = "Train Dexterity";
                }
                if (action.name === "Buy Mana") {
                    action.name = "Buy Mana Z1";
                }
                if (action.name === "Purchase Mana") {
                    action.name = "Buy Mana Z3";
                }
                if(totalActionList.some(x => x.name === action.name))
                    loadouts[i].push(action);
            }
        }
    }
    for (let i = 0; i < loadoutnames.length; i++) {
        loadoutnames[i] = "Loadout " + (i + 1);
    }
    if (toLoad.loadoutnames) {
        for (let i = 0; i < loadoutnames.length; i++) {
            if(toLoad.loadoutnames[i] != undefined && toLoad.loadoutnames != "")
                loadoutnames[i] = toLoad.loadoutnames[i];
            else
                loadoutnames[i] = "Loadout " + (i + 1);
        }
    }
    curLoadout = toLoad.curLoadout;
    const elem = document.getElementById(`load${curLoadout}`);
    if (elem) {
        removeClassFromDiv(document.getElementById(`load${curLoadout}`), "unused");
    }

    /*if (toLoad.dungeons) {
        if (toLoad.dungeons.length < dungeons.length) {
            toLoad.dungeons.push([]);
        }
    }*/
    dungeons = [[], [], []];
    const level = { ssChance: 1, completed: 0 };
    let floors = 0;
    if(toLoad.dungeons === undefined) toLoad.dungeons = copyArray(dungeons);
    for (let i = 0; i < dungeons.length; i++) {
        floors = dungeonFloors[i];
        for (let j = 0; j < floors; j++) {
            if (toLoad.dungeons[i] != undefined && toLoad.dungeons && toLoad.dungeons[i][j]) {
                dungeons[i][j] = toLoad.dungeons[i][j];
            } else {
                dungeons[i][j] = copyArray(level);
            }
            dungeons[i][j].lastStat = "NA";
        }
    }

    trials = [[], [], [], [], []];
    const trialLevel = {completed: 0};
    if(toLoad.trials === undefined) toLoad.trials = copyArray(trials);
    for (let i = 0; i < trials.length; i++) {
        floors = trialFloors[i];
        trials[i].highestFloor = 0;
        for (let j = 0; j < floors; j++) {
            if (toLoad.trials[i] != undefined && toLoad.trials && toLoad.trials[i][j]) {
                trials[i][j] = toLoad.trials[i][j];
                if (trials[i][j].completed > 0) trials[i].highestFloor = j;
            } else {
                trials[i][j] = copyArray(trialLevel);
            }
        }
    }

    if (toLoad.options === undefined) {
        options.theme = toLoad.currentTheme === undefined ? options.theme : toLoad.currentTheme;
        options.repeatLastAction = toLoad.repeatLast;
        options.pingOnPause = toLoad.pingOnPause === undefined ? options.pingOnPause : toLoad.pingOnPause;
        options.autoMaxTraining = toLoad.autoMaxTraining === undefined ? options.autoMaxTraining : toLoad.autoMaxTraining;
        options.highlightNew = toLoad.highlightNew === undefined ? options.highlightNew : toLoad.highlightNew;
        options.hotkeys = toLoad.hotkeys === undefined ? options.hotkeys : toLoad.hotkeys;
        options.updateRate = toLoad.updateRate === undefined ? options.updateRate : toLoad.updateRate;
    } else {
        for (const option in toLoad.options) {
            options[option] = toLoad.options[option];
        }
    }

    for (const town of towns) {
        for (const action of town.totalActionList) {
            if (action.type === "progress")
                town[`exp${action.varName}`] = toLoad[`exp${action.varName}`] === undefined ? 0 : toLoad[`exp${action.varName}`];
            else if (action.type === "multipart")
                town[`total${action.varName}`] = toLoad[`total${action.varName}`] === undefined ? 0 : toLoad[`total${action.varName}`];
            else if (action.type === "limited") {
                const varName = action.varName;
                if (toLoad[`total${varName}`] !== undefined)
                    town[`total${varName}`] = toLoad[`total${varName}`];
                if (toLoad[`checked${varName}`] !== undefined)
                    town[`checked${varName}`] = toLoad[`checked${varName}`];
                if (toLoad[`good${varName}`] !== undefined)
                    town[`good${varName}`] = toLoad[`good${varName}`];
                if (toLoad[`good${varName}`] !== undefined)
                    town[`goodTemp${varName}`] = toLoad[`good${varName}`];
            }
        }
    }

    loadChallenge();
    view.initalize();

    for (const town of towns) {
        for (const action of town.totalActionList) {
            if (action.type === "limited") {
                const varName = action.varName;
                if (toLoad[`searchToggler${varName}`] !== undefined) {
                    document.getElementById(`searchToggler${varName}`).checked = toLoad[`searchToggler${varName}`];
                }
                view.updateRegular({name: action.varName, index: town.index});
            }
        }
    }

    for (const option in options) {
        loadOption(option, options[option]);
    }
    storyShowing = toLoad.storyShowing === undefined ? 0 : toLoad.storyShowing;
    storyMax = toLoad.storyMax === undefined ? 0 : toLoad.storyMax;
    if (toLoad.unreadActionStories === undefined
        || toLoad.unreadActionStories.find(s => !s.includes('storyContainer'))) {
        unreadActionStories = [];
    } else {
        unreadActionStories = toLoad.unreadActionStories;
        for (const name of unreadActionStories) {
            showNotification(name);
        }
    }

    totalOfflineMs = toLoad.totalOfflineMs === undefined ? 0 : toLoad.totalOfflineMs;
    if (toLoad.totals != undefined) {
        totals.time = toLoad.totals.time === undefined ? 0 : toLoad.totals.time;
        totals.effectiveTime = toLoad.totals.effectiveTime === undefined ? 0 : toLoad.totals.effectiveTime;
        totals.loops = toLoad.totals.loops === undefined ? 0 : toLoad.totals.loops;
        totals.actions = toLoad.totals.actions === undefined ? 0 : toLoad.totals.actions;
    }
    else totals = {time: 0, effectiveTime: 0, loops: 0, actions: 0};
    view.updateTotals();

    // capped at 1 month of gain
    addOffline(Math.min(Math.floor((new Date() - new Date(toLoad.date)) * offlineRatio), 2678400000));

    if (toLoad.version75 === undefined) {
        const total = towns[0].totalSDungeon;
        dungeons[0][0].completed = Math.floor(total / 2);
        dungeons[0][1].completed = Math.floor(total / 4);
        dungeons[0][2].completed = Math.floor(total / 8);
        dungeons[0][3].completed = Math.floor(total / 16);
        dungeons[0][4].completed = Math.floor(total / 32);
        dungeons[0][5].completed = Math.floor(total / 64);
        towns[0].totalSDungeon = dungeons[0][0].completed + dungeons[0][1].completed + dungeons[0][2].completed + dungeons[0][3].completed + dungeons[0][4].completed + dungeons[0][5].completed;
    }

    //Handle players on previous challenge system
    if(toLoad.challenge !== undefined && toLoad.challenge !== 0) {
        challengeSave.challengeMode = 0;
        challengeSave.inChallenge = true;
        save();

        challengeSave.challengeMode = toLoad.challenge;
        saveName = challengeSaveName;
        save();
        location.reload();
    }

    if(getExploreProgress() >= 100) addResource("glasses", true);

    adjustAll();

    view.updateLoadoutNames();
    view.changeStatView();
    view.updateNextActions();
    view.updateMultiPartActions();
    view.updateStories(true);
    view.update();
    recalcInterval(options.updateRate);
    pauseGame();

}

function save() {
    const toSave = {};
    toSave.curLoadout = curLoadout;
    toSave.dungeons = dungeons;
    toSave.trials = trials;
    toSave.townsUnlocked = townsUnlocked;
    toSave.completedActions = completedActions;
    toSave.actionTownNum = actionTownNum;

    toSave.stats = stats;
    toSave.totalTalent = totalTalent;
    toSave.skills = skills;
    toSave.buffs = buffs;
    toSave.goldInvested = goldInvested;
    toSave.stonesUsed = stonesUsed;
    toSave.version75 = true;

    for (const town of towns) {
        for (const action of town.totalActionList) {
            if (action.type === "progress") {
                toSave[`exp${action.varName}`] = town[`exp${action.varName}`];
            } else if (action.type === "multipart") {
                toSave[`total${action.varName}`] = town[`total${action.varName}`];
            } else if (action.type === "limited") {
                const varName = action.varName;
                toSave[`total${varName}`] = town[`total${varName}`];
                toSave[`checked${varName}`] = town[`checked${varName}`];
                toSave[`good${varName}`] = town[`good${varName}`];
                toSave[`goodTemp${varName}`] = town[`good${varName}`];
                if (document.getElementById(`searchToggler${varName}`)) {
                    toSave[`searchToggler${varName}`] = document.getElementById(`searchToggler${varName}`).checked;
                }
            }
        }
    }
    toSave.nextList = actions.next;
    toSave.loadouts = loadouts;
    toSave.loadoutnames = loadoutnames;
    toSave.options = options;
    toSave.storyShowing = storyShowing;
    toSave.storyMax = storyMax;
    toSave.storyReqs = storyReqs;
    toSave.unreadActionStories = unreadActionStories;
    toSave.buffCaps = buffCaps;

    toSave.date = new Date();
    toSave.totalOfflineMs = totalOfflineMs;
    toSave.totals = totals;
    
    toSave.challengeSave = challengeSave;
    for (const challengeProgress in challengeSave)
        toSave.challengeSave[challengeProgress] = challengeSave[challengeProgress];

    window.localStorage[saveName] = JSON.stringify(toSave);
}

function exportSave() {
    save();
    // idle loops save version 01. patch v0.94, moved from old save system to lzstring base 64
    document.getElementById("exportImport").value = `ILSV01${LZString.compressToBase64(window.localStorage[saveName])}`;
    document.getElementById("exportImport").select();
    document.execCommand("copy");
}

function importSave() {
    const saveData = document.getElementById("exportImport").value;
    processSave(saveData);
}

function processSave(saveData) {
    if (saveData === "") {
        if (confirm("Importing nothing will delete your save. Are you sure you want to delete your save?")) {
            challengeSave = {};
            clearSave();
        } else {
            return;
        }
    }
    // idle loops save version 01. patch v0.94, moved from old save system to lzstring base 64
    if (saveData.substr(0, 6) === "ILSV01") {
        window.localStorage[saveName] = LZString.decompressFromBase64(saveData.substr(6));
    } else {
        // handling for old saves from stopsign or patches prior to v0.94
        window.localStorage[saveName] = decode(saveData);
    }
    actions.next = [];
    actions.current = [];
    load();
    pauseGame();
    restart();
}

function saveFileName() {
    const gameName = document.title.replace('*PAUSED* ','')
    const version = document.querySelector('#changelog').childNodes[1].firstChild.textContent.trim()
    return `${gameName} ${version} - Loop ${totals.loops}.txt`
}

function exportSaveFile() {
    save();
    const saveData = `ILSV01${LZString.compressToBase64(window.localStorage[saveName])}`;
    const a = document.createElement('a');
    a.setAttribute('href', 'data:text/plain;charset=utf-8,' + saveData);
    a.setAttribute('download', saveFileName());
    a.setAttribute('id', 'downloadSave');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function openSaveFile() {
    document.getElementById('SaveFileInput').click();
}

function importSaveFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const saveData = e.target.result;
        processSave(saveData);
    }
    reader.readAsText(file)
}

function exportCurrentList() {
    let toReturn = "";
    for (const action of actions.next) {
        toReturn += `${action.loops}x ${action.name}`;
        toReturn += "\n";
    }
    document.getElementById("exportImportList").value = toReturn.slice(0, -1);
    document.getElementById("exportImportList").select();
    document.execCommand("copy");
}

function importCurrentList() {
    const toImport = document.getElementById("exportImportList").value.split("\n");
    actions.next = [];
    for (let i = 0; i < toImport.length; i++) {
        if (!toImport[i]) {
            continue;
        }
        const name = toImport[i].substr(toImport[i].indexOf("x") + 1).trim();
        const loops = toImport[i].substr(0, toImport[i].indexOf("x"));
        const action = translateClassNames(name);
        if (action && action.unlocked()) {
            actions.next.push({ name, loops: Number(loops), disabled: false });
        }
    }
    view.updateNextActions();
}

function beginChallenge(challengeNum) {
    console.log("Beginning Challenge");
    if (window.localStorage[challengeSaveName] && window.localStorage[challengeSaveName] !== "") {
        if (confirm("Beginning a new challenge will delete your current challenge save. Are you sure you want to begin?"))
            window.localStorage[challengeSaveName] = "";
        else
            return false;
    }
    if (challengeSave.challengeMode === 0) {
        challengeSave.inChallenge = true;
        save();
        console.log ("Saving to: " + saveName);
    }
    challengeSave.challengeMode = challengeNum;
    saveName = challengeSaveName;
    load(true);
    totalOfflineMs = 1000000;
    save();
    pauseGame();
    restart();
}

function exitChallenge() {
    if (challengeSave.challengeMode !== 0) {
        saveName = defaultSaveName;
        load(false);
        save();
        location.reload();
    }
}

function resumeChallenge() {
    if (challengeSave.challengeMode === 0 && window.localStorage[challengeSaveName] && window.localStorage[challengeSaveName] !== "") {
        challengeSave.inChallenge = true;
        save();
        saveName = challengeSaveName;
        load(true);
        save();
        pauseGame();
        restart();
    }
}
