import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs-extra";

export abstract class Dataset implements InsightDataset {
	public id: string;
	public kind: InsightDatasetKind;
	public numRows: number;
	protected dataset: any[] | undefined;

	protected constructor(id: string, kind: InsightDatasetKind) {
		this.id = id;
		this.numRows = 0;
		this.kind = kind;
		this.dataset = undefined;
	}

	public deleteDataset(): void {
		delete this.dataset;
	}

	public abstract loadDataset(content: string): Promise<void[]>;

	protected abstract addJSONObjectToDataset(jsonObject: any, filename: string): Promise<Promise<any[]> | undefined>;

	protected abstract validateObject(val: any): boolean;

	public addObject(): void {
		this.numRows += 1;
	}

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

	public async findObjectsByMComparator(mcomparator: string, mkey: string, number: number, customCourses: boolean,
		ccourses: any[]): Promise<any[]> {
		// mcomparator is one of lt, gt, eq, mkey is one of avg, pass, fail, audit, year, lat, lon, seats
		let courses: any[] = customCourses ? ccourses : await this.setUpSearch();
		let listOfCourses = courses.flat(1);
		let comparator = this.switchOnMComparator(mcomparator);
		if (comparator === null) {
			return Promise.reject("Invalid mcomparator!");
		}
		let searchKey: string = switchOnMKey(mkey);
		if (searchKey === "") {
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

	public async findObjectsBySComparator(comparator: string,
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
		let searchKey = switchOnSkey(skey);
		if (searchKey === "") {
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

	public async getAllObjects(): Promise<any[]> {
		// for use when a query has no Filter, or any other time we want to return all sections in a dataset
		let courses = await this.setUpSearch();
		return courses.flat(1);
	}
}

function switchOnSkey(skey: string) {
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
		case "fullname":
			searchKey = "fullname";
			break;
		case "shortname":
			searchKey = "shortname";
			break;
		case "number":
			searchKey = "number";
			break;
		case "name":
			searchKey = "name";
			break;
		case "address":
			searchKey = "address";
			break;
		case "type":
			searchKey = "type";
			break;
		case "furniture":
			searchKey = "furniture";
			break;
		case "href":
			searchKey = "href";
			break;
		default:
			searchKey = "";
			break;
	}
	return searchKey;
}

function switchOnMKey(mkey: string): string {
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
		case "lat":
			searchKey = "lat";
			break;
		case "lon":
			searchKey = "lon";
			break;
		case "seats":
			searchKey = "seats";
			break;
		default: searchKey = "";
	}
	return searchKey;
}

export {switchOnMKey, switchOnSkey};
