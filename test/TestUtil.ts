import * as fs from "fs-extra";

const persistDir = "./data";

// Note that the two function declarations below are essentially equivalent
const getContentFromArchives = (name: string) => fs.readFileSync(`test/resources/archives/${name}`).toString("base64");

function clearDisk(): void {
	fs.removeSync(persistDir);
}

export {getContentFromArchives, persistDir, clearDisk};
