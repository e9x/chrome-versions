import bruteforce from "./bruteforceLib.js";

const [, , board] = process.argv;

if (!board) throw new Error("Board must be specified (e.g. reks)");

bruteforce(board);
