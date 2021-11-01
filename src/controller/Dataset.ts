import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";

export abstract class Dataset implements InsightDataset {
	public id: string;
	public kind: InsightDatasetKind;
	public numRows: number;

	constructor(id: string, kind: InsightDatasetKind) {
		this.id = id;
		this.numRows = 0;
		this.kind = kind;
	}

	public abstract loadDataset(content: string): Promise<void[]>;

	protected async addJSONObjectToDataset(jsonObject: any, filename: string): Promise<Promise<any[]> | undefined> {
		// ignore empty results
		if (!Object.keys(jsonObject).includes("result") || jsonObject.result.length === 0) {
			return;
		}
		// add all the sections one by one to the datasetObj
		let retval: any[] = [];
		for (let [index, section] of jsonObject.result.entries()) {
			if (this.validateObject(section)) {
				this.addObject();
				retval.push(jsonObject.result[index]);
			} else {
				delete jsonObject.result[index];
			}
		}
		// write the course to ./data/ folder
		let path = `./data/${this.id}/`;
		await fs.promises.mkdir(path, {recursive: true});
		// code adapted from https://stackoverflow.com/questions/8376525/get-value-of-a-string-after-last-slash-in-javascript
		let str = filename;
		let n = str.lastIndexOf("/");
		let result = str.substring(n + 1);
		await fs.writeJSON(`${path}${result}`, jsonObject.result);
		return Promise.resolve(retval);
	}

	protected validateObject(val: any): boolean {
		// code adapted from https://stackoverflow.com/questions/54881865/check-if-multiple-keys-exists-in-json-object
		// Ensures that the section has all parameters that we will need
		const neededKeys = [
			"Subject",
			"Course",
			"Avg",
			"Professor",
			"Title",
			"Pass",
			"Fail",
			"Audit",
			"Section",
			"Year",
		];
		return neededKeys.every((key) => Object.keys(val).includes(key));
	}

	public addObject(): void {
		this.numRows += 1;
	}
}
