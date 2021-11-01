import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";
import {Dataset} from "./Dataset";

export class CoursesDataset extends Dataset {

	constructor(id: string, kind: InsightDatasetKind) {
		super(id, kind);
	}

	public async loadDataset(content: string) {
		let jsZip = new JSZip();
		let jsonObject;
		let zip;
		try {
			zip = await jsZip.loadAsync(content, {base64: true});
		} catch (error) {
			return Promise.reject(new InsightError("Not a proper ZIP file!"));
		}
		// jsZip.folder() returns an array, so if its length is 0 then there is no folder named courses
		if (jsZip.folder(/courses/).length !== 1) {
			return Promise.reject(new InsightError("No folder named courses!"));
		}

		// iterate over all the files in the zip folder
		let promises = [];
		for (let filename of Object.keys(zip.files)) {
			// first file will be a folder, we can ignore this
			if (zip.files[filename].dir) {
				continue;
			}
			// check if the file is in the courses folder
			const regex = new RegExp("courses/.*");
			if (!regex.test(zip.files[filename].name)) {
				continue;
			}
			// get file data and parse it so it will be a JSON object
			let fileData = await zip.files[filename].async("string");
			try {
				jsonObject = JSON.parse(fileData);
			} catch (e) {
				continue;
			}
			// add json object to dataset
			if (!(!(Object.keys(jsonObject).includes("result")) || jsonObject.result.length === 0)) {
				promises.push(this.addJSONObjectToDataset(jsonObject.result, filename));
			}
		}
		let twoDSections: any[] = await Promise.all(promises);
		let sections: any[] = twoDSections.flat(1).filter((item) => !(item === undefined));
		this.dataset = sections;
		return sections;
	}

	protected async addJSONObjectToDataset(jsonObject: any, filename: string): Promise<Promise<any[]> | undefined> {
			// add all the sections one by one to the datasetObj
		let retval: any[] = [];
		for (let [index, section] of jsonObject.entries()) {
			if (this.validateObject(section)) {
				this.addObject();
				retval.push(jsonObject[index]);
			} else {
				delete jsonObject[index];
			}
		}
		// write the course to ./data/ folder
		let path = `./data/${this.id}/`;
		await fs.promises.mkdir(path, {recursive: true});
		// code adapted from https://stackoverflow.com/questions/8376525/get-value-of-a-string-after-last-slash-in-javascript
		let str = filename;
		let n = str.lastIndexOf("/");
		let result = str.substring(n + 1);
		await fs.writeJSON(`${path}${result}`, jsonObject);
		return Promise.resolve(retval);
	}

	protected validateObject(val: any): boolean {
		// code adapted from https://stackoverflow.com/questions/54881865/check-if-multiple-keys-exists-in-json-object
		// Ensures that the section has all parameters that we will need
		let neededKeys = ["Subject", "Course", "Avg", "Professor", "Title", "Pass", "Fail",
			"Audit", "Section", "Year"];
		return neededKeys.every((key) => Object.keys(val).includes(key));
	}
}
function filterResult(
	listOfCourses: any[],
	comparator: string,
	regex: RegExp,
	searchKey: string
): any[] | PromiseLike<any[]> {
	return listOfCourses.filter(function (item) {
		if (comparator === "is") {
			return regex.test(item[searchKey]);
		} else if (comparator === "isnot") {
			return !regex.test(item[searchKey]);
		} else {
			return Promise.reject(new InsightError("invalid comparator in findCoursesBySComparator"));
		}
	});
}
