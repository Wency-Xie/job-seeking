import assert from "node:assert/strict";
import { readLocalProfile } from "../extensions/application-sync/profile-source.js";

const saved = {
  confirmedAt: "2026-10-01T00:00:00.000Z",
  profile: {
    name: "测试用户",
    email: "test@example.com",
    identityNumber: "110000000000000000",
    unconfirmedGuess: "must-not-pass",
  },
};

const calls = [];
const fetcher = async (url) => {
  calls.push(url);
  return new Response(JSON.stringify({
    master: { values: { "jobSeekingOS.applicationProfile.confirmed.v2": JSON.stringify(saved) } },
  }), { status: 200, headers: { "content-type": "application/json" } });
};

const testProfile = await readLocalProfile(false, "http://127.0.0.1:4174", fetcher);
assert.equal(testProfile.workspaceOrigin, "http://127.0.0.1:4174");
assert.equal(testProfile.profile.name, "测试用户");
assert.equal(testProfile.profile.identityNumber, undefined);
assert.equal(testProfile.profile.unconfirmedGuess, undefined);

const acceptanceProfile = await readLocalProfile(true, "http://127.0.0.1:4173", fetcher);
assert.equal(acceptanceProfile.profile.identityNumber, "110000000000000000");
assert.deepEqual(calls, [
  "http://127.0.0.1:4174/api/local-profile",
  "http://127.0.0.1:4173/api/local-profile",
]);

console.log("application-sync profile boundary: 2 synthetic cases passed");
