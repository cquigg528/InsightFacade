import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as fs from "fs-extra";
import JSZip from "jszip";
import {Dataset} from "./Dataset";
import {RoomsDataset} from "./RoomsDataset";
import {CoursesDataset} from "./CoursesDataset";

export default class InsightFacade implements IInsightFacade {
	private coursesDatasets: InsightDataset[];
	private coursesDatasetIds: string[];
	private roomsDatasets: InsightDataset[];
	private roomsDatasetIds: string[];

	constructor() {
		this.coursesDatasets = [];
		this.coursesDatasetIds = [];
		this.roomsDatasets = [];
		this.roomsDatasetIds = [];
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// Check if id is invalid: contains underscores or only whitespace, or is already in dataset
		if (id.includes("_")) {
			return Promise.reject(new InsightError("Invalid ID: Contains an underscore (_)."));
		}
		if (id.trim() === "") {
			return Promise.reject(new InsightError("Invalid ID: Contains only whitespace."));
		}
		if (this.coursesDatasetIds.includes(id)) {
			return Promise.reject(new InsightError("Dataset already contains this ID."));
		}
		if (kind !== InsightDatasetKind.Courses && kind !== InsightDatasetKind.Rooms) {
			return Promise.reject(new InsightError("Invalid kind! We only accept courses or rooms."));
		}
		let datasetObj: Dataset;
		if (kind === InsightDatasetKind.Rooms) {
			datasetObj = new RoomsDataset(id, kind);
		} else {
			datasetObj = new CoursesDataset(id, kind);
		}
		await datasetObj.loadDataset(content);
		if (datasetObj.numRows === 0) {
			return Promise.reject(new InsightError("Dataset contains no valid sections!"));
		}
		if (kind === InsightDatasetKind.Rooms) {
			this.roomsDatasets.push(datasetObj);
			this.coursesDatasetIds.push(datasetObj.id);
		} else {
			this.coursesDatasets.push(datasetObj);
			this.coursesDatasetIds.push(datasetObj.id);
		}
		return Promise.resolve(this.coursesDatasetIds);
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.coursesDatasets);
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
		if (this.coursesDatasetIds.includes(id)) {
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
		this.coursesDatasets.forEach( (dataset, index) => {
			if (dataset.id === id) {
				// datasets should only be added in addDataset and removed in removeDataset, and both methods
				// add/remove from both datasets and datasetIds, so it's safe to to remove both here.
				this.coursesDatasets.splice(index, 1);
				this.coursesDatasetIds.splice(index, 1);
			}
		});
		return Promise.resolve(id);
	}
}
