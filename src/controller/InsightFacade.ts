import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";
import {readdir} from "fs-extra";

// Not using this but keeping it commented out for now in case we want to use it in the future
// interface JSONCourse {
// 	tier_eight_five: number;
// 	tier_ninety: number;
// 	Title: string;
// 	Section: string;
// 	Detail: string;
// 	tier_seventy_two: number;
// 	Other: number;
// 	Low: number;
// 	tier_sixty_four: number;
// 	tier_zero: number;
// 	tier_seventy_six: number;
// 	tier_thirty: number;
// 	tier_fifty: number;
// 	Professor: string;
// 	Audit: number;
// 	tier_g_fifty: number;
// 	tier_forty: number;
// 	Withdrew: number;
// 	Year: string;
// 	tier_twenty: number;
// 	Stddev: number;
// 	Enrolled: number;
// 	tier_fifty_five: number;
// 	tier_eighty: number;
// 	tier_sixty: number;
// 	tier_ten: number;
// 	High: number;
// 	Course: string;
// 	Session: string;
// 	Pass: number;
// 	Fail: number;
// 	Avg: number;
// 	Campus: string;
// 	Subject: string;
// }

class Dataset implements InsightDataset {
	public id: string;
	public kind: InsightDatasetKind;
	public numRows: number;

	constructor(id: string, kind: InsightDatasetKind) {
		this.id = id;
		this.numRows = 0;
		this.kind = kind;
	}

	// In this class we can add different methods to search for a course from disk
	// We will handle the logic of parsing the query in InsightFacade
	// Then call the appropriate getter that's here in Dataset

	public addCourse(): void {
		this.numRows += 1;
	}
}

export default class InsightFacade implements IInsightFacade {
	private datasets: InsightDataset[];
	private datasetIds: string[];

	constructor() {
		this.datasets = [];
		this.datasetIds = [];
	}


	private async loadDataset (datasetObj: Dataset, content: string) {
		let jsZip = new JSZip();
		let jsonObject;
		let zip;
		try {
			zip = await jsZip.loadAsync(content, {base64: true});
		} catch(error) {
			return Promise.reject(new InsightError("Not a proper ZIP file!"));
		}
		// jsZip.folder() returns an array, so if its length is 0 then there is no folder named courses
		if (jsZip.folder(/courses/).length !== 1) {
			return Promise.reject(new InsightError("No folder named courses!"));
		}

		// iterate over all the files in the zip folder
		for (let filename of Object.keys(zip.files)) {
			// first file will be a folder, we can ignore this
			if (zip.files[filename].dir) {
				continue;
			}
			// check if the file is in the courses folder
			// not sure if we should continue or throw an error here... TODO
			const regex = new RegExp("courses/.*");
			if (!(regex.test(zip.files[filename].name))) {
				continue;
				// return Promise.reject(new InsightError("Files should not be outside of courses folder!"));
			}
			// get file data and parse it so it will be a JSON object
			let fileData = await zip.files[filename].async("string");
			try {
				jsonObject = JSON.parse(fileData);
			} catch(e) {
				continue;
			}
			// add json object to dataset
			await this.addJSONObjectToDataset(jsonObject, datasetObj, filename);
		}
	}

	private async addJSONObjectToDataset(jsonObject: any, datasetObj: Dataset, filename: string): Promise<boolean> {
		// ignore empty results
		if (!(Object.keys(jsonObject).includes("result")) || jsonObject.result.length === 0) {
			return false;
		}
		// add all the sections one by one to the datasetObj
		for (let section of jsonObject.result) {
			if (this.validateSection(section)) {
				datasetObj.addCourse();
			} else {
				delete jsonObject.result[section];
			}
		}
		// write the course to ./data/ folder
		let path = `./data/${datasetObj.id}/`;
		await fs.promises.mkdir(path, {recursive: true});
		// code adapted from https://stackoverflow.com/questions/573145/get-everything-after-the-dash-in-a-string-in-javascript/35236900
		fs.writeJSON(`${path}${filename.split("/")[1]}`, jsonObject.result);
		return true;
	}

	private validateSection(val: any): boolean {
		// code adapted from https://stackoverflow.com/questions/54881865/check-if-multiple-keys-exists-in-json-object
		// Ensures that the section has all parameters that we will need
		const neededKeys = ["Subject", "Course", "Avg", "Professor", "Title", "Pass", "Fail",
			"Audit", "Section", "Year"];
		return neededKeys.every((key) => Object.keys(val).includes(key));
	}


	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// TODO: speed up implementation
		// Check if id is invalid: contains underscores or only whitespace, or is already in dataset
		if (id.includes("_")) {
			return Promise.reject(new InsightError("Invalid ID: Contains an underscore (_)."));
		}
		if (id.trim() === "") {
			return Promise.reject(new InsightError("Invalid ID: Contains only whitespace."));
		}
		if (this.datasetIds.includes(id)) {
			return Promise.reject(new InsightError("Dataset already contains this ID."));
		}
		if (kind !== InsightDatasetKind.Courses) {
			return Promise.reject(new InsightError("Invalid kind! We only accept courses."));
		}
		let datasetObj = new Dataset(id, kind);

		await this.loadDataset(datasetObj, content);
		if (datasetObj.numRows === 0) {
			return Promise.reject(new InsightError("Dataset contains no valid sections!"));
		}
		this.datasets.push(datasetObj as InsightDataset);
		this.datasetIds.push(datasetObj.id);
		return Promise.resolve(this.datasetIds);
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.datasets);
	}

	public performQuery(query: any): Promise<any[]> {
		// TODO: implement performQuery
		return Promise.resolve([]);
	}

	/**
	 * Remove a dataset from insightUBC.
	 *
	 * @param id  The id of the dataset to remove. Follows the format /^[^_]+$/
	 *
	 * @return Promise <string>
	 *
	 * The promise should fulfill upon a successful removal, reject on any error.
	 * Attempting to remove a dataset that hasn't been added yet counts as an error.
	 *
	 * An id is invalid if it contains an underscore, or is only whitespace characters.
	 *
	 * The promise should fulfill the id of the dataset that was removed.
	 * The promise should reject with a NotFoundError (if a valid id was not yet added)
	 * or an InsightError (invalid id or any other source of failure) describing the error.
	 *
	 * This will delete both disk and memory caches for the dataset for the id meaning
	 * that subsequent queries for that id should fail unless a new addDataset happens first.
	 */
	public async removeDataset(id: string): Promise<string> {
		const validIdRegex = /^[^_]+$/;

		// if regex does not match, reject
		if (!id.match(validIdRegex) || id.trim() === "") {
			return Promise.reject(new InsightError("Invalid ID!"));
		}
		if (this.datasetIds.includes(id)) {
			let path = `./data/${id}/`;
			try {
				await fs.rmdir(path, {recursive: true});
			} catch {
				return Promise.reject(new InsightError("Failed to remove directory!"));
			}
		} else {
			return Promise.reject(new NotFoundError("Could not find that ID!"));
		}
		// code taken from https://stackoverflow.com/questions/15292278/how-do-i-remove-an-array-item-in-typescript
		this.datasets.forEach( (dataset, index) => {
			if (dataset.id === id) {
				this.datasets.splice(index, 1);
				this.datasetIds.splice(index, 1);
			}
		});
		return Promise.resolve(id);
	}
}
