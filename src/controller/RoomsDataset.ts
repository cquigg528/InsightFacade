import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import {Dataset} from "./Dataset";
import JSZip from "jszip";
import * as http from "http";
import * as fs from "fs-extra";

// import parse5 from "parse5";

interface RoomInterface {
	fullname: string | undefined;
	shortname: string | undefined;
	number: string | undefined;
	name: string | undefined;
	address: string | undefined;
	lat: number | undefined;
	lon: number | undefined;
	seats: number | undefined;
	type: string | undefined;
	furniture: string | undefined;
	href: string | undefined;
}

class Room implements RoomInterface {

	public address: string | undefined;
	public fullname: string | undefined;
	public furniture: string | undefined;
	public href: string | undefined;
	public lat: number | undefined;
	public lon: number | undefined;
	public name: string | undefined;
	public number: string | undefined;
	public seats: number | undefined;
	public shortname: string | undefined;
	public type: string | undefined;

	constructor(fullname: string | undefined,
		shortname: string | undefined,
		number: string | undefined,
		name: string | undefined,
		address: string | undefined,
		lat: number | undefined,
		lon: number | undefined,
		seats: number | undefined,
		type: string | undefined,
		furniture: string | undefined,
		href: string | undefined) {
		this.fullname = fullname;
		this.shortname = shortname;
		this.number = number;
		this.name = name;
		this.address = address;
		this.lat = lat;
		this.lon = lon;
		this.seats = seats;
		this.type = type;
		this.furniture = furniture;
		this.href = href;

	}
}

export class RoomsDataset extends Dataset {

	constructor(id: string, kind: InsightDatasetKind) {
		super(id, kind);
	}

	private getChildNodes(tree: any[], selectedKey: string, nodes: any[] = []) {
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
		let zip;
		try {
			zip = await jsZip.loadAsync(content, {base64: true});
		} catch (error) {
			return Promise.reject(new InsightError("Not a proper ZIP file!"));
		}
		// jsZip.folder() returns an array, so if its length is 0 then there is no folder named courses
		if (jsZip.folder(/rooms/).length === 0) {
			return Promise.reject(new InsightError("No folder named rooms!"));
		}
		const parse5 = require("parse5");
		let fileData;
		if (zip.file("rooms/index.htm") === null) {
			return Promise.reject(new InsightError("No index file!"));
		}
		try {
			fileData = await zip.file("rooms/index.htm")?.async("string");
		} catch (e) {
			return Promise.reject(new InsightError("Could not read index file!"));
		}
		let document = parse5.parse(fileData);


		let tds: any[] = this.getChildNodes(document.childNodes, "td", []);
		let hrefs: string[] = [];
		let shortnames: string[] = [];
		let fullnames: string[] = [];
		let addresses: string[] = [];
		let as: any[];
		for (let td of tds) {
			switch (td.attrs[0].value) {
				case "views-field views-field-field-building-code":
					shortnames.push(td.childNodes[0].value.trim());
					break;
				case "views-field views-field-title":
					as = this.getChildNodes(td, "a");
					hrefs.push("rooms" + as[1].attrs[0].value.substring(1));
					fullnames.push(as[1].childNodes[0].value);
					break;
				case "views-field views-field-field-building-address":
					addresses.push(td.childNodes[0].value.trim());
			}
		}
		let twoDSections: any[] = await this.processBuildings(hrefs, shortnames, fullnames, addresses, zip, parse5);
		let sections: any[] = twoDSections.flat(1).filter((item) => (!(item === undefined )));
		this.dataset = sections;
		return sections;
	}

	private async processBuildings(hrefs: string[], shortnames: string[], fullnames: string[],
		addresses: string[], zip: JSZip, parse5: any) {
		let promises: any[] = [];
		for (let i of [...Array(hrefs.length).keys()]) {
			let href = hrefs[i];
			let shortname = shortnames[i];
			let fullname = fullnames[i];
			let address = addresses[i];
			let buildingFileData = await zip.file(href)?.async("string");
			let buildingDocument = parse5.parse(buildingFileData);
			let lat: number | undefined;
			let lon: number | undefined;
			if (address !== undefined) {
				let GeoLocation = await this.getGeoLocation(address);
				lat = GeoLocation.lat;
				lon = GeoLocation.lon;
			}
			let buildingRows = this.getChildNodes(buildingDocument.childNodes, "tr");
			for (let row of buildingRows) {
				promises.push(this.addJSONObjectToDataset(
					this.saveRoom(row, fullname, shortname, address, lat, lon), href));
			}
		}
		return Promise.all(promises);
	}

