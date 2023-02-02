"use strict";

// eslint-disable-next-line prefer-const
let gameSpeed = 1;
const baseManaPerSecond = 50;

let curTime = new Date();
let gameTicksLeft = 0;
let refund = false;
let radarUpdateTime = 0;
let timeCounter = 0;
let effectiveTime = 0;
let lastSave = Date.now();

function getSpeedMult(zone = curTown) {
    let speedMult = 1;

    // dark ritual
    if (zone === 0) speedMult *= getRitualBonus(0, 20, 10);
    else if (zone === 1) speedMult *= getRitualBonus(20, 40, 5);
    else if (zone === 2) speedMult *= getRitualBonus(40, 60, 2.5);
    else if (zone === 3) speedMult *= getRitualBonus(60, 80, 1.5);
    else if (zone === 4) speedMult *= getRitualBonus(80, 100, 1);
    else if (zone === 5) speedMult *= getRitualBonus(100, 150, .5);
    else if (zone === 6) speedMult *= getRitualBonus(150, 200, .5);
    else if (zone === 7) speedMult *= getRitualBonus(200, 250, .5);
    else if (zone === 8) speedMult *= getRitualBonus(250, 300, .5);
    speedMult *= getRitualBonus(300, 666, .1);
    
    // chronomancy
    speedMult *= getSkillBonus("Chronomancy");
    
    //Imbue Soul
    speedMult += 0.5 * getBuffLevel("Imbuement3");

    return speedMult;
}

function getActualGameSpeed() {
    return gameSpeed * getSpeedMult() * bonusSpeed;
}

function tick() {
    const newTime = Date.now();
    gameTicksLeft += newTime - curTime;
    if (document.getElementById("radarStats").checked) radarUpdateTime += newTime - curTime;
    const delta = newTime - curTime;
    curTime = newTime;

    // save even when paused
    if (curTime - lastSave > options.autosaveRate * 1000) {
        lastSave = curTime;
        save();
    }

    if (stop) {
        addOffline(gameTicksLeft * offlineRatio);
        view.update();
        gameTicksLeft = 0;
        return;
    }

    while (gameTicksLeft > (1000 / baseManaPerSecond)) {
        if (gameTicksLeft > 2000) {
            console.warn(`too fast! (${gameTicksLeft})`);
            statGraph.graphObject.options.animation.duration = 0;
            gameTicksLeft = 0;
            refund = true;
        }
        if (stop) {
            return;
        }
        timer++;
        timeCounter += 1 / baseManaPerSecond / getActualGameSpeed();
        effectiveTime += 1 / baseManaPerSecond / getSpeedMult();

        actions.tick();
        for (const dungeon of dungeons) {
            for (const level of dungeon) {
                const chance = level.ssChance;
                if (chance < 1) level.ssChance = Math.min(chance + 0.0000001, 1);
            }
        }

        if (shouldRestart || timer >= timeNeeded) {
            loopEnd();
            prepareRestart();
        }
        gameTicksLeft -= ((1000 / baseManaPerSecond) / getActualGameSpeed());
    }

    if (bonusSpeed > 1) {
        addOffline(-Math.abs(delta * (bonusSpeed - 1)));
    }

    if (refund) {
        addOffline(delta);
        refund = false;
    }

    if (radarUpdateTime > 1000) {
        view.updateStatGraphNeeded = true;
        radarUpdateTime %= 1000;
    }

    view.update();

}

function recalcInterval(fps) {
    window.fps = fps;
    if (mainTickLoop !== undefined) {
        clearInterval(mainTickLoop);
    }
    doWork.postMessage({ stop: true });
    doWork.postMessage({ start: true, ms: (1000 / fps) });
}

function stopGame() {
    stop = true;
    view.requestUpdate("updateTime", null);
    view.requestUpdate("updateCurrentActionBar", actions.currentPos);
    view.update();
    document.title = "*PAUSED* Idle Loops";
    document.getElementById("pausePlay").textContent = _txt("time_controls>play_button");
}

