import QueryDispatch from "./QueryDispatch";
import {InsightError} from "./IInsightFacade";

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
	public order: string;

	constructor(query: any) {
		this.query = query;
		this.mkeys = [];
		this.skeys = [];
		this.validWhere = true;
		this.validOptions = true;
		this.order = "";
	}

	public setUpQueryValidation(datasetIds: string[], query: any): string | null {
		// We can assume query is valid json if query is an object, otherwise query is invalid
		if (typeof query !== "object") {
			return null;
		}

		let id: string;

		// If there is no query.COLUMNS.OPTIONS field, or if that field is an empty list, the query is invalid
		try {
			// if queryKey can't be found or does not contain '_', reject
			let queryKey = query.OPTIONS.COLUMNS[0];
			if (typeof queryKey !== "string" || !queryKey.includes("_")) {
				return null;
			}

			// If id is not in dataset, reject
			id = queryKey.split("_")[0];
			if (id.trim() === "" || !datasetIds.includes(id)  || id.includes("_")) {
				return null;
			}
		} catch (e) {
			return null;
		}
		this.mkeys = [id + "_avg", id + "_pass", id + "_fail", id + "_audit", id + "_year"];
		this.skeys = [id + "_dept", id + "_id", id + "_instructor", id + "_title", id + "_uuid"];
		return id;
	}

	// performs query syntactic checks and accumulates search information by calling
	// deconstructQuery
	// returns QueryDispatch object or null if invalid query
	public async validateAndParseQuery(): Promise<QueryDispatch> {
		let parsedQuery: QueryDispatch | null;

		// Method: check structure from top down
		const outerKeysExpected: string[] = ["WHERE", "OPTIONS"];
		let outerKeys = Object.keys(this.query);

		let invalid = false;
		outerKeys.forEach(function (key, index) {
			if (key !== outerKeysExpected[index]) {
				invalid = true;
			}
		});

		if (invalid) {
			return Promise.reject(new InsightError("invalid WHERE or OPTIONS key"));
		}

		// let index = 0;
		// for (let key of outerKeys) {
		// 	if (key !== outerKeysExpected[index]) {
		// 		return Promise.reject(null);
		// 	}
		// 	index += 1;
		// }

		parsedQuery = await this.deconstructQuery();

		if (parsedQuery === null) {
			return Promise.reject(new InsightError("invalid query"));
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
			queryDispatchObj = new QueryDispatch(true, [], "");
		} else {
			queryDispatchObj = new QueryDispatch(false, [], "");
		}

		// set columns, order in queryDispatchObj
		queryDispatchObj.columns = columns;
		if (this.order !== "") {
			queryDispatchObj.order = this.order;
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
		if (!this.isObject(this.query.WHERE)) {
			this.validWhere = false;
		} else {
			this.checkWhere(this.query.WHERE);
		}
	}

	public checkWhere(obj: any): void {
		if (this.validWhere) {
			if (this.isArray(obj)) {
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
				if (this.isObject(obj[key]) || this.isArray(obj[key])) {
					this.validWhere = false;
				}
			} else if (logicKeys.includes(key)) {
				// AND, OR
				if (!this.isArray(obj[key]) || obj[key].length < 1) {
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

		// require the following to be true
		const onlyOneMkey: boolean = mkeyList.length === 1;
		const onlyOneVal: boolean = valueList.length === 1;
		const validMkey: boolean = this.mkeys.includes(mkeyList[0]);
		let mfield = "";
		if (typeof (mkeyList[0]) !==  "undefined"){
			mfield = mkeyList[0].split("_")[1];
		}
		let expectedValueType: string;
		if (["dept", "id", "instructor", "title", "uuid"].includes(mfield)) {
			expectedValueType = "string";
		} else {
			expectedValueType = "number";
		}
		const valIsCorrectType: boolean = typeof valueList[0] === expectedValueType;

		return onlyOneMkey && onlyOneVal && validMkey && valIsCorrectType;
	}

	public isSComparisonValid(obj: any, key: string): boolean {
		const skeyList = Object.keys(obj[key]);
		const inputstringList: string[] = Object.values(obj[key]);

		// require the following to be true
		const onlyOneSkey: boolean = skeyList.length === 1;
		const onlyOneInputstring: boolean = inputstringList.length === 1;
		const validSkey: boolean = this.skeys.includes(skeyList[0]);
		let sfield = "";
		if (typeof (skeyList[0]) !==  "undefined"){
			sfield = skeyList[0].split("_")[1];
		}
		let expectedValueType: string;
		if (["dept", "id", "instructor", "title", "uuid"].includes(sfield)) {
			expectedValueType = "string";
		} else {
			expectedValueType = "number";
		}

		const validInputType: boolean = typeof inputstringList[0] === expectedValueType;

		if (validInputType && expectedValueType === "string") {
			const validInputAsterisks: boolean = !inputstringList[0]?.slice(1, -1).includes("*");
			return onlyOneSkey && onlyOneInputstring && validSkey && validInputAsterisks;
		}

		return onlyOneSkey && onlyOneInputstring && validSkey && validInputType;
	}

	// sets this.validOptions
	// returns string[] containing columns requested.
	// sets this.order to column to sort on if applicable,
	// this.order === "" otherwise (set in ctor)

	public validateAndParseOptions(): string[] {
		const obj = this.query.OPTIONS;
		const expectedKeys = ["COLUMNS", "ORDER"];
		const keys = Object.keys(obj);

		if (!this.isObject(obj)) {
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
					if (!this.isArray(obj[key])) {
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
				} else if (index === 1 && this.isArray(obj.COLUMNS)) {
					// ORDER
					if (typeof obj[key] !== "string" || !obj.COLUMNS.includes(obj[key])) {
						this.validOptions = false;
					}
				}
			}
		});
		if (this.validOptions) {
			this.order = obj.ORDER;
			return obj.COLUMNS;
		} else {
			return [];
		}
	}
	public traverseArray(arr: any): void {
		arr.forEach((obj: any) => {
			this.checkWhere(obj);
		});
	}
	// code based off of example found at https://davidwells.io/snippets/traverse-object-unknown-size-javascript
	public isArray(arr: any): boolean {
		return Object.prototype.toString.call(arr) === "[object Array]";
	}

	public isObject(obj: any): boolean {
		return Object.prototype.toString.call(obj) === "[object Object]";
	}
}
