import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import {QueryValidator} from "./QueryValidator";
import QueryFilter from "./QueryFilter";
import {Dataset} from "./Dataset";
import JSZip from "jszip";
import * as fs from "fs-extra";
import QueryDispatch from "./QueryDispatch";

export default class InsightFacade implements IInsightFacade {
	private datasets: InsightDataset[];
	public datasetIds: string[];

	constructor() {
		this.datasets = [];
		this.datasetIds = [];
	}

	// Requires id to be valid
	public getDatasetById(id: string): any {
		this.datasets.forEach((dataset) => {
			if (dataset.id === id) {
				return dataset;
			}
		});
		console.assert("invalid id");
		return null;
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

	/**
	 * Perform a query on insightUBC.
	 *
	 * @param query  The query to be performed.
	 *
	 * If a query is incorrectly formatted, references a dataset not added (in memory or on disk),
	 * or references multiple datasets, it should be rejected.
	 *
	 * @return Promise <any[]>
	 *
	 * The promise should fulfill with an array of results.
	 * The promise should reject with a ResultTooLargeError (if the query returns too many results)
	 * or an InsightError (for any other source of failure) describing the error.
	 */
	public async performQuery(query: any): Promise<any[]> {
		let validQuery: QueryDispatch | null;
		// let searchResults: any[];
		let sortedSearchResults: any[];

		let validator: QueryValidator = new QueryValidator(query);
		let validDatasetId = validator.setUpQueryValidation(this.datasetIds, query);
		if (validDatasetId === null) {
			return Promise.reject(InsightError);
		}

		validQuery = await validator.validateAndParseQuery();

		if (validQuery === null) {
			// query found to be invalid
			return Promise.reject(InsightError);
		}

		// get dataset
		let dataset: Dataset = this.getDatasetById(validDatasetId);

		let searchResults: any[] = await validQuery.performDatasetSearch(dataset);
		if (searchResults.length > 5000) {
			return Promise.reject(ResultTooLargeError);
		}

		// sortedSearchResults = await sortResults(searchResults);

		// stub
		return Promise.reject(null);
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
		this.datasets.forEach((dataset, index) => {
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
