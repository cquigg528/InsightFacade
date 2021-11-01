
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

export{isEquivalent, getValueByTranslation, onlyNonUnique, isObject, isArray};
