// list some types we'll need for query validation and parsing
// NOTE: Does not perfectly reflect EBNF.  mkey and skey are
// missing the dataset id and underscore.  We are tracking mfield and sfield here
export type Filter = LogicComparison | MComparison | SComparison | Negation | null;
export type FilterTuple = [Filter, null | MField | SField | QueryFilters[]];
type LogicComparison = Logic;
type MComparison = MComparator;
type SComparison = SField;
type Negation = "not";
type MComparator = "lt" | "gt" | "eq";
type Logic = "and" | "or";
type MField = "avg" | "pass" | "fail" | "audit" | "year";
type SField = "dept" | "id" | "instructor" | "title" | "uuid";

export default class QueryFilters {
	// represents one filter.  A query will typically have multiple nested filters.
	// A QueryFilters object can reference other QueryFilters objects to handle LogicComparison and Negation

	// Linked list style data structure meant to facilitate Dataset method dispatch
	public root: boolean;

	// indicates whether any filters are present.  True means no filters, return all results
	public emptyWhere: boolean;

	// if emptyWhere is false, this indicates how we're filtering a dataset
	// filter is a tuple of Filter, MField | SField | [QueryFilters | QueryFilters]
	// If Filter is Logic: second will be [QueryFilters | QueryFilters]
	// If Filter is Negation: second will be QueryFilters
	public filter: FilterTuple;

	public columns: string[];

	public order: string[];

	constructor(root: boolean, emptyWhere: boolean, filter: FilterTuple) {
		this.root = root;
		this.emptyWhere = emptyWhere;
		this.filter = filter;
		this.columns = [];
		this.order = [];
	}
}

// Not using this but keeping it commented out for now in case we want to use it in the future
// interface JSONCourse {
// 	tier_eight_five: number;
// 	tier_ninety: number;
// 	Title: string;
// 	Section: string;
// 	Detail: string;
// 	tier_seventy_two: number;
// 	Other: number;
// 	Low: number;
// 	tier_sixty_four: number;
// 	tier_zero: number;
// 	tier_seventy_six: number;
// 	tier_thirty: number;
// 	tier_fifty: number;
// 	Professor: string;
// 	Audit: number;
// 	tier_g_fifty: number;
// 	tier_forty: number;
// 	Withdrew: number;
// 	Year: string;
// 	tier_twenty: number;
// 	Stddev: number;
// 	Enrolled: number;
// 	tier_fifty_five: number;
// 	tier_eighty: number;
// 	tier_sixty: number;
// 	tier_ten: number;
// 	High: number;
// 	Course: string;
// 	Session: string;
// 	Pass: number;
// 	Fail: number;
// 	Avg: number;
// 	Campus: string;
// 	Subject: string;
// }
