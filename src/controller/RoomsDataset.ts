import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs-extra";
import {Dataset} from "./Dataset";
import JSZip from "jszip";

export class RoomsDataset extends Dataset {
	constructor(id: string, kind: InsightDatasetKind) {
		super(id, kind);
	}

	public async loadDataset(content: string) {
		let jsZip = new JSZip();
		let jsonObject;
		let zip;
		try {
			zip = await jsZip.loadAsync(content, {base64: true});
		} catch(error) {
			return Promise.reject(new InsightError("Not a proper ZIP file!"));
		}
		// jsZip.folder() returns an array, so if its length is 0 then there is no folder named courses
		if (jsZip.folder(/rooms/).length === 0) {
			return Promise.reject(new InsightError("No folder named courses!"));
		}
		const parse5 = require("parse5");
		let fileData = await zip.file("rooms/index.htm")?.async("string");
		let document = parse5.parse(fileData);
		let tables: any[] = [];
		function getChildNodes(tree: any[], selectedKey: string) {
			for (let item in tree) {
				if (tree[item].nodeName === selectedKey) {
					tables.push(tree[item]);
				}
				if (tree[item].childNodes) {
					getChildNodes(tree[item].childNodes, selectedKey);
				}
			}
		}
		getChildNodes(document.childNodes, "table");
		JSON.stringify(tables[0]);
		return Promise.resolve(tables);
	}
}
