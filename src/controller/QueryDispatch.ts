import QueryFilter from "./QueryFilter";
import DatasetSearch, {Comparator} from "./DatasetSearch";

const searchKeys: string[] = ["lt", "gt", "eq", "is"];
export default class QueryDispatch {

	public query: QueryFilter | null;

	// indicates whether any filters are present.  True means no filters, return all results
	public emptyWhere: boolean;

	public columns: string[];
	public order: string;

	constructor(emptyWhere: boolean, columns: string[], order: string) {
		this.query = null;
		this.emptyWhere = emptyWhere;
		this.columns = columns;
		this.order = order;
	}

	public buildQueryDispatch(filterObj: any): void {
		let firstFilter: string = Object.keys(filterObj)[0];

		// create head
		let head: QueryFilter = new QueryFilter(null, firstFilter, [], []);

		this.query = this.traverseQuery(head, filterObj);
	}

	public traverseQuery(node: QueryFilter, filterObj: any): QueryFilter {
		Object.keys(filterObj).forEach((key: string) => {
			if (key === "WHERE") {
				this.traverseQuery(node, filterObj[key]);
			} else if (key === "AND" || key === "OR") {
				let newNode: QueryFilter = new QueryFilter(node, key, [], []);
				node.children.push(newNode);

				// obj[key] is array in this case
				const numChildren: number = filterObj[key].length;
				for (let i = 0; i < numChildren; i++) {
					// only add children for nested AND, OR, or NOT
					Object.keys(filterObj[key][i]).forEach((nestedObjKey) => {
						if (nestedObjKey === "AND" || nestedObjKey === "OR" || nestedObjKey === "NOT") {
							let newNodeChild: QueryFilter = new QueryFilter(newNode, nestedObjKey, [], []);
							Object.values(filterObj[key][i][nestedObjKey]).forEach((obj, index) => {
								let nestedObj = this.traverseQuery(newNodeChild, obj);
								let repeat = newNode.children.some((queryFilter) => {
									return queryFilter === nestedObj;
								});
								if (!repeat) {
									newNode.children.push(nestedObj);
								}
							});
							let objCount = Object.values(filterObj[key][i][nestedObjKey]).length - 1;
							// newNode.children.push(this.traverseQuery(newNodeChild, Object.values(filterObj[key][i][nestedObjKey])[0]));
						} else {
							// next item is a Dataset filter, simply pass current node in recursion
							this.traverseQuery(newNode, filterObj[key][i]);
						}
					});
				}
			} else if (key === "NOT") {
				let newNode: QueryFilter = new QueryFilter(node, key, [], []);
				node.children.push(this.traverseQuery(newNode, filterObj[key]));
			} else if (searchKeys.includes(key.toLowerCase())) {
				// instantiate DatasetSearch object here
				let comparator = key.toLowerCase() as any;
				const field = Object.keys(filterObj[key])[0] as any;
				const value = Object.values(filterObj[key])[0] as any;
				const datasetSearch: DatasetSearch = new DatasetSearch(comparator, field, value);

				// assign to filter
				node.searches.push(datasetSearch);
			} else {
				return;
			}
		});
		return node;
	}


	public traverseArray(arr: any): void {
		arr.forEach((key: any) => {
			this.traverseArray(key);
		});
	}

	public isArray(arr: any): boolean {
		return Object.prototype.toString.call(arr) === "[object Array]";
	}


}
