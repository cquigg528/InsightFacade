import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";
import {Dataset} from "./Dataset";

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


export default class InsightFacade implements IInsightFacade {
	private datasets: InsightDataset[];
	private datasetIds: string[];

	constructor() {
		this.datasets = [];
		this.datasetIds = [];
	}


	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
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

		await datasetObj.loadDataset(content);
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
				// datasets should only be added in addDataset and removed in removeDataset, and both methods
				// add/remove from both datasets and datasetIds, so it's safe to to remove both here.
				this.datasets.splice(index, 1);
				this.datasetIds.splice(index, 1);
			}
		});
		return Promise.resolve(id);
	}
}
