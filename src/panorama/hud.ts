$.Msg("Hud panorama loaded");

// Challenge UI state
let challengePanelVisible = false;
let challengeData: any = {};

function OnCloseButtonClicked() {
    $.Msg("Example close button clicked");

    // Find panel by id
    const examplePanel = $("#ExamplePanel");

    // Remove panel
    examplePanel.DeleteAsync(0);

    // Send event to server
    GameEvents.SendCustomGameEventToServer("ui_panel_closed", {});
}

// Challenge UI Functions
function OnChallengeTabClicked() {
    $.Msg("Challenge tab clicked");
    
    if (!challengePanelVisible) {
        ShowChallengePanel();
        // Request latest challenge data from server
        GameEvents.SendCustomGameEventToServer("challenge_progress_request", {});
    } else {
        HideChallengePanel();
    }
}

function OnChallengePanelClose() {
    HideChallengePanel();
}

function ShowChallengePanel() {
    const panel = $("#ChallengePanel");
    panel.RemoveClass("hidden");
    panel.AddClass("visible");
    challengePanelVisible = true;
}

function HideChallengePanel() {
    const panel = $("#ChallengePanel");
    panel.RemoveClass("visible");
    panel.AddClass("hidden");
    challengePanelVisible = false;
}

function UpdateChallengeList(challenges: any) {
    const challengeList = $("#ChallengeList");
    challengeList.RemoveAndDeleteChildren();

    for (const [key, challenge] of Object.entries(challenges)) {
        const challengeItem = $.CreatePanel("Panel", challengeList, `challenge_${key}`);
        challengeItem.AddClass("challenge-item");

        if ((challenge as any).completed) {
            challengeItem.AddClass("completed");
            if ((challenge as any).completedBy === 2) { // DotaTeam.GOODGUYS
                challengeItem.AddClass("radiant-completed");
            } else if ((challenge as any).completedBy === 3) { // DotaTeam.BADGUYS
                challengeItem.AddClass("dire-completed");
            }
        }

        // Challenge info section
        const challengeInfo = $.CreatePanel("Panel", challengeItem, "");
        challengeInfo.AddClass("challenge-info");

        const challengeName = $.CreatePanel("Label", challengeInfo, "");
        challengeName.AddClass("challenge-name");
        challengeName.text = (challenge as any).name;

        const challengeDescription = $.CreatePanel("Label", challengeInfo, "");
        challengeDescription.AddClass("challenge-description");
        challengeDescription.text = (challenge as any).description;

        // Progress bar (only show for non-completed challenges with progress > 1)
        if (!(challenge as any).completed && (challenge as any).maxProgress > 1) {
            const progressContainer = $.CreatePanel("Panel", challengeInfo, "");
            progressContainer.AddClass("challenge-progress");

            const progressBar = $.CreatePanel("Panel", progressContainer, "");
            progressBar.AddClass("challenge-progress-bar");
            const progressPercent = ((challenge as any).progress / (challenge as any).maxProgress) * 100;
            progressBar.style.width = `${progressPercent}%`;
        }

        // Status section
        const challengeStatus = $.CreatePanel("Panel", challengeItem, "");
        challengeStatus.AddClass("challenge-status");

        if ((challenge as any).completed) {
            const completedIcon = $.CreatePanel("Panel", challengeStatus, "");
            completedIcon.AddClass("challenge-completed-icon");
            
            const checkmark = $.CreatePanel("Label", completedIcon, "");
            checkmark.text = "✓";

            const teamName = (challenge as any).completedBy === 2 ? "Radiant" : "Dire";
            const statusText = $.CreatePanel("Label", challengeStatus, "");
            statusText.AddClass("challenge-status-text");
            statusText.text = teamName;
        } else {
            const statusText = $.CreatePanel("Label", challengeStatus, "");
            statusText.AddClass("challenge-status-text");
            if ((challenge as any).maxProgress > 1) {
                statusText.text = `${(challenge as any).progress}/${(challenge as any).maxProgress}`;
            } else {
                statusText.text = "Pending";
            }
        }
    }
}

// Event Handlers
GameEvents.Subscribe("example_event", (data: NetworkedData<ExampleEventData>) => {
    const myNumber = data.myNumber;
    const myString = data.myString;

    const myBoolean = data.myBoolean; // After sending to client this is now type 0 | 1!

    const myArrayObject = data.myArrayOfNumbers; // After sending this is now an object!

    const myArray = toArray(myArrayObject); // We can turn it back into an array ourselves.

    $.Msg("Received example event", myNumber, myString, myBoolean, myArrayObject, myArray);
});

GameEvents.Subscribe("challenge_progress_update", (data: NetworkedData<ChallengeProgressUpdateData>) => {
    $.Msg("Received challenge progress update");
    challengeData = data.challenges;
    UpdateChallengeList(challengeData);
});

GameEvents.Subscribe("challenge_completed", (data: NetworkedData<ChallengeCompletedData>) => {
    $.Msg("Challenge completed:", data.challengeName, "by", data.teamName);
    
    // You could add visual/audio feedback here for challenge completion
    // For example, a notification popup or sound effect
});

/**
 * Turn a table object into an array.
 * @param obj The object to transform to an array.
 * @returns An array with items of the value type of the original object.
 */
function toArray<T>(obj: Record<number, T>): T[] {
    const result = [];
    
    let key = 1;
    while (obj[key]) {
        result.push(obj[key]);
        key++;
    }

    return result;
}

async function sleep(time: number): Promise<void> {
    return new Promise<void>((resolve) => $.Schedule(time, resolve));
}

// Initialize challenge UI when the HUD loads
$.Schedule(1.0, () => {
    // Request initial challenge data
    GameEvents.SendCustomGameEventToServer("challenge_progress_request", {});
});