function pauseGame(ping) {
    stop = !stop;
    view.requestUpdate("updateTime", null);
    view.requestUpdate("updateCurrentActionBar", actions.currentPos);
    view.update();
    document.title = stop ? "*PAUSED* Idle Loops" : "Idle Loops";
    document.getElementById("pausePlay").textContent = _txt(`time_controls>${stop ? "play_button" : "pause_button"}`);
    if (!stop && (shouldRestart || timer >= timeNeeded)) {
        restart();
    } else if (ping) {
        beep(250);
        setTimeout(() => beep(250), 500);
    }
}

function loopEnd() {
    if (effectiveTime > 0) {
        totals.time += timeCounter;
        totals.effectiveTime += effectiveTime;
        totals.loops++;
        view.requestUpdate("updateTotals", null);
        const loopCompletedActions = actions.current.slice(0, actions.currentPos);
        if (actions.current[actions.currentPos] !== undefined && actions.current[actions.currentPos].loopsLeft < actions.current[actions.currentPos].loops)
            loopCompletedActions.push(actions.current[actions.currentPos]);
        markActionsComplete(loopCompletedActions);
        actionStory(loopCompletedActions);
        if (options.highlightNew) {
            view.requestUpdate("removeAllHighlights", null);
            view.requestUpdate("highlightIncompleteActions", null);
        }
    }
}

function prepareRestart() {
    const curAction = actions.getNextValidAction();
    if (options.pauseBeforeRestart ||
        (options.pauseOnFailedLoop &&
         (actions.current.filter(action => action.loopsLeft - action.extraLoops > 0).length > 0))) {
        if (options.pingOnPause) {
            beep(250);
            setTimeout(() => beep(250), 500);
        }
        if (curAction) {
            actions.completedTicks += actions.getNextValidAction().ticks;
            view.requestUpdate("updateTotalTicks", null);
        }
        for (let i = 0; i < actions.current.length; i++) {
            view.requestUpdate("updateCurrentActionBar", i);
        }
        stopGame();
    } else {
        restart();
    }
}

function restart() {
    shouldRestart = false;
    timer = 0;
    timeCounter = 0;
    effectiveTime = 0;
    timeNeeded = timeNeededInitial;
    document.title = "Idle Loops";
    resetResources();
    restartStats();
    for (let i = 0; i < towns.length; i++) {
        towns[i].restart();
    }
    view.requestUpdate("updateSkills");
    actions.restart();
    view.requestUpdate("updateCurrentActionsDivs");
    view.requestUpdate("updateTrials", null);
}

function manualRestart() {
    loopEnd();
    restart();
    view.update();
}


function addActionToList(name, townNum, isTravelAction, insertAtIndex) {
    actions.nextLast = copyObject(actions.next);
    for (const action of towns[townNum].totalActionList) {
        if (action.name === name) {
            if (action.visible() && action.unlocked() && (!action.allowed || getNumOnList(action.name) < action.allowed())) {
                let addAmount = actions.addAmount;
                if (action.allowed) {
                    const numMax = action.allowed();
                    const numHave = getNumOnList(action.name);
                    if (numMax - numHave < addAmount) {
                        addAmount = numMax - numHave;
                    }
                }
                if (isTravelAction) {
                    actionTownNum = townNum + 1;
                    actions.addAction(name, 1, insertAtIndex);
                } else {
                    actions.addAction(name, addAmount, insertAtIndex);
                    if (shiftDown && hasLimit(name)) {
                        capAmount((insertAtIndex) ? insertAtIndex : actions.next.length - 1, townNum);
                    } else if (shiftDown && isTraining(name)) {
                        capTraining((insertAtIndex) ? insertAtIndex : actions.next.length - 1, townNum);
                    }
                }
            }
        }
    }
    view.updateNextActions();
    view.updateLockedHidden();
}

// mana and resources

function addMana(amount) {
    timeNeeded += amount;
}

function addResource(resource, amount) {
    if (Number.isFinite(amount)) resources[resource] += amount;
    else resources[resource] = amount;
    view.requestUpdate("updateResource", resource);

    if (resource === "teamMembers" || resource === "armor" || resource === "zombie") view.requestUpdate("updateTeamCombat",null);
}

function resetResource(resource) {
    resources[resource] = resourcesTemplate[resource];
    view.requestUpdate("updateResource", resource);
}

