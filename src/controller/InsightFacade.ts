import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";

export default class InsightFacade implements IInsightFacade {
	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return Promise.resolve([]);
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve([]);
	}

	public performQuery(query: any): Promise<any[]> {
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
	public removeDataset(id: string): Promise<string> {
		const validIdRegex = /^[^_]+$/;

		// if regex does not match, reject
		if (!id.match(validIdRegex)) {
			return Promise.reject(InsightError);
		}

		// !!!! return stub
		return Promise.resolve("");
	}
}
