import QueryFilter from "./QueryFilter";
import DatasetSearch from "./DatasetSearch";
import {InsightError} from "./IInsightFacade";
import {getValueByTranslation, isEquivalent} from "./QueryUtil";
import {CoursesDataset} from "./CoursesDataset";

const searchKeys: string[] = ["lt", "gt", "eq", "is"];
export default class QueryDispatch {
	public query: QueryFilter | null;
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
				this.handleNestedArrays(newNode, filterObj[key]);
			} else if (key === "NOT") {
				let newNode: QueryFilter = new QueryFilter(node, key, [], []);
				node.children.push(newNode);
				let nestedObjKey = Object.keys(filterObj[key])[0];
				if (nestedObjKey === "AND" || nestedObjKey === "OR") {
					let newNodeChild: QueryFilter = new QueryFilter(newNode, nestedObjKey, [], []);
					Object.values(filterObj[key][nestedObjKey]).forEach((obj, index) => {
						let nestedObj = this.traverseQuery(newNodeChild, obj);
						let repeat = newNode.children.some((queryFilter) => {
							return queryFilter === nestedObj;
						});
						if (!repeat) {
							newNode.children.push(nestedObj);
						}
					});
				} else if (nestedObjKey === "NOT") {
					let newNodeChild: QueryFilter = new QueryFilter(newNode, nestedObjKey, [], []);
					let obj = filterObj[key][nestedObjKey];
					let nestedObj = this.traverseQuery(newNodeChild, obj);
					let repeat = newNode.children.some((queryFilter) => {
						return queryFilter === nestedObj;
					});
					if (!repeat) {
						newNode.children.push(nestedObj);
					}
				} else {
					// next item is a Dataset filter, simply pass current node in recursion
					this.traverseQuery(newNode, filterObj[key]);
				}
			} else if (searchKeys.includes(key.toLowerCase())) {
				// instantiate DatasetSearch object here
				let comparator = key.toLowerCase() as any;
				let field = Object.keys(filterObj[key])[0] as any;
				field = field.split("_")[1];
				const value = Object.values(filterObj[key])[0] as any;
				const datasetSearch: DatasetSearch = new DatasetSearch(comparator, field, value);
				// assign to filter
				node.searches.push(datasetSearch);
			} else {
				return;
			}
		}); return node;
	}

	public handleNestedArrays(newNode: QueryFilter, innerObj: any): void {
		const numChildren: number = innerObj.length;
		for (let i = 0; i < numChildren; i++) {
			// only add children for nested AND, OR, or NOT
			Object.keys(innerObj[i]).forEach((nestedObjKey) => {
				if (nestedObjKey === "AND" || nestedObjKey === "OR") {
					let newNodeChild: QueryFilter = new QueryFilter(newNode, nestedObjKey, [], []);
					Object.values(innerObj[i][nestedObjKey]).forEach((obj, index) => {
						let nestedObj = this.traverseQuery(newNodeChild, obj);
						let repeat = newNode.children.some((queryFilter) => {
							return queryFilter === nestedObj;
						});
						if (!repeat) {
							newNode.children.push(nestedObj);
						}
					});
				} else if (nestedObjKey === "NOT") {
					let newNodeChild: QueryFilter = new QueryFilter(newNode, nestedObjKey, [], []);
					let obj = innerObj[i][nestedObjKey];
					let nestedObj = this.traverseQuery(newNodeChild, obj);
					let repeat = newNode.children.some((queryFilter) => {
						return queryFilter === nestedObj;
					});
					if (!repeat) {
						newNode.children.push(nestedObj);
					}
				} else {
					// next item is a Dataset filter, simply pass current node in recursion
					this.traverseQuery(newNode, innerObj[i]);
				}
			});
		}
	}

	public async performDatasetSearch(dataset: CoursesDataset): Promise<any[]> {
		if (this.emptyWhere) {
			let sections = await dataset.getAllCourses();
			return Promise.resolve(sections);
		} else {
			this.findAndProcessNot(this.query);
			let rawResult: any[] = await this.filterCourses(this.query, dataset);
			let prunedResult = [... new Set(rawResult)];
			let result: any[] = this.applyColumnsAndTranslate(prunedResult, dataset.id);
			return Promise.resolve(result);
		}
	}

	public applyColumnsAndTranslate(sections: any[], id: string): any[] {
		let result: any[] = [];
		sections.forEach((sectionObj) => {
			let newObject: any = {};
			this.columns.forEach((queryKey) => {
				newObject[queryKey] = getValueByTranslation(sectionObj, queryKey);
			});
			result.push(newObject);
		});
		return result;
	}

	public async filterCourses(query: QueryFilter | null, dataset: CoursesDataset): Promise<any[]> {
		let sections: any[] = [];
		function onlyNonUnique(value: any, ind: any, self: any) {
			return !(self.indexOf(value) === ind);
		}
		if (query === null || (query.children.length === 0 && query.searches.length === 0)) {
			return Promise.reject(new InsightError("QueryDispatch query field should have a non empty array."));
		} else {
			if (query.children.length === 0 && query.searches.length === 1) {
				sections = sections.concat(await this.handleSearch(query.searches[0], dataset, false, []));
			} if (query.self === "OR") {
				if (query.searches.length > 0) {
					for (const search of query.searches) {
						sections = sections.concat(await this.handleSearch(search, dataset, false, []));
					}
				} if (query.children.length > 0) {
					for (const child of query.children) {
						sections = sections.concat(await this.filterCourses(child, dataset));
					}
				}
			} else if (query.self === "AND") {
				if (query.children.length === 1) {
					for (const child of query.children) {
						sections = sections.concat(await this.filterCourses(child, dataset));
					}
				} else if (query.children.length > 1) {
					let accum: any, accum1: any = [];
					for (const child of query.children) {
						const index = query.children.indexOf(child);
						if (index === 0) {
							accum = await this.filterCourses(child, dataset);
							accum1 = accum;
						} else {
							accum = await this.filterCourses(child, dataset);
							accum1 = accum.concat(accum1).filter(onlyNonUnique);
						}
					} sections = sections.concat(accum1);
				} sections = await this.handleAndContents(query, dataset, sections);
			} else {
				if (query.children.length > 0) {
					for (const child of query.children) {
						sections = sections.concat(await this.filterCourses(child, dataset));
					}
				}
			}
		} return sections;
	}

	public async handleAndContents(query: any, dataset: CoursesDataset, sections: any[]): Promise<any[]> {
		if (query.searches.length > 0) {
			let accumulator1: any[] = [];
			let accumulator2: any[] = [];
			for (const search of query.searches) {
				const index = query.searches.indexOf(search);
				if (index === 0) {
					accumulator1 = await this.handleSearch(search, dataset, false, []);
				} else {
					accumulator1 = await this.handleSearch(search, dataset, true, accumulator2);
				}
				accumulator2 = accumulator1;
			} if (query.children.length > 0) {
				let retval: any = [];
				sections.forEach((section) => {
					accumulator2.forEach((accSection) => {
						if(isEquivalent(section, accSection)){
							retval.push(section);
						}
					});
				});
				sections = retval;
			} else {
				sections = sections.concat(accumulator2);
			}
		} return sections;
	}

	public async handleSearch(search: DatasetSearch, dataset: CoursesDataset, searchInSubset: boolean,
		subset: any[]): Promise<any[]> {
		if (search.comparator === "is" || search.comparator === "isnot") {
			if (searchInSubset) {
				return await dataset.findCoursesBySComparator(search.comparator, search.field, search.value as string,
					searchInSubset, subset);
			} else {
				return await dataset.findCoursesBySComparator(search.comparator, search.field, search.value as string,
					searchInSubset, []);
			}
		} else {
			if (searchInSubset) {
				return await dataset.findCoursesByMComparator(search.comparator, search.field, search.value as number,
					searchInSubset, subset);
			} else {
				return await dataset.findCoursesByMComparator(search.comparator, search.field, search.value as number,
					searchInSubset, []);
			}
		}
	}

	public findAndProcessNot(query: QueryFilter | null): void {
		if (query === null) {
			console.assert("QueryDispatch query field is null???");
		} else {
			if (query.self === "NOT") {
				query.children.forEach((child) => {
					this.negateSubTree(child);
				});
				if (query.searches.length > 0) {
					this.negateSearches(query.searches);
				}


			} else if (query.children.length !== 0) {
				query.children.forEach((child) => {
					this.findAndProcessNot(child);
				});
			}
		}
	}

	public negateSubTree(query: QueryFilter): void {
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
			this.negateSearches(query.searches);
		}
		if (query.children.length !== 0) {
			query.children.forEach((child) => {
				this.negateSubTree(child);
			});
		}
	}
	public negateSearches(searches: DatasetSearch[]): void {
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
}
