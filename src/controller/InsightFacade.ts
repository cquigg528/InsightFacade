import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";

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

	public removeDataset(id: string): Promise<string> {
		return Promise.resolve("");
	}
}