function resetResources() {
    resources = copyObject(resourcesTemplate);
    if(getExploreProgress() >= 100) addResource("glasses", true);
    view.requestUpdate("updateResources", null);
}

function changeActionAmount(amount, num) {
    actions.addAmount = amount;
    document.getElementById("amountCustom").value = amount;
    view.updateAddAmount(num);
}

function setCustomActionAmount() {
    const value = isNaN(parseInt(document.getElementById("amountCustom").value)) ? 1 : parseInt(document.getElementById("amountCustom").value);
    if (value >= 0 && value <= Number.MAX_VALUE) actions.addAmount = Math.min(value, 1e12);
    if (value === 1) {
        view.updateAddAmount(1);
    } else if (value === 5) {
        view.updateAddAmount(2);
    } else if (value === 10) {
        view.updateAddAmount(3);
    } else {
        view.updateAddAmount(0);
    }
}

function selectLoadout(num) {
    if (curLoadout === num) {
        curLoadout = 0;
    } else {
        curLoadout = num;
    }
    document.getElementById("renameLoadout").value = loadoutnames[curLoadout - 1];
    view.updateLoadout(curLoadout);
}

function loadLoadout(num) {
    curLoadout = num;
    view.updateLoadout(curLoadout);
    loadList();
}

let globalCustomInput = "";
function saveList() {
    if (curLoadout === 0) {
        save();
        return;
    }
    nameList(false);
    loadouts[curLoadout] = copyArray(actions.next);
    save();
    if ((document.getElementById("renameLoadout").value !== "Saved!")) globalCustomInput = document.getElementById("renameLoadout").value;
    document.getElementById("renameLoadout").value = "Saved!";
    setTimeout(() => {
        document.getElementById("renameLoadout").value = globalCustomInput;
    }, 1000);
}

function nameList(saveGame) {
    // if the loadout has already been saved under a non-numeric name
    // and the user tries to save under a numeric name, the loadout will
    // be saved under an old name
    // if both the old AND the new names are numeric, then we insist on a non-numeric name
    if (isNaN(document.getElementById("renameLoadout").value)) {
        if (document.getElementById("renameLoadout").value.length > 30) {
            document.getElementById("renameLoadout").value = "30 Letter Max";
        } else if (document.getElementById("renameLoadout").value !== "Saved!") {
            loadoutnames[curLoadout - 1] = document.getElementById("renameLoadout").value;
        }
    } else if (!isNaN(loadoutnames[curLoadout - 1])) {
        document.getElementById("renameLoadout").value = "Enter a name!";
    }
    document.getElementById(`load${curLoadout}`).textContent = loadoutnames[curLoadout -1];
    if (saveGame) save();
}

function loadList() {
    if (curLoadout === 0) {
        return;
    }
    document.getElementById("amountCustom").value = actions.addAmount;
    if (loadouts[curLoadout]) {
        actions.next = copyArray(loadouts[curLoadout]);
    } else {
        actions.next = [];
    }
    view.updateNextActions();
    view.adjustDarkRitualText();
}

function clearList() {
    actions.next = [];
    view.updateNextActions();
}

function unlockTown(townNum) {
    if (!towns[townNum].unlocked()) {
        townsUnlocked.push(townNum);
        townsUnlocked.sort();
        // refresh current
        view.showTown(townNum);
        view.requestUpdate("updateTravelMenu",null);
    }
    let cNum = challengeSave.challengeMode;
    if (cNum !== 0) {
        if(challengeSave["c"+cNum]<townNum) challengeSave["c"+cNum] = townNum;
        else if(challengeSave["c"+cNum] === undefined) challengeSave["c"+cNum] = townNum;
    }
    curTown = townNum;
}

function adjustAll() {
    adjustPots();
    adjustLocks();
    adjustSQuests();
    adjustLQuests();
    adjustWildMana();
    adjustHerbs();
    adjustHunt();
    adjustSuckers();
    adjustGeysers();
    adjustMineSoulstones();
    adjustArtifacts();
    adjustDonations();
    adjustWells();
    adjustPylons();
    adjustPockets();
    adjustWarehouses();
    adjustInsurance();
    adjustAllRocks();
    adjustTrainingExpMult();
    view.requestUpdate("adjustManaCost", "Continue On");
}

