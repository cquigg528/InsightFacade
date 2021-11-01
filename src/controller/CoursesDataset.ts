import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";
import {Dataset} from "./Dataset";

export class CoursesDataset extends Dataset {

	public dataset: string[] | undefined;

	constructor(id: string, kind: InsightDatasetKind) {
		super(id, kind);
		this.dataset = undefined;
	}

	public async loadDataset (content: string) {
		let jsZip = new JSZip();
		let jsonObject;
		let zip;
		try {
			zip = await jsZip.loadAsync(content, {base64: true});
		} catch(error) {
			return Promise.reject(new InsightError("Not a proper ZIP file!"));
		}
		// jsZip.folder() returns an array, so if its length is 0 then there is no folder named courses
		if (jsZip.folder(/courses/).length !== 1) {
			return Promise.reject(new InsightError("No folder named courses!"));
		}

		// iterate over all the files in the zip folder
		let promises = [];
		for (let filename of Object.keys(zip.files)) {
			// first file will be a folder, we can ignore this
			if (zip.files[filename].dir) {
				continue;
			}
			// check if the file is in the courses folder
			const regex = new RegExp("courses/.*");
			if (!(regex.test(zip.files[filename].name))) {
				continue;
			}
			// get file data and parse it so it will be a JSON object
			let fileData = await zip.files[filename].async("string");
			try {
				jsonObject = JSON.parse(fileData);
			} catch(e) {
				continue;
			}
			// add json object to dataset
			if (!(!(Object.keys(jsonObject).includes("result")) || jsonObject.result.length === 0)) {
				promises.push(this.addJSONObjectToDataset(jsonObject.result, filename));
			}
		}
		let twoDSections: any[] = await Promise.all(promises);
		let sections: any[] = twoDSections.flat(1).filter((item) => (!(item === undefined )));
		this.dataset = sections;
		return sections;
	}

	protected async addJSONObjectToDataset(jsonObject: any, filename: string): Promise<Promise<any[]> | undefined> {
			// add all the sections one by one to the datasetObj
		let retval: any[] = [];
		for (let [index, section] of jsonObject.entries()) {
			if (this.validateObject(section)) {
				this.addObject();
				retval.push(jsonObject[index]);
			} else {
				delete jsonObject[index];
			}
		}
			// write the course to ./data/ folder
		let path = `./data/${this.id}/`;
		await fs.promises.mkdir(path, {recursive: true});
			// code adapted from https://stackoverflow.com/questions/8376525/get-value-of-a-string-after-last-slash-in-javascript
		let str = filename;
		let n = str.lastIndexOf("/");
		let result = str.substring(n + 1);
		await fs.writeJSON(`${path}${result}`, jsonObject);
		return Promise.resolve(retval);
	}

	protected validateObject(val: any): boolean {
		// code adapted from https://stackoverflow.com/questions/54881865/check-if-multiple-keys-exists-in-json-object
		// Ensures that the section has all parameters that we will need
		let neededKeys = ["Subject", "Course", "Avg", "Professor", "Title", "Pass", "Fail",
			"Audit", "Section", "Year"];
		return neededKeys.every((key) => Object.keys(val).includes(key));
	}

	public deleteDataset(): void {
		delete this.dataset;
	}

	// In this class we can add different methods to search for a course from disk
	// We will handle the logic of parsing the query in InsightFacade
	// Then call the appropriate getter that's here in Dataset

	protected async setUpSearch(): Promise<any[]> {
		if (!(this.dataset === undefined)) {
			return this.dataset;
		} else {
			let path = `./data/${this.id}/`;
			let files = await fs.readdir(path);
			let promises = [];
			let listOfCourses = [];
			for (let file of files) {
				promises.push(await fs.readFile(`${path}${file}`));
			}
			await Promise.all(promises);
			for (let buf of promises) {
				listOfCourses.push(JSON.parse(buf.toString()));
			}
			this.dataset = listOfCourses;
			return listOfCourses;
		}
	}

