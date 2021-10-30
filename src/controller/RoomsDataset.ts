import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs-extra";
import {Dataset} from "./Dataset";
import JSZip from "jszip";
// import parse5 from "parse5";

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
		function getChildNodes(tree: any[], selectedKey: string, nodes: any[]) {
			for (let item in tree) {
				if (tree[item].nodeName === selectedKey) {
					nodes.push(tree[item]);
				}
				if (tree[item].childNodes) {
					getChildNodes(tree[item].childNodes, selectedKey, nodes);
				}
			}
			return nodes;
		}
		let tables: any[] = getChildNodes(document.childNodes, "td", []);
		let hrefs: any[] = getChildNodes(tables, "a", []).map((elem) => {
			return elem.attrs.map((element: { name: string; value: any; }) => {
				if (element.name === "href") {
					return element.value;
				}
			});
		});
		hrefs = [...new Set(hrefs.flat(1).filter((item) => (!(item === undefined ))))];
		for (let href of hrefs) {
			let path: string = "rooms" + href.substring(1);
			let buildingFileData = await zip.file(path)?.async("string");
			let buildingDocument = parse5.parse(buildingFileData);
			let buildingTables = getChildNodes(buildingDocument, "table", []);
			console.log(buildingTables);
		}
		console.log(hrefs.flat(1));
		// Need to get:
		// Full building name
		// short building name
		// room number (string)
		// room name: short building name + room number
		// room address (building address)
		// latitude & longitude (from building address)
		// seats
		// type (e.g. "Small Group")
		// furniture (e.g. "Classroom - Movable Tables and Chairs")
		// rooms href - link to full details
		return Promise.resolve(tables);
	}
}
