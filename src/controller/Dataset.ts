import {InsightDataset, InsightDatasetKind} from "./IInsightFacade";
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

	protected abstract addJSONObjectToDataset(jsonObject: any, filename: string): Promise<Promise<any[]> | undefined>;

	protected abstract validateObject(val: any): boolean;

	public addObject(): void {
		this.numRows += 1;
	}
}
