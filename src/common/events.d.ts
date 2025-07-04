/**
 * This file contains types for the events you want to send between the UI (Panorama)
 * and the server (VScripts).
 * 
 * IMPORTANT: 
 * 
 * The dota engine will change the type of event data slightly when it is sent, so on the
 * Panorama side your event handlers will have to handle NetworkedData<EventType>, changes are:
 *   - Booleans are turned to 0 | 1
 *   - Arrays are automatically translated to objects when sending them as event. You have
 *     to change them back into arrays yourself! See 'toArray()' in src/panorama/hud.ts
 */

// To declare an event for use, add it to this table with the type of its data
interface CustomGameEventDeclarations {
    example_event: ExampleEventData,
    ui_panel_closed: UIPanelClosedEventData,
    challenge_progress_request: ChallengeProgressRequestData,
    challenge_progress_update: ChallengeProgressUpdateData,
    challenge_completed: ChallengeCompletedData
}

// Define the type of data sent by the example_event event
interface ExampleEventData {
    myNumber: number;
    myBoolean: boolean;
    myString: string;
    myArrayOfNumbers: number[];
}

// This event has no data
interface UIPanelClosedEventData {}

// Challenge progress events
interface ChallengeProgressRequestData {}

interface ChallengeProgressUpdateData {
    challenges: {
        [key: string]: {
            name: string;
            description: string;
            progress: number;
            maxProgress: number;
            completed: boolean;
            completedBy: number; // DotaTeam as number for networking
            completedAt: number;
        }
    }
}

interface ChallengeCompletedData {
    challengeKey: string;
    challengeName: string;
    team: number; // DotaTeam as number
    teamName: string;
}
