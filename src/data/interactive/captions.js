// The narration of each NIPRAS-made lesson video, timed on the video's own clock
// (from the film's captions). The companion character beside the video follows it.
import rateOfChangeStickman from "./1-1-stickman.captions.json";

import rateOfChangeSigns from "../signs/1-1-stickman.track.json";

export const lessonCaptions = { "1-1-stickman": rateOfChangeStickman };
// Recorded signs for sentences of each video (see tools/sign-capture).
export const lessonSigns = { "1-1-stickman": rateOfChangeSigns.segments };
export const lessonSignSources = { "1-1-stickman": rateOfChangeSigns.source };
