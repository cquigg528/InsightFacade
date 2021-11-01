import QueryDispatch from "./QueryDispatch";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import {isArray, isObject} from "./QueryUtil";
import {validateSort, validateTransform} from "./QueryTransformSortUtil";
const logicKeys = ["AND", "OR"];
const mCompareKeys = ["LT", "GT", "EQ"];
const sCompareKey = "IS";
const negationKey = "NOT";
const possibleKeys = logicKeys.concat(mCompareKeys).concat(sCompareKey).concat(negationKey);

export class QueryValidator {
	public query: any;
	public mkeys: string[];
	public skeys: string[];
	public validWhere: boolean;
	public validOptions: boolean;
	public order: string[];
	public orderDir: string;
	public hasTransforms: boolean;
	public datasetType: string;
	constructor(query: any) {
		this.query = query;
		this.mkeys = [];
		this.skeys = [];
		this.validWhere = true;
		this.validOptions = true;
		this.order = [];
		this.orderDir = "";
		this.hasTransforms = false;
		this.datasetType = "";
	}

	public setUpQueryValidation(datasetIds: string[], query: any): string | null {
		if (typeof query !== "object") {
			return null;
		}
		let id = null;
		let validColumnKeysCourses, validColumnKeysRooms: boolean = false;
		// If there is no query.COLUMNS.OPTIONS field, or if that field is an empty list, the query is invalid
		try {
			let queryKeyList = query.OPTIONS.COLUMNS;
			const queryKey = queryKeyList.find((key: string) => key.includes("_"));
			if (typeof queryKey === "undefined" || typeof  queryKey !== "string") {
				return null;
			}
			// If id is not in dataset, reject
			id = queryKey.split("_")[0];
			if (id.trim() === "" || !datasetIds.includes(id)  || id.includes("_") || queryKey.split("_").length !== 2) {
				return null;
			}
			// Check that all keys in columns are of type room or course
			let field: string = queryKey.split("_")[1];
			let courseFields = ["avg", "pass", "fail", "audit", "dept", "year", "id", "instructor", "title", "uuid"];
			let roomFields = ["fullname", "shortname", "number", "name", "address", "lat", "lon", "seats", "type",
				"furniture", "href"];
			if (courseFields.includes(field)) {
				validColumnKeysCourses = queryKeyList.every((key: string) =>
					key.includes("_") ? courseFields.includes(key.split("_")[1]) : false);
				if (validColumnKeysCourses) {
					this.mkeys = [id + "_avg", id + "_pass", id + "_fail", id + "_audit", id + "_year"];
					this.skeys = [id + "_dept", id + "_id", id + "_instructor", id + "_title", id + "_uuid"];
				}
			} else if (roomFields.includes(field)) {
				validColumnKeysRooms = queryKeyList.every((key: string) =>
					key.includes("_") ? roomFields.includes(key.split("_")[1]) : false);
				if (validColumnKeysRooms) {
					this.mkeys = [id + "_lat", id + "_lon", id + "_seats"];
					this.skeys = [id + "_fullname", id + "_shortname", id + "_number", id + "_name", id + "_address",
						id + "_type", id + "_furniture", id + "_href"];
				}
			}
		} catch (e) {
			return null;
		}
		return (validColumnKeysCourses || validColumnKeysRooms) ? id : null;
	}

