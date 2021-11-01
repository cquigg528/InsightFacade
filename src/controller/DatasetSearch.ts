export type Comparator = "lt" | "gt" | "nlt" | "ngt" | "eq" | "is" | "isnot" | "neq";
type Field = "avg" | "pass" | "fail" | "audit" | "year" | "dept" | "id" | "instructor" | "title" | "uuid"
				| "fullname" | "shortname" | "number" | "name" | "address" | "lat" | "lon" | "seats" | "type"
				| "furniture" | "href";

export default class DatasetSearch {
	public comparator: Comparator;
	public field: Field;
	public value: string | number;

	constructor(comparator: Comparator, field: Field, value: string | number) {
		this.comparator = comparator;
		this.field = field;
		this.value = value;
	}
}
