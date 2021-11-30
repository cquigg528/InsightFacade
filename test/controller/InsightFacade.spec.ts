// import {
// 	IInsightFacade,
// 	InsightDataset,
// 	InsightDatasetKind,
// 	InsightError,
// 	NotFoundError,
// 	ResultTooLargeError,
// } from "../../src/controller/IInsightFacade";
// import InsightFacade from "../../src/controller/InsightFacade";
// import {expect, use} from "chai";
// import chaiAsPromised from "chai-as-promised";
// import {clearDisk, getContentFromArchives} from "../TestUtil";
// import {testFolder} from "@ubccpsc310/folder-test";
// import {describe} from "mocha";
//
// use(chaiAsPromised);
//
// type Input = any;
// type Output = any[];
// type Error = "InsightError" | "ResultTooLargeError";
//
// // Notes:
// // Can use nested describes, and attach before handles to different describes
// describe("InsightFacade", function () {
// 	let coursesContentStr: string;
//
// 	let rooms: string;
//
// 	// If getContentFromArchives throws exception, whole test suite crashes.  Use
// 	// the before() construct for more specific error messages.  Runs before any of the
// 	// tests - runs before it's describe
//
// 	before(function () {
// 		coursesContentStr = getContentFromArchives("courses.zip");
// 		rooms = getContentFromArchives("rooms.zip");
// 	});
//
// 	describe("List Datasets", function () {
// 		let facade: IInsightFacade;
//
// 		// Runs before each "it"
// 		beforeEach(function () {
// 			clearDisk();
// 			facade = new InsightFacade();
// 		});
//
// 		it("should list no datasets", function () {
// 			return facade.listDatasets().then((insightDatasets) => {
// 				// Here we need deep.equal, because expect([]).to.equal([]) will fail
// 				expect(insightDatasets).to.deep.equal([]);
//
// 				// Or alternatively..
// 				expect(insightDatasets).to.be.an.instanceof(Array);
// 				expect(insightDatasets).to.have.length(0);
// 			});
// 		});
//
// 		it("should list one dataset", function () {
// 			// 1. Add a dataset
// 			return facade
// 				.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
// 				.then(() => {
// 					return facade.listDatasets();
// 				})
// 				.then((insightDatasets) => {
// 					expect(insightDatasets).to.deep.equal([
// 						{
// 							id: "courses",
// 							kind: InsightDatasetKind.Courses,
// 							numRows: 64612,
// 						},
// 					]);
//
// 					// Or alternatively..
// 					expect(insightDatasets).to.be.an.instanceof(Array);
// 					expect(insightDatasets).to.have.length(1);
// 				});
// 		});
//
// 		it("should list multiple datasets", function () {
// 			return facade
// 				.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
// 				.then(() => {
// 					return facade.addDataset("courses-2", coursesContentStr, InsightDatasetKind.Courses);
// 				})
// 				.then(() => {
// 					return facade.listDatasets();
// 				})
// 				.then((insightDatasets) => {
// 					const expectedDatasets: InsightDataset[] = [
// 						{
// 							id: "courses",
// 							kind: InsightDatasetKind.Courses,
// 							numRows: 64612,
// 						},
// 						{
// 							id: "courses-2",
// 							kind: InsightDatasetKind.Courses,
// 							numRows: 64612,
// 						},
// 					];
//
// 					expect(insightDatasets).to.have.deep.members(expectedDatasets);
// 					expect(insightDatasets).to.be.an.instanceof(Array);
// 					expect(insightDatasets).to.have.length(2);
//
// 					const insightDatasetCourses = insightDatasets.find((dataset) => dataset.id === "courses");
// 					expect(insightDatasetCourses).to.exist;
// 					expect(insightDatasetCourses).to.deep.equal({
// 						id: "courses",
// 						kind: InsightDatasetKind.Courses,
// 						numRows: 64612,
// 					});
//
// 					const insightDatasetCourses2 = insightDatasets.find((dataset) => dataset.id === "courses-2");
// 					expect(insightDatasetCourses2).to.exist;
// 					expect(insightDatasetCourses2).to.deep.equal({
// 						id: "courses-2",
// 						kind: InsightDatasetKind.Courses,
// 						numRows: 64612,
// 					});
// 				});
// 		});
// 	});
//
// 	describe("Remove Dataset", function () {
// 		// Do I add valid id with whitespace in all valid checking?
// 		const validIdWithSpaces: string = " cours es";
// 		const validId: string = "courses";
// 		const invalidIdUnderscore: string = "_oops"; // do I need to vary the underscore position / use just '_'?
// 		const invalidIdWhitespace: string = "   ";
// 		const invalidIdEmptyStr: string = "";
//
// 		let facade: InsightFacade;
//
// 		// Runs before each "it"
// 		beforeEach(function () {
// 			clearDisk();
// 			facade = new InsightFacade();
// 		});
//
// 		it(
// 			"should fulfill with id string when dataset is present " + "and id valid: only one dataset added",
// 			function () {
// 				return facade
// 					.addDataset(validIdWithSpaces, coursesContentStr, InsightDatasetKind.Courses)
// 					.then(() => {
// 						return facade.removeDataset(validIdWithSpaces);
// 					})
// 					.then((removedId) => {
// 						expect(removedId).to.equal(validIdWithSpaces);
// 					});
// 			}
// 		);
//
// 		it(
// 			"should fulfill with id string when dataset is present " + "and id valid: multiple datasets added",
// 			function () {
// 				return facade
// 					.addDataset("dummy", coursesContentStr, InsightDatasetKind.Courses)
// 					.then(() => {
// 						return facade.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses);
// 					})
// 					.then(() => {
// 						return facade.addDataset("dummy2", coursesContentStr, InsightDatasetKind.Courses);
// 					})
// 					.then(() => {
// 						return facade.removeDataset(validId);
// 					})
// 					.then((removedId) => {
// 						expect(removedId).to.equal(validId);
// 					});
// 			}
// 		);
//
// 		it(
// 			"should reject with NotFoundError if id is valid but dataset " + "not present: no datasets added",
// 			function () {
// 				const result = facade.removeDataset(validId);
// 				return expect(result).eventually.to.be.rejectedWith(NotFoundError);
// 			}
// 		);
//
// 		it(
// 			"should reject with NotFoundError if id is valid but dataset " + "not present: one dataset added",
// 			function () {
// 				return facade.addDataset("wrongOne", coursesContentStr, InsightDatasetKind.Courses).then(() => {
// 					return expect(facade.removeDataset(validId)).eventually.to.be.rejectedWith(NotFoundError);
// 				});
// 			}
// 		);
//
// 		it(
// 			"should reject with NotFoundError if id is valid but " + "dataset not present: multiple datasets added",
// 			function () {
// 				return facade
// 					.addDataset("wrongOneBuddy", coursesContentStr, InsightDatasetKind.Courses)
// 					.then(() => {
// 						return facade.addDataset("tryGagin Pal!", coursesContentStr, InsightDatasetKind.Courses);
// 					})
// 					.then(() => {
// 						return expect(facade.removeDataset(validId)).eventually.to.be.rejectedWith(NotFoundError);
// 					});
// 			}
// 		);
//
// 		it("should reject with NotFoundError after consecutive calls " + "with same (valid) id", function () {
// 			return facade
// 				.addDataset("dummy", coursesContentStr, InsightDatasetKind.Courses)
// 				.then(() => {
// 					return facade.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses);
// 				})
// 				.then(() => {
// 					return facade.removeDataset(validId);
// 				})
// 				.then(
// 					(removedID) => {
// 						// should fulfill
// 						expect(removedID).to.deep.equal(validId);
// 					},
// 					() => {
// 						// if we reach onRejected then fail
// 						expect.fail("Promise should fulfill on first removal attempt");
// 					}
// 				)
// 				.then(() => {
// 					return expect(facade.removeDataset(validId)).eventually.to.be.rejectedWith(NotFoundError);
// 				});
// 		});
//
// 		it(
// 			"should reject with InsightError if invalid id given: " + "contains an underscore, no datasets added",
// 			function () {
// 				return expect(facade.removeDataset(invalidIdUnderscore)).eventually.to.be.rejectedWith(InsightError);
// 			}
// 		);
//
// 		it(
// 			"should reject with InsightError if invalid id given: " + "contains an underscore, one dataset added",
// 			function () {
// 				return facade.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses).then(() => {
// 					return expect(facade.removeDataset(invalidIdUnderscore)).eventually.to.be.rejectedWith(
// 						InsightError
// 					);
// 				});
// 			}
// 		);
//
// 		it(
// 			"should reject with InsightError if invalid id given: " + "contains an underscore, multiple datasets added",
// 			function () {
// 				return facade
// 					.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses)
// 					.then(() => {
// 						return facade.addDataset("anoter valid id", coursesContentStr, InsightDatasetKind.Courses);
// 					})
// 					.then(() => {
// 						return expect(facade.removeDataset(invalidIdUnderscore)).eventually.to.be.rejectedWith(
// 							InsightError
// 						);
// 					});
// 			}
// 		);
//
// 		it(
// 			"should reject with InsightError if invalid id given: " + "is only whitespace chars, no datasets added",
// 			function () {
// 				return expect(facade.removeDataset(invalidIdWhitespace)).eventually.to.be.rejectedWith(InsightError);
// 			}
// 		);
//
// 		it(
// 			"should reject with InsightError if invalid id given: " + "is only whitespace chars, one dataset added",
// 			function () {
// 				return facade.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses).then(() => {
// 					return expect(facade.removeDataset(invalidIdWhitespace)).eventually.to.be.rejectedWith(
// 						InsightError
// 					);
// 				});
// 			}
// 		);
//
// 		it(
// 			"should reject with InsightError if invalid id given: " +
// 			"is only whitespace chars, multiple datasets added",
// 			function () {
// 				return facade
// 					.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses)
// 					.then(() => {
// 						return facade.addDataset("anoter valid id", coursesContentStr, InsightDatasetKind.Courses);
// 					})
// 					.then(() => {
// 						return expect(facade.removeDataset(invalidIdWhitespace)).eventually.to.be.rejectedWith(
// 							InsightError
// 						);
// 					});
// 			}
// 		);
//
// 		it("should reject with InsightError if invalid id given: " + "empty string, no datasets added", function () {
// 			return expect(facade.removeDataset(invalidIdEmptyStr)).eventually.to.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject with InsightError if invalid id given: " + "empty string, one dataset added", function () {
// 			return facade.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses).then(() => {
// 				return expect(facade.removeDataset(invalidIdEmptyStr)).eventually.to.be.rejectedWith(InsightError);
// 			});
// 		});
//
// 		it(
// 			"should reject with InsightError if invalid id given: " + "empty string, multiple datasets added",
// 			function () {
// 				return facade
// 					.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses)
// 					.then(() => {
// 						return facade.addDataset("anoter valid id", coursesContentStr, InsightDatasetKind.Courses);
// 					})
// 					.then(() => {
// 						return expect(facade.removeDataset(invalidIdEmptyStr)).eventually.to.be.rejectedWith(
// 							InsightError
// 						);
// 					});
// 			}
// 		);
// 	});
//
// 	describe("Perform Query Dynamic Tests", function () {
// 		let facade: InsightFacade;
//
// 		before(async function () {
// 			clearDisk();
// 			facade = new InsightFacade();
// 			await facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses);
// 		});
//
// 		testFolder<Input, Output, Error>(
// 			"Dynamic query testing",
// 			(input): Promise<Output> => {
// 				return facade.performQuery(input);
// 			},
// 			"./test/resources/json",
// 			{
// 				errorValidator: (error): error is Error => error === "InsightError" || error === "ResultTooLargeError",
//
// 				assertOnError: (expected, actual) => {
// 					if (expected === "InsightError") {
// 						expect(actual).to.be.instanceof(InsightError);
// 					} else if (expected === "ResultTooLargeError") {
// 						expect(actual).to.be.instanceof(ResultTooLargeError);
// 					} else {
// 						// this should be unreachable
// 						expect.fail("UNEXPECTED ERROR");
// 					}
// 				},
//
// 				assertOnResult: (expected, actual) => {
// 					expect(actual).to.have.deep.members(expected);
// 				},
// 			}
// 		);
// 	});
//
// 	// describe("Debugging tests", function () {
// 	// 	let facade: IInsightFacade;
// 	//
// 	// 	let emptyKeyWithDatasetQuery: any = {
// 	// 		WHERE: {
// 	// 			AND: [
// 	// 				{
// 	// 					GT: {
// 	// 						courses_audit: 10
// 	// 					}
// 	// 				},
// 	// 				{
// 	// 					LT: {
// 	// 						courses_audit: 10
// 	// 					}
// 	// 				},
// 	// 				{
// 	// 					GT: {
// 	// 						courses_audit: 10
// 	// 					}
// 	// 				}
// 	// 			]
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: [
// 	// 				"courses_avg",
// 	// 				"courses"
// 	// 			],
// 	// 			ORDER: "courses_avg"
// 	// 		}
// 	// 	};
// 	//
// 	// 	let notNotNotOrNotAndGtLt = {
// 	// 		WHERE: {
// 	// 			NOT: {
// 	// 				NOT: {
// 	// 					NOT: {
// 	// 						OR: [
// 	// 							{
// 	// 								NOT: {
// 	// 									AND: [
// 	// 										{
// 	// 											GT: {
// 	// 												courses_avg: 99.9
// 	// 											}
// 	// 										},
// 	// 										{
// 	// 											LT: {
// 	// 												courses_avg: 1
// 	// 											}
// 	// 										}
// 	// 									]
// 	// 								}
// 	// 							}
// 	// 						]
// 	// 					}
// 	// 				}
// 	// 			}
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: [
// 	// 				"courses_dept",
// 	// 				"courses_id",
// 	// 				"courses_avg"
// 	// 			],
// 	// 			ORDER: "courses_avg"
// 	// 		}
// 	// 	};
// 	//
// 	// 	let allApplyFunctions = {
// 	// 		WHERE: {},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: [
// 	// 				"courses_title",
// 	// 				"overallAvg",
// 	// 				"maxFail",
// 	// 				"minPass",
// 	// 				"sumFail",
// 	// 				"countInstructors"
// 	// 			]
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: [
// 	// 				"courses_title"
// 	// 			],
// 	// 			APPLY: [
// 	// 				{
// 	// 					overallAvg: {
// 	// 						AVG: "courses_avg"
// 	// 					}
// 	// 				},
// 	// 				{
// 	// 					maxFail: {
// 	// 						MAX: "courses_fail"
// 	// 					}
// 	// 				},
// 	// 				{
// 	// 					minPass: {
// 	// 						MIN: "courses_pass"
// 	// 					}
// 	// 				},
// 	// 				{
// 	// 					sumFail: {
// 	// 						SUM: "courses_fail"
// 	// 					}
// 	// 				},
// 	// 				{
// 	// 					countInstructors: {
// 	// 						COUNT: "courses_instructor"
// 	// 					}
// 	// 				}
// 	// 			]
// 	// 		}
// 	// 	};
// 	//
// 	// 	let avgGroup = {
// 	// 		WHERE: {
// 	// 			OR: [
// 	// 				{
// 	// 					IS: {
// 	// 						courses_id: "310"
// 	// 					}
// 	// 				},
// 	// 				{
// 	// 					IS: {
// 	// 						courses_id: "210"
// 	// 					}
// 	// 				}
// 	// 			]
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: [
// 	// 				"courses_title",
// 	// 				"overallAvg"
// 	// 			]
// 	// 		},
// 	// 		TRANSFORMATIONS: {
// 	// 			GROUP: [
// 	// 				"courses_title"
// 	// 			],
// 	// 			APPLY: [
// 	// 				{
// 	// 					overallAvg: {
// 	// 						AVG: "courses_avg"
// 	// 					}
// 	// 				}
// 	// 			]
// 	// 		}
// 	// 	};
// 	//
// 	// 	let notNotNotOrAndGtLt = {
// 	// 		WHERE: {
// 	// 			NOT: {
// 	// 				NOT: {
// 	// 					NOT: {
// 	// 						OR: [
// 	// 							{
// 	// 								NOT: {
// 	// 									AND: [
// 	// 										{
// 	// 											GT: {
// 	// 												courses_avg: 99.9
// 	// 											}
// 	// 										},
// 	// 										{
// 	// 											LT: {
// 	// 												courses_avg: 1
// 	// 											}
// 	// 										}
// 	// 									]
// 	// 								}
// 	// 							}
// 	// 						]
// 	// 					}
// 	// 				}
// 	// 			}
// 	// 		},
// 	// 		OPTIONS: {
// 	// 			COLUMNS: [
// 	// 				"courses_dept",
// 	// 				"courses_id",
// 	// 				"courses_avg"
// 	// 			],
// 	// 			ORDER: "courses_avg"
// 	// 		}
// 	// 	};
// 	//
// 	// 	// Runs before each "it"
// 	// 	beforeEach(function () {
// 	// 		clearDisk();
// 	// 		facade = new InsightFacade();
// 	// 	});
// 	//
// 	// 	// This works
// 	// 	it("should reject a query with applykey in COLUMNS when GROUP is not present", function () {
// 	// 		return facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
// 	// 			.then(() => {
// 	// 				let result = facade.performQuery(emptyKeyWithDatasetQuery);
// 	// 				return expect(result).to.eventually.be.rejectedWith(InsightError);
// 	// 			});
// 	// 	});
// 	//
// 	// 	it("should return an empty list if there are no results (many nested nots)", function () {
// 	// 		return facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
// 	// 			.then(() => {
// 	// 				let result = facade.performQuery(notNotNotOrNotAndGtLt);
// 	// 				return expect(result).to.eventually.deep.equal([]);
// 	// 			});
// 	// 	});
// 	//
// 	// 	it("should run allApplyFunctions", function () {
// 	// 		return facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
// 	// 			.then(() => {
// 	// 				let result = facade.performQuery(allApplyFunctions);
// 	// 				return expect(result).to.eventually.deep.equal([]);
// 	// 			});
// 	// 	});
// 	//
// 	// 	it("should run avgGroup", function () {
// 	// 		return facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
// 	// 			.then(() => {
// 	// 				let result = facade.performQuery(avgGroup);
// 	// 				return expect(result).to.eventually.deep.equal([]);
// 	// 			});
// 	// 	});
// 	//
// 	// 	it("should work with notNotNotOrNotAndGtLt", function () {
// 	// 		return facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
// 	// 			.then(() => {
// 	// 				let result = facade.performQuery(notNotNotOrAndGtLt);
// 	// 				return expect(result).to.eventually.deep.equal([]);
// 	// 			});
// 	// 	});
// 	// });
// 	//
// 	// describe("Perform Query C2 Rooms Dynamic Tests", function () {
// 	// 	let facade: InsightFacade;
// 	//
// 	// 	before(async function () {
// 	// 		clearDisk();
// 	// 		facade = new InsightFacade();
// 	// 		await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
// 	// 	});
// 	//
// 	// 	testFolder<Input, Output, Error>(
// 	// 		"Dynamic query testing",
// 	// 		(input): Promise<Output> => {
// 	// 			return facade.performQuery(input);
// 	// 		},
// 	// 		"./test/resources/c2_rooms",
// 	// 		{
// 	// 			errorValidator: (error): error is Error => error === "InsightError" || error === "ResultTooLargeError",
// 	//
// 	// 			assertOnError: (expected, actual) => {
// 	// 				if (expected === "InsightError") {
// 	// 					expect(actual).to.be.instanceof(InsightError);
// 	// 				} else if (expected === "ResultTooLargeError") {
// 	// 					expect(actual).to.be.instanceof(ResultTooLargeError);
// 	// 				} else {
// 	// 					// this should be unreachable
// 	// 					expect.fail("UNEXPECTED ERROR");
// 	// 				}
// 	// 			},
// 	//
// 	// 			assertOnResult: (expected, actual) => {
// 	// 				expect(actual).to.have.deep.members(expected);
// 	// 			},
// 	// 		}
// 	// 	);
// 	// });
//
// 	describe("Add Dataset", function () {
// 		let coursesWithInvalidJson: string;
//
// 		let facade: IInsightFacade;
//
// 		// Runs before each "it"
// 		beforeEach(function () {
// 			clearDisk();
// 			facade = new InsightFacade();
// 		});
//
// 		it("should be able to add dataset that includes invalid json ", function () {
// 			coursesWithInvalidJson = getContentFromArchives("barb.zip");
// 			return facade
// 				.addDataset("test", coursesWithInvalidJson, InsightDatasetKind.Courses)
// 				.then((addedIDs) => expect(addedIDs).to.deep.equal(["test"]));
// 		});
//
// 		it("should add a valid dataset: collection empty", function () {
// 			return facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses).then((idList) => {
// 				expect(idList).to.deep.equal(["courses"]);
// 				expect(idList).to.be.an.instanceof(Array);
// 				expect(idList).to.have.length(1);
// 			});
// 		});
//
// 		it("should add a valid dataset: collection already has one valid dataset", function () {
// 			return facade
// 				.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
// 				.then(() => {
// 					return facade.addDataset("small", coursesContentStr, InsightDatasetKind.Courses);
// 				})
// 				.then((idList) => {
// 					expect(idList).to.have.deep.members(["courses", "small"]);
// 					expect(idList).to.be.an.instanceof(Array);
// 					expect(idList).to.have.length(2);
// 				});
// 		});
//
// 		it("should add a valid dataset: id contains some whitespace", function () {
// 			return facade.addDataset("  co  urses  ", coursesContentStr, InsightDatasetKind.Courses).then((idList) => {
// 				expect(idList).to.deep.equal(["  co  urses  "]);
// 				expect(idList).to.be.an.instanceof(Array);
// 				expect(idList).to.have.length(1);
// 			});
// 		});
//
// 		it("should reject a duplicate dataset", function () {
// 			return facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses).then(() => {
// 				return expect(
// 					facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
// 				).eventually.to.be.rejectedWith(InsightError);
// 			});
// 		});
//
// 		it("should reject a valid dataset with kind-type Rooms", function () {
// 			return expect(
// 				facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Rooms)
// 			).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject an invalid dataset: id contains underscore", function () {
// 			return expect(
// 				facade.addDataset("_courses", coursesContentStr, InsightDatasetKind.Courses)
// 			).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject an invalid dataset: id is all whitespace", function () {
// 			return expect(
// 				facade.addDataset("    ", coursesContentStr, InsightDatasetKind.Courses)
// 			).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject an invalid dataset: id is empty string", function () {
// 			return expect(
// 				facade.addDataset("", coursesContentStr, InsightDatasetKind.Courses)
// 			).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject an invalid dataset: course files not under a folder courses/", function () {
// 			const noCoursesStr = getContentFromArchives("noCoursesFolder.zip");
// 			return expect(
// 				facade.addDataset("courses", noCoursesStr, InsightDatasetKind.Courses)
// 			).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject an invalid dataset: courses not in JSON format", function () {
// 			const noJSON = getContentFromArchives("filesNotJson.zip");
// 			return expect(
// 				facade.addDataset("courses", noJSON, InsightDatasetKind.Courses)
// 			).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject an invalid dataset: empty file", function () {
// 			const emptyFileStr = getContentFromArchives("emptyFile.zip");
// 			return expect(
// 				facade.addDataset("courses", emptyFileStr, InsightDatasetKind.Courses)
// 			).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject an invalid dataset: empty file empty courses", function () {
// 			const emptyFileStr = getContentFromArchives("emptyFileEmptyCourses.zip");
// 			return expect(
// 				facade.addDataset("courses", emptyFileStr, InsightDatasetKind.Courses)
// 			).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject an invalid dataset: jsons not in courses", function () {
// 			const emptyFileStr = getContentFromArchives("jsonsNotInCourses.zip");
// 			return expect(
// 				facade.addDataset("courses", emptyFileStr, InsightDatasetKind.Courses)
// 			).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject an invalid dataset: jsons in different folder", function () {
// 			const emptyFileStr = getContentFromArchives("jsonsInDifferentFolder.zip");
// 			return expect(
// 				facade.addDataset("courses", emptyFileStr, InsightDatasetKind.Courses)
// 			).to.eventually.be.rejectedWith(InsightError);
// 		});
// 	});
// });