	// performs query syntactic checks and accumulates search information by calling
	// deconstructQuery
	// returns QueryDispatch object or null if invalid query
	public async validateAndParseQuery(): Promise<QueryDispatch> {
		let parsedQuery: QueryDispatch | null;
		if (this.mkeys.length === 3) {
			this.datasetType = "rooms";
		} else {
			this.datasetType = "courses";
		}
		const outerKeysExpected: string[] = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];
		let outerKeys = Object.keys(this.query);
		if (outerKeys.length > 3) {
			return Promise.reject(new InsightError("too many outer keys"));
		}
		let invalid = false;
		outerKeys.forEach((key, index) => {
			if (key !== outerKeysExpected[index]) {
				invalid = true;
			}
			if (index === 2) {
				this.hasTransforms = true;
			}
		});
		if (invalid) {
			return Promise.reject(new InsightError("invalid WHERE or OPTIONS key"));
		}
		parsedQuery = await this.deconstructQuery();
		if (parsedQuery === null) {
			return Promise.reject(new InsightError("invalid query"));
		} else if (this.hasTransforms) {
			return validateTransform(parsedQuery, this.query.TRANSFORMATIONS, this.mkeys, this.skeys) ?
				Promise.resolve(parsedQuery) : Promise.reject(new InsightError("invalid transform"));
		} else {
			return Promise.resolve(parsedQuery);
		}
	}

	// Calls recursive helper to build a list of QueryFilters while parsing the query.  Returns null
	// if query found to be invalid at any time
	// REQUIRES: query has outer ordered keys ["WHERE", "OPTIONS"]
	public async deconstructQuery(): Promise<any> {
		let queryDispatchObj: QueryDispatch;
		this.validateWhere();
		const columns: string[] = this.validateAndParseOptions();
		if (!this.validWhere || !this.validOptions) {
			return Promise.reject(new InsightError("invalid where or options block"));
		}
		// first check if we even have any filters
		if (Object.entries(this.query.WHERE).length === 0) {
			queryDispatchObj = new QueryDispatch(true, columns);
		} else {
			queryDispatchObj = new QueryDispatch(false, columns);
		}
		if (queryDispatchObj.emptyWhere) {
			return Promise.resolve(queryDispatchObj);
		}
		// build query dispatch
		const filterObj = this.query.WHERE;
		queryDispatchObj.buildQueryDispatch(filterObj);
		return Promise.resolve(queryDispatchObj);
	}

	public validateWhere(): void {
		if (!isObject(this.query.WHERE)) {
			this.validWhere = false;
		} else {
			this.checkWhere(this.query.WHERE);
		}
	}

	public checkWhere(obj: any): void {
		if (this.validWhere) {
			if (isArray(obj)) {
				this.traverseArray(obj);
			} else if (typeof obj === "object" && obj !== null) {
				this.traverseObject(obj);
			}
		}
	}

	public traverseObject(obj: any): void {
		const keys = Object.keys(obj);
		keys.forEach((key) => {
			// restrict acceptable keys to those in EBNF
			if (!possibleKeys.concat(this.mkeys).concat(this.skeys).includes(key)) {
				this.validWhere = false;
			} else if (this.mkeys.concat(this.skeys).includes(key)) {
				if (isObject(obj[key]) || isArray(obj[key])) {
					this.validWhere = false;
				}
			} else if (logicKeys.includes(key)) {
				// AND, OR
				if (!isArray(obj[key]) || obj[key].length < 1) {
					this.validWhere = false;
				} else {
					obj[key].forEach((logicObj: any) => {
						if (Object.keys(logicObj).length !== 1) {
							this.validWhere = false;
						}
					});
				}
			} else if (mCompareKeys.includes(key)) {
				// LT, GT, EQ
				// check that key satisfies id_mkey and value is number or string as req'd
				if (!this.isMComparisonValid(obj, key)) {
					this.validWhere = false;
				}
			} else if (sCompareKey.includes(key)) {
				// IS
				// check that key satisfies id_skey and inputstring does not include '*' except maybe endpoints
				if (!this.isSComparisonValid(obj, key)) {
					this.validWhere = false;
				}
			}
			this.checkWhere(obj[key]);
		});
	}

	public isMComparisonValid(obj: any, key: string): boolean {
		const mkeyList = Object.keys(obj[key]);
		const valueList = Object.values(obj[key]);

		let expectedFields: string [] = [];
		if (this.datasetType === "courses") {
			expectedFields = ["avg", "pass", "fail", "audit", "year"];
		} else if (this.datasetType === "rooms") {
			expectedFields = ["lat", "lon", "seats"];
		}

		// require the following to be true
		const onlyOneMkey: boolean = mkeyList.length === 1;
		const onlyOneVal: boolean = valueList.length === 1;
		const validMkey: boolean = this.mkeys.includes(mkeyList[0]);
		let mfield = "";
		if (typeof (mkeyList[0]) !==  "undefined"){
			mfield = mkeyList[0].split("_")[1];
		}
		let expectedValueType: string = "";
		if (expectedFields.includes(mfield)) {
			expectedValueType = "number";
		}
		const valIsCorrectType: boolean = typeof valueList[0] === expectedValueType;

		return onlyOneMkey && onlyOneVal && validMkey && valIsCorrectType;
	}

	public isSComparisonValid(obj: any, key: string): boolean {
		const skeyList = Object.keys(obj[key]);
		const inputstringList: string[] = Object.values(obj[key]);

		let expectedFields: string [] = [];
		if (this.datasetType === "courses") {
			expectedFields = ["dept", "id", "instructor", "title", "uuid"];
		} else if (this.datasetType === "rooms") {
			expectedFields = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
		}

		// require the following to be true
		const onlyOneSkey: boolean = skeyList.length === 1;
		const onlyOneInputstring: boolean = inputstringList.length === 1;
		const validSkey: boolean = this.skeys.includes(skeyList[0]);
		let sfield = "";
		if (typeof (skeyList[0]) !==  "undefined"){
			sfield = skeyList[0].split("_")[1];
		}
		let expectedValueType: string = "";
		if (expectedFields.includes(sfield)) {
			expectedValueType = "string";
		}
		const validInputType: boolean = typeof inputstringList[0] === expectedValueType;
		if (validInputType && expectedValueType === "string") {
			const validInputAsterisks: boolean = !inputstringList[0]?.slice(1, -1).includes("*");
			return onlyOneSkey && onlyOneInputstring && validSkey && validInputAsterisks;
		}
		return onlyOneSkey && onlyOneInputstring && validSkey && validInputType;
	}

	public validateAndParseOptions(): string[] {
		const obj = this.query.OPTIONS;
		const expectedKeys = ["COLUMNS", "ORDER"];
		const keys = Object.keys(obj);
		let hasOrder = false;
		if (!isObject(obj)) {
			this.validOptions = false;
		} else if (keys.length > 2 || keys.length === 0) {
			this.validOptions = false;
		}
		keys.forEach((key, index) => {
			if (key !== expectedKeys[index]) {
				this.validOptions = false;
			} else {
				if (index === 0) {
					// COLUMNS
					if (!isArray(obj[key])) {
						this.validOptions = false;
					} else if (obj[key].length === 0) {
						this.validOptions = false;
					} else {
						obj[key].forEach((column: string) => {
							if (!this.mkeys.concat(this.skeys).includes(column)) {
								this.validOptions = false;
							}
						});
					}
				} else if (index === 1 && isArray(obj.COLUMNS)) {
					hasOrder = true;
					validateSort(this, obj[key], obj.COLUMNS);
				}
			}
		});
		if (this.validOptions) {
			return obj.columns;
		}
		return [];
	}

	public traverseArray(arr: any): void {
		arr.forEach((obj: any) => {
			this.checkWhere(obj);
		});
	}
}
