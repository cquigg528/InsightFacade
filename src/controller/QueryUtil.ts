// from http://adripofjavascript.com/blog/drips/object-equality-in-javascript.html
import QueryDispatch from "./QueryDispatch";
import {QueryValidator} from "./QueryValidator";

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
	}
	if(searchKey === "Year") {
		if(section["Section"] === "overall"){
			return 1900;
		}
		return parseInt(section[searchKey], 10);
	}
	if(searchKey === "id") {
		return String(section[searchKey]);
	}
	return section[searchKey];
}

function onlyNonUnique(value: any, ind: any, self: any) {
	return !(self.indexOf(value) === ind);
}

// code based off of example found at https://davidwells.io/snippets/traverse-object-unknown-size-javascript
function isArray(arr: any): boolean {
	return Object.prototype.toString.call(arr) === "[object Array]";
}

function isObject(obj: any): boolean {
	return Object.prototype.toString.call(obj) === "[object Object]";
}

function validateTransform(parsedQuery: QueryDispatch, transObj: any, mkeys: string[], skeys: string[]): boolean {
	let applyKeys: string[] = [];
	if (!isObject(transObj)) {
		return false;
	}
	let expectedKeys = ["GROUP", "APPLY"];
	if (Object.keys(transObj).length > 2) {
		return false;
	}
	Object.keys(transObj).forEach((key, index) => {
		if (key !== expectedKeys[index]) {
			return false;
		} else if (index === 0) {
			if (!isArray(transObj[key])) {
				return false;
			}
			for (let groupKey of transObj[key]) {
				if (!mkeys.concat(skeys).includes(groupKey)) {
					return false;
				} else {
					parsedQuery.group.push(groupKey);
				}
			}
		} else if (index === 1) {
			if (!isArray(transObj[key])) {
				return false;
			} else if (transObj[key].length !== 0) {
				for (let applyObj of transObj[key]) {
					if (!isObject(applyObj) || Object.keys(applyObj).length !== 1) {
						return false;
					} else if (Object.keys(applyObj)[0].includes("_")) {
						return false;
					}
					applyKeys.push(Object.keys(applyObj)[0]);
					if (Object.values(applyObj).length !== 1) {
						return false;
					}
					let innerApplyValid = checkInnerApply(Object.values(applyObj)[0], mkeys, skeys);
					if (innerApplyValid) {
						parsedQuery.applyRules.push(Object.values(applyObj)[0]);
					} else {
						return false;
					}
				}
			}
		}
	});
	return checkApplyKeysAndCols(parsedQuery, applyKeys) ;
}

function checkApplyKeysAndCols(parsedQuery: QueryDispatch, applyKeys: string[]): boolean {
	if (new Set(applyKeys).size !== applyKeys.length) {
		return false;
	} else {
		for (let colEntry of parsedQuery.columns) {
			if (!applyKeys.includes(colEntry) && !parsedQuery.group.includes(colEntry)) {
				return false;
			}
		}
	}
	return true;
}

function checkInnerApply(innerObj: any, mkeys: string[], skeys: string[]): boolean {
	const applyTokens = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
	const key = Object.keys(innerObj);
	const val = Object.values(innerObj);
	if (key.length !== 1 || val.length !== 1 || !applyTokens.includes(key[0])) {
		return false;
	} else if (key[0] === "COUNT" && !mkeys.concat(skeys).includes(val[0] as string)) {
		return false;
	} else {
		return !(key[0] !== "COUNT" && !mkeys.includes(val[0] as string));
	}
}

function validateSort(validator: QueryValidator, order: any, columns: string[]): void {
	if (isObject(order)) {
		const sortKeys = ["dir", "keys"];

		Object.keys(order).forEach((sortkey, i) => {
			if (i < 2) {
				if (sortkey !== sortKeys[i]) {
					validator.validOptions = false;
				} else if (i === 0) {
					if (order.sortkey !== "UP" && order.sortkey !== "DOWN") {
						validator.validOptions = false;
					} else {
						validator.orderDir = order.sortkey;
					}
				} else if (i === 1) {
					if (typeof order.sortkey === "string" && columns.includes(order.sortkey)) {
						validator.order.push(order.sortkey);
					} else if (isArray(order.sortkey)) {
						order.sortkey.forEach((key: string) => {
							if (columns.includes(key)) {
								validator.order.push(key);
							} else {
								validator.validOptions = false;
							}
						});
					}
				}
			} else {
				validator.validOptions = false;
			}
		});
	} else if (typeof order !== "string" || columns.includes(order)) {
		validator.order.push(order);
	} else {
		validator.validOptions = false;
	}
}


export{isEquivalent, getValueByTranslation, onlyNonUnique, isObject, isArray, validateTransform, validateSort};