	protected validateObject(val: any): boolean {
		// code adapted from https://stackoverflow.com/questions/54881865/check-if-multiple-keys-exists-in-json-object
		// Ensures that the section has all parameters that we will need
		let neededKeys = ["fullname", "shortname", "number", "name", "address", "lat", "lon",
			"seats", "type", "furniture", "href"];
		return neededKeys.every((key) => Object.keys(val).includes(key) && val[key] !== undefined);
	}

	private async getGeoLocation(address: string): Promise<any> {
		return new Promise(function(resolve, reject) {
			http.get("http://cs310.students.cs.ubc.ca:11316/api/v1/project_team134/"
			+ address.replace(/ /g, "%20"), (res) => {
				res.setEncoding("utf8");
				let rawData = "";
				res.on("data", (chunk) => {
					rawData += chunk;
				});
				res.on("end", () => {
					const parsedData = JSON.parse(rawData);
					return resolve(parsedData);
				});
			}).on("error", (e) => {
				return reject();
			});
		});
	}

	private saveRoom(row: any, fullname: string | undefined, shortname: string | undefined, address: string | undefined,
		lat: number | undefined, lon: number | undefined): Room {
		let number: string | undefined;
		let seats: number | undefined;
		let type: string | undefined;
		let furniture: string | undefined;
		let href: string | undefined;
		for (let entry of row.childNodes) {
			if (entry.nodeName === "td") {
				let field = entry.attrs[0].value;
				const retval = this.switchField(field, entry, href, number, seats, furniture, type);
				href = retval.href;
				number = retval.number;
				seats = retval.seats;
				furniture = retval.furniture;
				type = retval.type;
			}
		}
		let name: string | undefined;
		if (shortname !== undefined && number !== undefined) {
			name = shortname + "_" + number;
		}
		return new Room(fullname, shortname, number, name, address, lat, lon, seats, type, furniture, href);
	}

	protected async addJSONObjectToDataset(jsonObject: any, filename: string): Promise<Promise<any[]> | undefined> {
		// add all the sections one by one to the datasetObj
		if (this.validateObject(jsonObject)) {
			this.addObject();
			// write the course to ./data/ folder
			let path = `./data/${this.id}/`;
			await fs.promises.mkdir(path, {recursive: true});
			// code adapted from https://stackoverflow.com/questions/8376525/get-value-of-a-string-after-last-slash-in-javascript
			let str = filename;
			let n = str.lastIndexOf("/");
			let result = str.substring(n + 1);
			await fs.writeJSON(`${path}${jsonObject.name}`, jsonObject);
			return Promise.resolve(jsonObject);
		} else {
			return;
		}
	}

	private switchField(field: any, entry: any, href: string | undefined, number: string | undefined,
		seats: number | undefined, furniture: string | undefined, type: string | undefined) {
		let as;
		let texts;
		switch (field) {
			case "views-field views-field-field-room-number":
				try {
					as = this.getChildNodes(entry.childNodes, "a", []);
					href = as[0].attrs[0].value;
					texts = this.getChildNodes(entry.childNodes, "#text", []);
					for (let text of texts) {
						if (text.value.trim() !== "") {
							number = text.value;
						}
					}
					break;
				} catch {
					break;
				}
			case "views-field views-field-field-room-capacity":
				try {
					texts = this.getChildNodes(entry.childNodes, "#text", []);
					seats = parseInt(texts[0].value.trim(), 10);
					break;
				} catch {
					break;
				}
			case "views-field views-field-field-room-furniture":
				try {
					texts = this.getChildNodes(entry.childNodes, "#text", []);
					furniture = texts[0].value.trim();
					break;
				} catch {
					break;
				}
			case "views-field views-field-field-room-type":
				try {
					texts = this.getChildNodes(entry.childNodes, "#text", []);
					type = texts[0].value.trim();
					break;
				} catch {
					break;
				}
		}
		return {href, number, seats, furniture, type};
	}
}
