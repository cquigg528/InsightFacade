import DatasetSearch from "./DatasetSearch";
import QueryFilter from "./QueryFilter";
// from http://adripofjavascript.com/blog/drips/object-equality-in-javascript.html
import QueryDispatch from "./QueryDispatch";
import { QueryValidator } from "./QueryValidator";

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

function computeAggregationResult(searchResult: any[], group: string[], applyRules: any[]): any[] {
	let groupedResult: any[] = groupResult(searchResult, group);
	let result: any[] = [];

	groupedResult.forEach((set) => {
		result.push(getTransformed(set, applyRules));
	});
	return result;
}

function groupResult(data: any[], groups: string[]): any[] {
	let groupedResult: any[] = [];
	let matchesSet: boolean = true;
	let setMatched: boolean = false;
	let valueForSet: Set<any>;

	data.forEach((element) => {
		groupedResult.forEach((set) => {
			({ setMatched, matchesSet } = setAlreadyExists(setMatched, groups, matchesSet, element, set));
		});
		// create and add new set that has unmatched values so far
		valueForSet = new Set();
		valueForSet.add(element);
		groupedResult.push(valueForSet);
	});

	return groupedResult;
}

function getTransformed(set: Set<any>, applyRules: any[]): any[] {
	let group: any[] = [];
	let opNames: string[] = [];
	let operations: string[] = [];
	let targetCols: string[] = [];
	let result: any[] = [];
	for (let item in set) {
		group.push(item);
	}

	applyRules.forEach((namedTransformer) => {
		opNames.push(namedTransformer.key);
		operations.push(namedTransformer.key.key);
		targetCols.push(namedTransformer.key.value);
	});

	for (let i = 0; i < opNames.length; i++) {
		result.push({
			key: opNames[i],
			value: applyOperation(group, operations[i], targetCols[i]),
		});
	}

	return result;
}

function applyOperation(group: any[], operation: string, targetCol: string): any {
	let result: any;
	let valuesForOp: number[] = [];

	group.forEach((item) => {
		valuesForOp.push(parseFloat(item[targetCol]));
	});

	if (operation === "MAX") {
		result = Math.max.apply(null, valuesForOp);
	} else if (operation === "MIN") {
		result = Math.min.apply(null, valuesForOp);
	} else if (operation === "AVG") {
		result = calcSum(valuesForOp) / valuesForOp.length;
	} else if (operation === "COUNT") {
		let set = new Set(valuesForOp);
		result = set.size;
	} else if (operation === "SUM") {
		result = calcSum(valuesForOp);
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

function setAlreadyExists(setMatched: boolean, groups: string[], matchesSet: boolean, element: any, set: any) {
	if (!setMatched) {
		groups.forEach((group) => {
			matchesSet = matchesSet && element[group] === set.values().next().value[group];
		});
		if (matchesSet) {
			set.add(element);
			setMatched = true;
		}
	}
	return { setMatched, matchesSet };
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
		}
	});
}

function negateSubTree(query: QueryFilter): void {
	if (query.self === "AND") {
		query.self = "OR";
	} else if (query.self === "OR") {
		query.self = "AND";
	} else if (query.self === "NOT") {
		query.self = "NNOT";
	} else if (query.self === "NNOT") {
		query.self = "NOT";
	}
	if (query.searches.length !== 0) {
		negateSearches(query.searches);
	}
	if (query.children.length !== 0) {
		query.children.forEach((child) => {
			negateSubTree(child);
		});
	}
}

// code based off of example found at https://davidwells.io/snippets/traverse-object-unknown-size-javascript
function isArray(arr: any): boolean {
	return Object.prototype.toString.call(arr) === "[object Array]";
}

function isObject(obj: any): boolean {
	return Object.prototype.toString.call(obj) === "[object Object]";
}


export { isEquivalent, getValueByTranslation, onlyNonUnique,
	computeAggregationResult, negateSearches, negateSubTree, isObject, isArray };
