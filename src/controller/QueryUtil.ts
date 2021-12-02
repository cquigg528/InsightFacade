import DatasetSearch from "./DatasetSearch";
import QueryFilter from "./QueryFilter";
import Decimal from "decimal.js";
import {switchOnSkey, switchOnMKey} from "./Dataset";
import QueryDispatch from "./QueryDispatch";
import { QueryValidator } from "./QueryValidator";

// from http://adripofjavascript.com/blog/drips/object-equality-in-javascript.html
function isEquivalent(a: any, b: any): boolean {
	let aProps = Object.getOwnPropertyNames(a);
	let bProps = Object.getOwnPropertyNames(b);
	if (aProps.length !== bProps.length) {
		return false;
	}
	for (let propName of aProps) {
		if (a[propName] !== b[propName]) {
			return false;
		}
	}
	return true;
}

function getValueByTranslation(section: any, queryKey: string): number | string {
	let searchKey: string = "";
	let propKey = queryKey.split("_")[1];
	switch (propKey) {
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
			searchKey = propKey;
	}
	if (searchKey === "Year") {
		if (section["Section"] === "overall") {
			return 1900;
		}
		return parseInt(section[searchKey], 10);
	}
	if (searchKey === "id") {
		return String(section[searchKey]);
	}
	return section[searchKey];
}

function onlyNonUnique(value: any, ind: any, self: any) {
	return !(self.indexOf(value) === ind);
}

function computeAggregationResult(searchResult: any[], thisGroup: string[], applyRules: any[], columns: any[]): any[] {
	let groupedResult: any[] = groupResult(searchResult, thisGroup);
	let result: any[] = [];

	groupedResult.forEach((set) => {
		result.push(getTransformed(set, applyRules, columns));
	});
	return result;
}

function groupResult(data: any[], groups: string[]): any[] {
	let groupedResult: any[] = [];
	let groupIDs: any[] = [];
	let thisGroup: any[] = [];
	let setAdded: boolean = false;

	data.forEach((element) => {
		setAdded = false;
		thisGroup = [];
		groups.forEach((column) => {
			thisGroup.push(element[column]);
		});
		// referenced: https://stackoverflow.com/questions/41661287/how-to-check-if-an-array-contains-another-array
		let index: number = 0;
		groupIDs.forEach((item) => {


			if(JSON.stringify(item) === JSON.stringify(thisGroup)) {
				groupedResult[index].push(element);
				setAdded = true;
			}
			index++;
		});

		if (!setAdded) {
			let newSet: any[] = [];
			newSet.push(element);
			groupedResult.push(newSet);
			groupIDs.push(thisGroup);
		}


	});
	return groupedResult;
}

function getTransformed(set: Set<any>, applyRules: any[], columns: any[]): any[] {
	let opNames: string[] = [];
	let operations: string[] = [];
	let targetCols: string[] = [];
	let result: any;
	let ogSet = set.values().next().value;

	({opNames, operations, targetCols} = getColumnsFromApply(applyRules));

	result = set.values().next().value;

	opNames.forEach((col) => {
		let index: number = opNames.indexOf(col);
		result[col] = applyOperation(set, operations[index], targetCols[index]);
	});
	columns.forEach((col) => {
		if(!opNames.includes(col)) {
			let i: number = 0;
			Object.keys(ogSet).forEach((key) => {
				if(key === col) {

					result[col] = Object.values(ogSet)[i];
				}
				i += 1;
			});
		}
	});


	Object.keys(result).forEach((key) => {
		if(!columns.includes(key)) {
			delete result[key];
		}
	});


	return result;
}

function getColumnsFromApply(applyRules: any[]){
	let opNames: string[] = [];
	let operations: string[] = [];
	let targetCols: string[] = [];
	applyRules.forEach((namedTransformer) => {
		let innerObj: any = Object.values(namedTransformer)[0];
		opNames.push(Object.keys(namedTransformer)[0]);
		operations.push(Object.keys(innerObj)[0]);
		targetCols.push(Object.values(innerObj)[0] as string);

	});
	return {opNames, operations, targetCols};
}

function applyOperation(thisGroup: Set<any>, operation: string, targetCol: string): any {
	let result: any = 0;
	let valuesForOp: any[] = [];
	// let skeySwitched = switchOnSkey(targetCol.split("_")[1]);
	// let translatedTargetCol = (skeySwitched === "") ? switchOnMKey(targetCol.split("_")[1]) : skeySwitched;

	thisGroup.forEach((item) => {
		valuesForOp.push(item[targetCol]);
	});

	if (operation === "MAX") {
		result = valuesForOp.reduce(function(a, b) {
			return Math.max(a, b);
		}, -1);
	} else if (operation === "MIN") {
		result = valuesForOp.reduce(function(a, b) {
			return Math.min(a, b);
		}, 10000);
	} else if (operation === "AVG") {
		let total = calcAvgSum(valuesForOp);
		let avg = total.toNumber() / valuesForOp.length;
		result = Number(avg.toFixed(2));
	} else if (operation === "COUNT") {
		result = (new Set(valuesForOp)).size;
	} else if (operation === "SUM") {
		result = Number(calcSum(valuesForOp).toFixed(2));
	} else {
		result = -1;
	}

	return result;
}

function calcSum(values: any[]): number {
	let result: number = 0;
	values.forEach((element) => {
		result += element;
	});
	return result;
}

function calcAvgSum(values: any[]): Decimal {
	let result: Decimal = new Decimal(0);
	let num: Decimal;
	values.forEach((element) => {
		num = new Decimal(element);
		result = Decimal.add(result,num);
	});
	return result;
}
function negateSearches(searches: DatasetSearch[]): void {
	searches.forEach((search) => {
		if (search.comparator === "lt") {
			search.comparator = "nlt";
		} else if (search.comparator === "gt") {
			search.comparator = "ngt";
		} else if (search.comparator === "eq") {
			search.comparator = "neq";
		} else if (search.comparator === "neq") {
			search.comparator = "eq";
		} else if (search.comparator === "is") {
			search.comparator = "isnot";
		} else if (search.comparator === "isnot") {
			search.comparator = "is";
		} else if (search.comparator === "nlt") {
			search.comparator = "lt";
		} else if (search.comparator === "ngt") {
			search.comparator = "gt";
		}
	});
}

function negateSubTree(query: QueryFilter): void {
	if (query.self === "AND") {
		query.self = "OR";
	} else if (query.self === "OR") {
		query.self = "AND";
	} else if (query.self === "NNOT") {
		query.self = "NOT";
	}
	if (query.self === "NOT") {
		query.self = "NNOT";
	} else {
		if (query.searches.length !== 0) {
			negateSearches(query.searches);
		}
		if (query.children.length !== 0) {
			query.children.forEach((child) => {
				negateSubTree(child);
			});
		}
	}
}


// code based off of example found at https://davidwells.io/snippets/traverse-object-unknown-size-javascript
function isArray(arr: any): boolean {
	return Object.prototype.toString.call(arr) === "[object Array]";
}

function isObject(obj: any): boolean {
	return Object.prototype.toString.call(obj) === "[object Object]";
}


export {isEquivalent, getValueByTranslation, onlyNonUnique, getColumnsFromApply,
	computeAggregationResult, negateSearches, negateSubTree, isObject, isArray};