function capAmount(index, townNum) {
    const action = actions.next[index];
    const varName = `good${translateClassNames(action.name).varName}`;
    let alreadyExisting;
    //if (action.name.startsWith("Survey")) alreadyExisting = getOtherSurveysOnList("") + (action.disabled ? action.loops : 0);
    //else
    alreadyExisting = getNumOnList(action.name) + (action.disabled ? action.loops : 0);
    let newLoops;
    if (action.name.startsWith("Survey")) newLoops = 500 - alreadyExisting;
    if (action.name === "Gather Team") newLoops = 5 + Math.floor(getSkillLevel("Leadership") / 100) - alreadyExisting;
    else newLoops = towns[townNum][varName] - alreadyExisting;
    actions.nextLast = copyObject(actions.next);
    if (action.loops + newLoops < 0) action.loops = 0;
    else action.loops += newLoops;
    view.updateNextActions();
    view.updateLockedHidden();
}

function capTraining(index) {
    const action = actions.next[index];
    const alreadyExisting = getNumOnList(action.name) + (action.disabled ? action.loops : 0);
    const newLoops = trainingLimits - alreadyExisting;
    actions.nextLast = copyObject(actions.next);
    if (action.loops + newLoops < 0) action.loops = 0;
    else action.loops += newLoops;
    view.updateNextActions();
    view.updateLockedHidden();
}

function capAllTraining() {
    for (const [index,action] of actions.next.entries())
    {
        if (trainingActions.includes(action.name)) {
            //console.log("Training Action on list: " + action.name);
            capTraining(index);
        }
    }

}

function addLoop(index) {
    actions.nextLast = copyObject(actions.next);
    const action = actions.next[index];
    const theClass = translateClassNames(action.name);
    let addAmount = actions.addAmount;
    if (theClass.allowed) {
        const numMax = theClass.allowed();
        const numHave = getNumOnList(theClass.name) + (action.disabled ? action.loops : 0);
        if ((numMax - numHave) < addAmount) {
            addAmount = numMax - numHave;
        }
    }
    if (action.loops + addAmount === Infinity) action.loops = 1e12;
    else action.loops += addAmount;
    view.updateNextActions();
    view.updateLockedHidden();
}
function removeLoop(index) {
    actions.nextLast = copyObject(actions.next);
    const action = actions.next[index];
    action.loops -= actions.addAmount;
    if (action.loops < 0) {
        action.loops = 0;
    }
    view.updateNextActions();
    view.updateLockedHidden();
}
function split(index) {
    actions.nextLast = copyObject(actions.next);
    const toSplit = actions.next[index];
    const isDisabled = toSplit.disabled;
    actions.addAction(toSplit.name, Math.ceil(toSplit.loops / 2), index, isDisabled);
    toSplit.loops = Math.floor(toSplit.loops / 2);
    view.updateNextActions();
}

function collapse(index) {
    actions.nextLast = copyObject(actions.next);
    const action = actions.next[index];
    if (action.collapsed) {
        action.collapsed = false;
    } else {
        action.collapsed = true;
    }
    view.updateNextActions();
}

function showNotification(name) {
    document.getElementById(`${name}Notification`).style.display = "block";
}

function hideNotification(name) {
    unreadActionStories = unreadActionStories.filter(toRead => toRead !== name);
    document.getElementById(`${name}Notification`).style.display = "none";
}

function hideActionIcons() {
    document.getElementById("nextActionsList").className = "disabled";
}

function showActionIcons() {
    document.getElementById("nextActionsList").className = "";
}

function handleDragStart(event) {
    const index = event.target.getAttribute("data-index");
    draggedDecorate(index);
    event.dataTransfer.setData("text/html", index);
    hideActionIcons();
}

function handleDirectActionDragStart(event, actionName, townNum, actionVarName, isTravelAction) {
	var element = document.getElementById(`container${actionVarName}`);
	element.children[2].style.display = "none";

 	const actionData = { _actionName: actionName, _townNum: townNum, _isTravelAction: isTravelAction };
  	const serialData = JSON.stringify(actionData);

	event.dataTransfer.setDragImage(element, event.pageX - element.offsetLeft, event.pageY - element.offsetTop);
 	event.dataTransfer.setData("actionData", serialData);
 	hideActionIcons();
}