	public async findCoursesByMComparator(mcomparator: string, mkey: string, number: number, customCourses: boolean,
		ccourses: any[]): Promise<any[]> {
		// mcomparator is one of lt, gt, eq, mkey is one of avg, pass, fail, audit, year
		let courses: any[] = customCourses ? ccourses : await this.setUpSearch();
		let listOfCourses = courses.flat(1);
		let comparator = this.switchOnMComparator(mcomparator);
		if (comparator === null) {
			return Promise.reject("Invalid mcomparator!");
		}
		let searchKey: string = this.switchOnSearchKey(mkey);
		if (this.switchOnSearchKey(mkey) === "") {
			return Promise.reject("Invalid mkey!");
		}
		return listOfCourses.filter(function (item) {
			if (searchKey === "Year") {
				if (item["Section"] === "overall") {
					item[searchKey] = 1900;
				}
			}
			return comparator(parseFloat(item[searchKey]), number);
		});
	}

	public switchOnMComparator(mcomparator: string): any {
		let comparator: any;
		switch (mcomparator) {
			case "nlt":
				comparator = function (x: number, y: number) {
					return x >= y;
				};
				break;
			case "ngt":
				comparator = function (x: number, y: number) {
					return x <= y;
				};
				break;
			case "lt":
				comparator = function (x: number, y: number) {
					return x < y;
				};
				break;
			case "gt":
				comparator = function (x: number, y: number) {
					return x > y;
				};
				break;
			case "eq":
				comparator = function (x: number, y: number) {
					return x === y;
				};
				break;
			case "neq":
				comparator = function (x: number, y: number) {
					return x !== y;
				};
				break;
			default:
				return null;
		}
		return comparator;
	}

	public switchOnSearchKey(mkey: string): string {
		let searchKey: string;
		switch (mkey) {
			case "avg":
				searchKey = "Avg";
				break;
			case "pass":
				searchKey = "Pass";
				break;
			case "fail":
				searchKey = "Fail";
				break;
			case "audit":
				searchKey = "Audit";
				break;
			case "year":
				searchKey = "Year";
				break;
			default: searchKey = "";
		}
		return searchKey;
	}

	public async findCoursesBySComparator(comparator: string,
		skey: string,
		inptstr: string,
		customCourses: boolean,
		ccourses: any[]): Promise<any[]> {
		// skey is one of dept, id, instructor, title, uuid inptstr is anything
		let courses: any[];
		courses = customCourses ? ccourses : await this.setUpSearch();
		let regex: RegExp;
		let listOfCourses = courses.flat(1);
		if (inptstr === "*") {
			regex = new RegExp(".*");
		} else if (inptstr.charAt(0) === "*" && inptstr.charAt(inptstr.length - 1) === "*") {
			regex = new RegExp(".*" + inptstr.substring(1, inptstr.length - 1) + ".*", "i");
		} else if (inptstr.charAt(0) === "*") {
			regex = new RegExp(".*" + inptstr.substring(1) + "$", "i");
		} else if (inptstr.charAt(inptstr.length - 1) === "*") {
			regex = new RegExp("^" + inptstr.substring(0, inptstr.length - 1) + ".*", "i");
		} else {
			regex = new RegExp("^" + inptstr + "$", "i");
		}
		let searchKey: string;
		switch (skey) {
			case "instructor":
				searchKey = "Professor";
				break;
			case "dept":
				searchKey = "Subject";
				break;
			case "id":
				searchKey = "Course";
				break;
			case "uuid":
				searchKey = "id";
				break;
			case "title":
				searchKey = "Title";
				break;
			default:
				return Promise.reject(new InsightError("Invalid ID!"));
		}
		return listOfCourses.filter(function (item) {
			if (comparator === "is") {
				return regex.test(item[searchKey]);
			} else if (comparator === "isnot") {
				return !regex.test(item[searchKey]);
			} else {
				return Promise.reject(new InsightError("invalid comparator in findCoursesBySComparator"));
			}
		});
	}

	public async getAllCourses(): Promise<any[]> {
		// for use when a query has no Filter, or any other time we want to return all sections in a dataset
		let courses = await this.setUpSearch();
		return courses.flat(1);
	}
}
