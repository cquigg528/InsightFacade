import * as fs from "fs-extra";

const persistDir = "./data";

function getContentFromArchives(name: string): string {
	return fs.readFileSync(`test/resources/archives/${name}`).toString("base64");
}

function clearDisk(): void {
	fs.removeSync(persistDir);
}

const getContent = (name: string): string => {
	return fs.readFile("test/resources/archives/ubcCourses/" + name).toString();
};

export {getContentFromArchives, persistDir, clearDisk, getContent};