function handleDirectActionDragEnd(actionVarName) {
    document.getElementById(`container${actionVarName}`).children[2].style.display = "";
    showActionIcons();
}


function handleDragOver(event) {
    event.preventDefault();
}

function handleDragDrop(event) {
    const indexOfDroppedOverElement = event.target.getAttribute("data-index");
    dragExitUndecorate(indexOfDroppedOverElement);
    const initialIndex = event.dataTransfer.getData("text/html");
    if (initialIndex === "") {
        const actionData = JSON.parse(event.dataTransfer.getData("actionData"));
        addActionToList(actionData._actionName, actionData._townNum, actionData._isTravelAction, indexOfDroppedOverElement);
    } else {
        moveQueuedAction(Number(initialIndex), Number(indexOfDroppedOverElement));
    }
    showActionIcons();
}

function moveQueuedAction(initialIndex, resultingIndex) {
    if (initialIndex < 0 || initialIndex > actions.next.length || resultingIndex < 0 || resultingIndex > actions.next.length - 1) {
        return;
    }
    const difference = initialIndex - resultingIndex;
    if (difference === 0) {
        return;
    }

    actions.nextLast = copyObject(actions.next);
    const delta = Math.abs(difference);
   
    if (difference > 0) {
        for (let i = 0; i < delta; i++) {
            const targetIndex = actions.next[initialIndex - i - 1];
            actions.next[initialIndex - i - 1] = actions.next[initialIndex - i];
            actions.next[initialIndex - i] = targetIndex;
        }
    } else {
        for (let i = 0; i < delta; i++) {
            const targetIndex = actions.next[initialIndex + i + 1];
            actions.next[initialIndex + i + 1] = actions.next[initialIndex + i];
            actions.next[initialIndex + i] = targetIndex;
        }
    }
    
    view.updateNextActions();
}

function moveUp(index) {
    actions.nextLast = copyObject(actions.next);
    if (index <= 0) {
        return;
    }
    const targetIndex = actions.next[index - 1];
    actions.next[index - 1] = actions.next[index];
    actions.next[index] = targetIndex;
    view.updateNextActions();
}
function moveDown(index) {
    actions.nextLast = copyObject(actions.next);
    if (index >= actions.next.length - 1) {
        return;
    }
    const targetIndex = actions.next[index + 1];
    actions.next[index + 1] = actions.next[index];
    actions.next[index] = targetIndex;
    view.updateNextActions();
}
function disableAction(index) {
    actions.nextLast = copyObject(actions.next);
    const action = actions.next[index];
    const travelNum = getTravelNum(action.name);
    if (travelNum) {
        actionTownNum = travelNum - 1;
    }
    const translated = translateClassNames(action.name);
    if (action.disabled) {
        if (!translated.allowed || getNumOnList(action.name) + action.loops <= translated.allowed()) action.disabled = false;
    } else {
        action.disabled = true;
    }
    view.updateNextActions();
    view.requestUpdate("updateLockedHidden", null);
}
function removeAction(index) {
    actions.nextLast = copyObject(actions.next);
    const travelNum = getTravelNum(actions.next[index].name);
    if (travelNum) {
        actionTownNum = travelNum - 1;
    }
    actions.next.splice(index, 1);
    view.updateNextActions();
    view.requestUpdate("updateLockedHidden", null);
}

function addOffline(num) {
    if (num) {
        if (totalOfflineMs + num < 0 && bonusSpeed > 1) {
            toggleOffline();
        }
        totalOfflineMs += num;
        if (totalOfflineMs < 0) {
            totalOfflineMs = 0;
        }
        view.requestUpdate("updateOffline", null);
    }
}

function toggleOffline() {
    if (totalOfflineMs === 0) return;
    if (bonusSpeed === 1) {
        bonusSpeed = 5;
        document.getElementById("isBonusOn").textContent = _txt("time_controls>bonus_seconds>state>on");
    } else {
        bonusSpeed = 1;
        document.getElementById("isBonusOn").textContent = _txt("time_controls>bonus_seconds>state>off");
    }
    view.requestUpdate("updateTime", null);
}
