import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";
import {Dataset} from "./Dataset";

export class CoursesDataset extends Dataset {

	constructor(id: string, kind: InsightDatasetKind) {
		super(id, kind);
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
			promises.push(this.addJSONObjectToDataset(jsonObject, filename));
		}
		return await Promise.all(promises);
	}

	// In this class we can add different methods to search for a course from disk
	// We will handle the logic of parsing the query in InsightFacade
	// Then call the appropriate getter that's here in Dataset

	protected async setUpSearch(): Promise<any[]> {
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
		return listOfCourses;
	}

	public async findCoursesByMComparator(mcomparator: string, mkey: string, number: number): Promise<any[]> {
		// mcomparator is one of lt, gt, eq
		// mkey is one of avg, pass, fail, audit, year
		// number is a number
		let courses = await this.setUpSearch();
		let listOfCourses = courses.flat(1);
		let comparator: any;
		switch (mcomparator) {
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
		default:
			return Promise.reject("Invalid mcomparator!");
		}
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
		default:
			return Promise.reject("Invalid mkey!");
		}
		return listOfCourses.filter(function (item) {
			return comparator(parseInt(item[searchKey], 10), number);
		});
	}

	public async findCoursesBySComparator(skey: string, inputstring: string): Promise<any[]> {
		// skey is one of dept, id, instructor, title, uuid
		// inputstring is anything
		let regex: RegExp;
		let courses = await this.setUpSearch();
		let listOfCourses = courses.flat(1);
		if ((inputstring.charAt(0) === "*") && (inputstring.charAt(inputstring.length - 1) === "*")) {
			regex = new RegExp(".*" + inputstring.substring(1, inputstring.length - 1) + ".*", "i");
		} else if (inputstring.charAt(0) === "*") {
			regex = new RegExp(".*" + inputstring.substring(1), "i");
		} else if (inputstring.charAt(inputstring.length - 1) === "*") {
			regex = new RegExp(inputstring.substring(0, inputstring.length - 1) + ".*", "i");
		} else {
			regex = new RegExp(inputstring, "i");
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
			searchKey = "Section";
			break;
		case "title":
			searchKey = "Title";
			break;
		default:
			return Promise.reject(new InsightError("Invalid ID!"));
		}
		return listOfCourses.filter(function (item) {
			// We test each element of the object to see if one string matches the regexp.
			return (regex.test(item[searchKey]));
		});
	}

	public async getAllCourses(): Promise<any[]> {
		// for use when a query has no Filter, or any other time we want to return all sections in a dataset
		let courses = await this.setUpSearch();
		return courses.flat(1);
	}
}
