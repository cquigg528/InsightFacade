import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs-extra";
import {Dataset} from "./Dataset";
import JSZip from "jszip";
// import parse5 from "parse5";

export class RoomsDataset extends Dataset {
	constructor(id: string, kind: InsightDatasetKind) {
		super(id, kind);
	}

	private getChildNodes(tree: any[], selectedKey: string, nodes: any[]) {
		for (let item in tree) {
			if (tree[item].nodeName === selectedKey) {
				nodes.push(tree[item]);
			}
			if (tree[item].childNodes) {
				this.getChildNodes(tree[item].childNodes, selectedKey, nodes);
			}
		}
		return nodes;
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

		let tables: any[] = this.getChildNodes(document.childNodes, "td", []);
		let hrefs: any[] = this.getChildNodes(tables, "a", []).map((elem) => {
			return elem.attrs.map((element: { name: string; value: any; }) => {
				if (element.name === "href") {
					return element.value;
				}
			});
		});
		hrefs = [...new Set(hrefs.flat(1).filter((item) => (!(item === undefined ))))];
		let rooms: any[] = [];
		for (let href of hrefs) {
			let path: string = "rooms" + href.substring(1);
			let buildingFileData = await zip.file(path)?.async("string");
			let buildingDocument = parse5.parse(buildingFileData);
			let buildingTables = this.getChildNodes(buildingDocument.childNodes, "tr", []);
			for (let row of buildingTables) {
				rooms.push(this.saveRoom(row));
			}
		}
		console.log(rooms);
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

	private saveRoom(row: any) {
		let room = {
			fullName: "",
			shortName: "",
			roomNumber: "",
			roomName: "",
			roomAddress: "",
			roomLatitude: -1,
			roomLongitude: -1,
			roomSeats: -1,
			roomType: "",
			roomFurniture: "",
			roomHref: "",
		};
		for (let entry of row.childNodes) {
			if (entry.nodeName === "td") {
				let field = entry.attrs[0].value;
				let as;
				let texts;
				switch (field) {
				case "views-field views-field-field-room-number":
					as = this.getChildNodes(entry.childNodes, "a", []);
					room.roomHref = as[0].attrs[0].value;
					texts = this.getChildNodes(entry.childNodes, "#text", []);
					for (let text of texts) {
						if (text.value !== "\n") {
							room.roomNumber = text.value;
						}
					}
					break;
				case "views-field views-field-field-room-capacity":
					texts = this.getChildNodes(entry.childNodes, "#text", []);
					room.roomSeats = texts[0].value;
					break;
				case "views-field views-field-field-room-furniture":
					texts = this.getChildNodes(entry.childNodes, "#text", []);
					room.roomFurniture = texts[0].value;
					break;
				case "views-field views-field-field-room-type":
					texts = this.getChildNodes(entry.childNodes, "#text", []);
					room.roomType = texts[0].value;
					break;
				}
			}
		}
		return room;
	}
}
