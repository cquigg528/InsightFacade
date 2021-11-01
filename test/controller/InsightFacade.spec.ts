import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {testFolder} from "@ubccpsc310/folder-test";
import {QueryValidator} from "../../src/controller/QueryValidator";
import {isDeepStrictEqual} from "util";
import QueryDispatch from "../../src/controller/QueryDispatch";
import QueryFilter from "../../src/controller/QueryFilter";
import DatasetSearch from "../../src/controller/DatasetSearch";
import {query} from "express";
import {Dataset} from "../../src/controller/Dataset";

use(chaiAsPromised);

type Input = any;
type Output = any[];
type Error = "InsightError" | "ResultTooLargeError";

type SetUpQueryValidationOutput = string | null;
type ValidateWhereOutput = boolean;
type ValidateParseOptionsOutput = string[];

// Notes:
// Can use nested describes, and attach before handles to different describes
describe("InsightFacade", function () {
	let coursesContentStr: string;
	let rooms: string;
	let smallerTestStr: string;

	// If getContentFromArchives throws exception, whole test suite crashes.  Use
	// the before() construct for more specific error messages.  Runs before any of the
	// tests - runs before it's describe
	before(function () {
		coursesContentStr = getContentFromArchives("courses.zip");
		rooms = getContentFromArchives("rooms.zip");
		smallerTestStr = getContentFromArchives("smallTest.zip");
	});

	describe("List Datasets", function () {
		let facade: InsightFacade;

		// Runs before each "it"
		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should list no datasets", function () {
			return facade.listDatasets().then((insightDatasets) => {
				// Here we need deep.equal, because expect([]).to.equal([]) will fail
				expect(insightDatasets).to.deep.equal([]);

				// Or alternatively..
				expect(insightDatasets).to.be.an.instanceof(Array);
				expect(insightDatasets).to.have.length(0);
			});
		});

		it("should list one dataset", function () {
			// 1. Add a dataset
			return facade
				.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
					]);

					// Or alternatively..
					expect(insightDatasets).to.be.an.instanceof(Array);
					expect(insightDatasets).to.have.length(1);
				});
		});

		it("should list multiple datasets", function () {
			return facade
				.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("courses-2", coursesContentStr, InsightDatasetKind.Courses);
				})
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					const expectedDatasets: InsightDataset[] = [
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
						{
							id: "courses-2",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
					];

					expect(insightDatasets).to.have.deep.members(expectedDatasets);
					expect(insightDatasets).to.be.an.instanceof(Array);
					expect(insightDatasets).to.have.length(2);

					const insightDatasetCourses = insightDatasets.find((dataset) => dataset.id === "courses");
					expect(insightDatasetCourses).to.exist;
					expect(insightDatasetCourses).to.deep.equal({
						id: "courses",
						kind: InsightDatasetKind.Courses,
						numRows: 64612,
					});

					const insightDatasetCourses2 = insightDatasets.find((dataset) => dataset.id === "courses-2");
					expect(insightDatasetCourses2).to.exist;
					expect(insightDatasetCourses2).to.deep.equal({
						id: "courses-2",
						kind: InsightDatasetKind.Courses,
						numRows: 64612,
					});
				});
		});

		it("should list a courses dataset and a rooms dataset", function () {
			return facade
				.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				})
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					const expectedDatasets: InsightDataset[] = [
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
						{
							id: "rooms",
							kind: InsightDatasetKind.Rooms,
							numRows: 364,
						},
					];

					expect(insightDatasets).to.have.deep.members(expectedDatasets);
					expect(insightDatasets).to.be.an.instanceof(Array);
					expect(insightDatasets).to.have.length(2);
				});
		});
	});

	describe("Remove Dataset", function () {
		// Do I add valid id with whitespace in all valid checking?
		const validIdWithSpaces: string = " cours es";
		const validId: string = "courses";
		const invalidIdUnderscore: string = "_oops"; // do I need to vary the underscore position / use just '_'?
		const invalidIdWhitespace: string = "   ";
		const invalidIdEmptyStr: string = "";

		let facade: InsightFacade;

		// Runs before each "it"
		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it(
			"should fulfill with id string when dataset is present " + "and id valid: only one dataset added",
			function () {
				return facade
					.addDataset(validIdWithSpaces, coursesContentStr, InsightDatasetKind.Courses)
					.then(() => {
						return facade.removeDataset(validIdWithSpaces);
					})
					.then((removedId) => {
						expect(removedId).to.equal(validIdWithSpaces);
					});
			}
		);

		it(
			"should fulfill with id string when dataset is present " + "and id valid: multiple datasets added",
			function () {
				return facade
					.addDataset("dummy", coursesContentStr, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses);
					})
					.then(() => {
						return facade.addDataset("dummy2", coursesContentStr, InsightDatasetKind.Courses);
					})
					.then(() => {
						return facade.removeDataset(validId);
					})
					.then((removedId) => {
						expect(removedId).to.equal(validId);
					});
			}
		);

		it(
			"should reject with NotFoundError if id is valid but dataset " + "not present: no datasets added",
			function () {
				const result = facade.removeDataset(validId);
				return expect(result).eventually.to.be.rejectedWith(NotFoundError);
			}
		);

		it(
			"should reject with NotFoundError if id is valid but dataset " + "not present: one dataset added",
			function () {
				return facade.addDataset("wrongOne", coursesContentStr, InsightDatasetKind.Courses).then(() => {
					return expect(facade.removeDataset(validId)).eventually.to.be.rejectedWith(NotFoundError);
				});
			}
		);

		it(
			"should reject with NotFoundError if id is valid but " + "dataset not present: multiple datasets added",
			function () {
				return facade
					.addDataset("wrongOneBuddy", coursesContentStr, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset("tryGagin Pal!", coursesContentStr, InsightDatasetKind.Courses);
					})
					.then(() => {
						return expect(facade.removeDataset(validId)).eventually.to.be.rejectedWith(NotFoundError);
					});
			}
		);

		it("should reject with NotFoundError after consecutive calls " + "with same (valid) id", function () {
			return facade
				.addDataset("dummy", coursesContentStr, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses);
				})
				.then(() => {
					return facade.removeDataset(validId);
				})
				.then(
					(removedID) => {
						// should fulfill
						expect(removedID).to.deep.equal(validId);
					},
					() => {
						// if we reach onRejected then fail
						expect.fail("Promise should fulfill on first removal attempt");
					}
				)
				.then(() => {
					return expect(facade.removeDataset(validId)).eventually.to.be.rejectedWith(NotFoundError);
				});
		});

		it(
			"should reject with InsightError if invalid id given: " + "contains an underscore, no datasets added",
			function () {
				return expect(facade.removeDataset(invalidIdUnderscore)).eventually.to.be.rejectedWith(InsightError);
			}
		);

		it(
			"should reject with InsightError if invalid id given: " + "contains an underscore, one dataset added",
			function () {
				return facade.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses).then(() => {
					return expect(facade.removeDataset(invalidIdUnderscore)).eventually.to.be.rejectedWith(
						InsightError
					);
				});
			}
		);

		it(
			"should reject with InsightError if invalid id given: " + "contains an underscore, multiple datasets added",
			function () {
				return facade
					.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset("anoter valid id", coursesContentStr, InsightDatasetKind.Courses);
					})
					.then(() => {
						return expect(facade.removeDataset(invalidIdUnderscore)).eventually.to.be.rejectedWith(
							InsightError
						);
					});
			}
		);

		it(
			"should reject with InsightError if invalid id given: " + "is only whitespace chars, no datasets added",
			function () {
				return expect(facade.removeDataset(invalidIdWhitespace)).eventually.to.be.rejectedWith(InsightError);
			}
		);

		it(
			"should reject with InsightError if invalid id given: " + "is only whitespace chars, one dataset added",
			function () {
				return facade.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses).then(() => {
					return expect(facade.removeDataset(invalidIdWhitespace)).eventually.to.be.rejectedWith(
						InsightError
					);
				});
			}
		);

		it(
			"should reject with InsightError if invalid id given: " +
				"is only whitespace chars, multiple datasets added",
			function () {
				return facade
					.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset("anoter valid id", coursesContentStr, InsightDatasetKind.Courses);
					})
					.then(() => {
						return expect(facade.removeDataset(invalidIdWhitespace)).eventually.to.be.rejectedWith(
							InsightError
						);
					});
			}
		);

		it("should reject with InsightError if invalid id given: " + "empty string, no datasets added", function () {
			return expect(facade.removeDataset(invalidIdEmptyStr)).eventually.to.be.rejectedWith(InsightError);
		});

		it("should reject with InsightError if invalid id given: " + "empty string, one dataset added", function () {
			return facade.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses).then(() => {
				return expect(facade.removeDataset(invalidIdEmptyStr)).eventually.to.be.rejectedWith(InsightError);
			});
		});

		it(
			"should reject with InsightError if invalid id given: " + "empty string, multiple datasets added",
			function () {
				return facade
					.addDataset(validId, coursesContentStr, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset("anoter valid id", coursesContentStr, InsightDatasetKind.Courses);
					})
					.then(() => {
						return expect(facade.removeDataset(invalidIdEmptyStr)).eventually.to.be.rejectedWith(
							InsightError
						);
					});
			}
		);
	});

	describe("Perform Query Dynamic Tests", function () {
		let facade: InsightFacade;

		before(async function () {
			clearDisk();
			facade = new InsightFacade();
			await facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses);
		});

		testFolder<Input, Output, Error>(
			"Dynamic query testing",
			(input): Promise<Output> => {
				return facade.performQuery(input);
			},
			"./test/resources/json",
			{
				errorValidator: (error): error is Error => error === "InsightError" || error === "ResultTooLargeError",

				assertOnError: (expected, actual) => {
					if (expected === "InsightError") {
						expect(actual).to.be.instanceof(InsightError);
					} else if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						// this should be unreachable
						expect.fail("UNEXPECTED ERROR");
					}
				},

				assertOnResult: (expected, actual) => {
					expect(actual).to.have.deep.members(expected);
				},
			}
		);
	});

	describe("Add Rooms Dataset", function () {
		let facade: IInsightFacade;
		let roomsNoBuildingsLinkedFromIndex: string;
		let roomsNoIndex: string;
		let roomsNoRoomsFolder: string;
		let roomsNoValidHTMLBuildings: string;

		before(function () {
			roomsNoBuildingsLinkedFromIndex = getContentFromArchives("roomsNoBuildingsLinkedFromIndex.zip");
			roomsNoIndex = getContentFromArchives("roomsNoIndex.zip");
			roomsNoRoomsFolder = getContentFromArchives("roomsNoRoomsFolder.zip");
			roomsNoValidHTMLBuildings = getContentFromArchives("roomsNoValidHTMLBuildings.zip");
		});

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should be able to add a rooms dataset that is valid", function () {
			return facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms).then((addedIDs) =>
				expect(addedIDs).to.deep.equal(["rooms"]));
		});

		it("should fail to add a rooms dataset because no index.htm file in root", function () {
			return expect(facade.addDataset("roomsNoIndex", roomsNoIndex, InsightDatasetKind.Rooms))
				.eventually.to.be.rejectedWith(InsightError);
		});

		it("should fail to add because no rooms are under rooms folder", function () {
			return expect(facade.addDataset("roomsNoRoomsFolder", roomsNoRoomsFolder, InsightDatasetKind.Rooms))
				.eventually.to.be.rejectedWith(InsightError);
		});

		it("should fail because there are no valid rooms linked in index.htm", function () {
			return expect(facade.addDataset("roomsNoBuildingsLinkedFromIndex", roomsNoBuildingsLinkedFromIndex,
				InsightDatasetKind.Rooms)).eventually.to.be.rejectedWith(InsightError);
		});

		it("should fail because buildings are not in HTML format", function () {
			return expect(facade.addDataset("roomsNoValidHTMLBuildings", roomsNoValidHTMLBuildings,
				InsightDatasetKind.Rooms)).eventually.to.be.rejectedWith(InsightError);
		});

		it("should successfully add two rooms datasets", function () {
			return facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms)
				.then(() => facade.addDataset("rooms2", rooms, InsightDatasetKind.Rooms))
				.then((idList) => {
					expect(idList).to.have.deep.members(["rooms", "rooms2"]);
					expect(idList).to.be.an.instanceof(Array);
					expect(idList).to.have.length(2);
				});
		});
	});

	describe("Add Courses Dataset", function () {
	// describe("QueryValidator Dynamic Tests", function () {
	// 	let facade: InsightFacade;
	// 	let validator: QueryValidator;
	//
	// 	describe("setUpQueryValidation", function () {
	// 		before(function () {
	// 			clearDisk();
	// 			facade = new InsightFacade();
	// 			return facade.addDataset("courses", smallerTestStr, InsightDatasetKind.Courses);
	// 		});
	//
	// 		testFolder<Input, SetUpQueryValidationOutput, Error>(
	// 			"Dynamic setUpQueryValidation testing",
	// 			(input): SetUpQueryValidationOutput => {
	// 				validator = new QueryValidator(input);
	// 				return validator.setUpQueryValidation(facade.datasetIds, input);
	// 			},
	// 			"./test/resources/performQueryDynamicTests/setUpQueryTests",
	// 			{
	// 				errorValidator: (error): error is Error =>
	// 					error === "InsightError" || error === "ResultTooLargeError",
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
	// 					expect(actual).to.equal(expected);
	// 				},
	// 			}
	// 		);
	// 	});
	//
	// 	describe("validateWhere", function () {
	// 		before(function () {
	// 			clearDisk();
	// 			facade = new InsightFacade();
	// 			return facade.addDataset("courses", smallerTestStr, InsightDatasetKind.Courses);
	// 		});
	//
	// 		testFolder<Input, ValidateWhereOutput, Error>(
	// 			"Dynamic validateWhere testing",
	// 			(input): ValidateWhereOutput => {
	// 				validator = new QueryValidator(input);
	// 				validator.mkeys = [
	// 					"courses" + "_avg",
	// 					"courses" + "_pass",
	// 					"courses" + "_fail",
	// 					"courses" + "_audit",
	// 					"courses" + "_year",
	// 				];
	// 				validator.skeys = [
	// 					"courses" + "_dept",
	// 					"courses" + "_id",
	// 					"courses" + "_instructor",
	// 					"courses" + "_title",
	// 					"courses" + "_uuid",
	// 				];
	// 				validator.validateWhere();
	// 				return validator.validWhere;
	// 			},
	// 			"./test/resources/performQueryDynamicTests/validateWhereTests",
	// 			{
	// 				errorValidator: (error): error is Error =>
	// 					error === "InsightError" || error === "ResultTooLargeError",
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
	// 					expect(actual).to.equal(expected);
	// 				},
	// 			}
	// 		);
	// 	});
	//
	// 	describe("validateAndParseOptions", function () {
	// 		before(function () {
	// 			clearDisk();
	// 			facade = new InsightFacade();
	// 			return facade.addDataset("courses", smallerTestStr, InsightDatasetKind.Courses);
	// 		});
	//
	// 		testFolder<Input, ValidateParseOptionsOutput, Error>(
	// 			"Dynamic validateWhere testing",
	// 			(input): ValidateParseOptionsOutput => {
	// 				validator = new QueryValidator(input);
	// 				validator.mkeys = [
	// 					"courses" + "_avg",
	// 					"courses" + "_pass",
	// 					"courses" + "_fail",
	// 					"courses" + "_audit",
	// 					"courses" + "_year",
	// 				];
	// 				validator.skeys = [
	// 					"courses" + "_dept",
	// 					"courses" + "_id",
	// 					"courses" + "_instructor",
	// 					"courses" + "_title",
	// 					"courses" + "_uuid",
	// 				];
	// 				return validator.validateAndParseOptions();
	// 			},
	// 			"./test/resources/performQueryDynamicTests/validateAndParseOptions",
	// 			{
	// 				errorValidator: (error): error is Error =>
	// 					error === "InsightError" || error === "ResultTooLargeError",
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
	// 					expect(actual).to.deep.equal(expected);
	// 					if (isDeepStrictEqual(expected, [])) {
	// 						expect(validator.validOptions).to.be.false;
	// 						expect(validator.order).to.deep.equal("");
	// 					} else {
	// 						expect(validator.validOptions).to.be.true;
	// 						if (Object.prototype.hasOwnProperty.call(validator.query.OPTIONS, "ORDER")) {
	// 							expect(validator.order).to.not.deep.equal("");
	// 							expect(validator.query.OPTIONS.COLUMNS).to.include(validator.order);
	// 						} else {
	// 							expect(validator.order).to.deep.equal("");
	// 						}
	// 					}
	// 				},
	// 			}
	// 		);
	// 	});
	// });
	//
	// describe("Query Dispatch Tests", function () {
	// 	let facade: InsightFacade;
	// 	let queryDispatchObj: QueryDispatch;
	//
	// 	const testNot = {
	// 		WHERE: {
	// 			NOT: {
	// 				LT: {
	// 					courses_avg: 90,
	// 				},
	// 			},
	// 		},
	//
	// 		OPTIONS: {
	// 			COLUMNS: ["courses_id"],
	// 		},
	// 	};
	//
	// 	const oneAsteriskInputStr = {
	// 		WHERE: {
	// 			AND: [
	// 				{
	// 					AND: [
	// 						{
	// 							IS: {
	// 								courses_dept: "math"
	// 							}
	// 						},
	// 						{
	// 							EQ: {
	// 								courses_avg: 90
	// 							}
	// 						}
	// 					]
	// 				},
	// 				{
	// 					IS: {
	// 						courses_id: "*"
	// 					}
	// 				}
	// 			]
	// 		},
	// 		OPTIONS: {
	// 			COLUMNS: [
	// 				"courses_dept",
	// 				"courses_id",
	// 				"courses_avg"
	// 			],
	// 			ORDER: "courses_avg"
	// 		}
	// 	};
	//
	// 	const testNestedNot = {
	// 		WHERE: {
	// 			NOT: {
	// 				NOT: {
	// 					LT: {
	// 						courses_avg: 90,
	// 					},
	// 				},
	// 			},
	// 		},
	//
	// 		OPTIONS: {
	// 			COLUMNS: ["courses_id"],
	// 		},
	// 	};
	//
	// 	const testNestedNotAnd = {
	// 		WHERE: {
	// 			NOT: {
	// 				NOT: {
	// 					AND: [
	// 						{
	// 							LT: {
	// 								courses_avg: 90,
	// 							},
	// 						},
	// 						{
	// 							IS: {
	// 								courses_dept: "cpsc",
	// 							},
	// 						},
	// 					],
	// 				},
	// 			},
	// 		},
	//
	// 		OPTIONS: {
	// 			COLUMNS: ["courses_id"],
	// 		},
	// 	};
	//
	// 	const testNestedNotAndAnd = {
	// 		WHERE: {
	// 			NOT: {
	// 				NOT: {
	// 					AND: [
	// 						{
	// 							LT: {
	// 								courses_avg: 90,
	// 							},
	// 						},
	// 						{
	// 							AND: [
	// 								{
	// 									IS: {
	// 										courses_dept: "cpsc",
	// 									},
	// 								},
	// 							],
	// 						},
	// 					],
	// 				},
	// 			},
	// 		},
	//
	// 		OPTIONS: {
	// 			COLUMNS: ["courses_id"],
	// 		},
	// 	};
	//
	// 	const testObj0 = {
	// 		WHERE: {
	// 			AND: [
	// 				{
	// 					NOT: {
	// 						LT: {
	// 							courses_avg: 90,
	// 						},
	// 					},
	// 				},
	// 				{
	// 					IS: {
	// 						courses_dept: "cpsc",
	// 					},
	// 				},
	// 			],
	// 		},
	// 		OPTIONS: {
	// 			COLUMNS: ["courses_id"],
	// 		},
	// 	};
	// 	const testObj1 = {
	// 		WHERE: {
	// 			OR: [
	// 				{
	// 					AND: [
	// 						{
	// 							LT: {
	// 								courses_avg: 90,
	// 							},
	// 						},
	// 						{
	// 							IS: {
	// 								courses_dept: "cpsc",
	// 							},
	// 						},
	// 					],
	// 				},
	// 				{
	// 					EQ: {
	// 						courses_year: 2012,
	// 					},
	// 				},
	// 			],
	// 		},
	// 		OPTIONS: {
	// 			COLUMNS: ["courses_avg", "courses_dept"],
	// 			ORDER: "courses_avg",
	// 		},
	// 	};
	// 	const testObj2 = {
	// 		WHERE: {
	// 			OR: [
	// 				{
	// 					AND: [
	// 						{
	// 							GT: {
	// 								courses_fail: 10,
	// 							},
	// 						},
	// 						{
	// 							LT: {
	// 								courses_avg: 90,
	// 							},
	// 						},
	// 						{
	// 							EQ: {
	// 								courses_year: 2012,
	// 							},
	// 						},
	// 						{
	// 							IS: {
	// 								courses_dept: "cpsc",
	// 							},
	// 						},
	// 					],
	// 				},
	// 				{
	// 					AND: [
	// 						{
	// 							IS: {
	// 								courses_instructor: "Gregor Kiczales",
	// 							},
	// 						},
	// 					],
	// 				},
	// 			],
	// 		},
	// 		OPTIONS: {
	// 			COLUMNS: ["courses_dept", "courses_id", "courses_avg"],
	// 			ORDER: "courses_avg",
	// 		},
	// 	};
	//
	// 	const nestedAndQuery = {
	// 		WHERE: {
	// 			AND: [
	// 				{
	// 					GT: {
	// 						courses_avg: 90
	// 					}
	// 				},
	// 				{
	// 					IS: {
	// 						courses_dept: "adhe"
	// 					}
	// 				}
	// 			]
	//
	// 		},
	// 		OPTIONS: {
	// 			COLUMNS: [
	// 				"courses_id"
	// 			]
	// 		}
	// 	};
	//
	// 	const singleSearchQuery = {
	// 		WHERE: {
	// 			GT: {
	// 				courses_avg: 99
	// 			}
	//
	// 		},
	// 		OPTIONS: {
	// 			COLUMNS: [
	// 				"courses_dept",
	// 				"courses_avg"
	//
	// 			]
	// 		}
	// 	};
	//
	// 	const complexQuery2 = {
	// 		WHERE: {
	// 			AND: [
	// 				{
	// 					OR: [
	// 						{
	// 							LT: {
	// 								courses_avg: 10
	// 							}
	// 						},
	// 						{
	// 							IS: {
	// 								courses_dept: "adhe"
	// 							}
	// 						}
	// 					]
	// 				},
	// 				{
	// 					EQ: {
	// 						courses_avg: 95
	// 					}
	// 				}
	// 			]
	// 		},
	// 		OPTIONS: {
	// 			COLUMNS: [
	// 				"courses_dept",
	// 				"courses_id",
	// 				"courses_avg",
	// 				"courses_instructor",
	// 				"courses_title",
	// 				"courses_pass",
	// 				"courses_fail",
	// 				"courses_audit",
	// 				"courses_uuid",
	// 				"courses_year"
	// 			],
	// 			ORDER: "courses_dept"
	// 		}
	// 	};
	//
	// 	const nestedAndWithNot = {
	// 		WHERE: {
	// 			AND: [
	// 				{
	// 					NOT: {
	// 						IS: {
	// 							courses_dept: "cpsc"
	// 						}
	// 					}
	// 				},
	// 				{
	// 					IS: {
	// 						courses_dept: "cpsc"
	// 					}
	// 				}
	// 			]
	// 		},
	// 		OPTIONS: {
	// 			COLUMNS: [
	// 				"courses_dept",
	// 				"courses_title",
	// 				"courses_avg",
	// 				"courses_pass",
	// 				"courses_fail"
	// 			],
	// 			ORDER: "courses_avg"
	// 		}
	// 	};
	//
	// 	const validWildCard1 = {
	// 		WHERE: {
	// 			AND: [
	// 				{
	// 					NOT: {
	// 						IS: {
	// 							courses_dept: "*c"
	// 						}
	// 					}
	// 				},
	// 				{
	// 					AND: [
	// 						{
	// 							LT: {
	// 								courses_year: 2010
	// 							}
	// 						},
	// 						{
	// 							EQ: {
	// 								courses_avg: 90
	// 							}
	// 						}
	// 					]
	// 				}
	// 			]
	// 		},
	// 		OPTIONS: {
	// 			COLUMNS: [
	// 				"courses_dept",
	// 				"courses_title",
	// 				"courses_avg",
	// 				"courses_pass",
	// 				"courses_fail",
	// 				"courses_year"
	// 			],
	// 			ORDER: "courses_year"
	// 		}
	// 	};
	//
	// 	const swapWhereOptions = {
	// 		OPTIONS: {
	// 			COLUMNS: [
	// 				"courses_dept",
	// 				"courses_avg"
	// 			],
	// 			ORDER: "courses_avg"
	// 		},
	// 		WHERE: {
	// 			GT: {
	// 				courses_avg: 97
	// 			}
	// 		}
	// 	};
	//
	// 	describe("buildQueryDispatch / performDatasetSearch", function () {
	// 		let where: QueryFilter;
	// 		let or: QueryFilter;
	// 		let and: QueryFilter;
	// 		let not: QueryFilter;
	// 		let gt: DatasetSearch;
	// 		let lt: DatasetSearch;
	// 		let eq: DatasetSearch;
	// 		let is: DatasetSearch;
	//
	// 		describe("performDatasetSearch", function () {
	// 			before(async function () {
	// 				clearDisk();
	// 				facade = new InsightFacade();
	// 				await facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses);
	// 			});
	//
	// 			describe("findAndProcessNot", function () {
	// 				beforeEach(function () {
	// 					where = new QueryFilter(null, "WHERE", [], []);
	// 					or = new QueryFilter(null, "OR", [], []);
	// 					and = new QueryFilter(null, "AND", [], []);
	// 					not = new QueryFilter(null, "NOT", [], []);
	// 					gt = new DatasetSearch("gt", "fail", 10);
	// 					lt = new DatasetSearch("lt", "avg", 90);
	// 					eq = new DatasetSearch("eq", "year", 2012);
	// 					is = new DatasetSearch("is", "dept", "cpsc");
	// 				});
	//
	// 				it("should not touch a simple tree with no nots", function () {
	// 					where.children.push(or);
	// 					or.parent = where;
	// 					or.searches.push(lt, eq, is);
	//
	// 					queryDispatchObj = new QueryDispatch(false, [], "");
	// 					queryDispatchObj.query = Object.create(where);
	//
	// 					queryDispatchObj.findAndProcessNot(where);
	//
	// 					expect(where).to.deep.equal(queryDispatchObj.query);
	//
	// 				});
	//
	// 				it("should touch a simple tree with one not", function () {
	// 					where.children.push(not);
	// 					not.parent = where;
	// 					not.children.push(or);
	// 					or.parent = not;
	// 					or.searches.push(lt, eq, is);
	//
	// 					queryDispatchObj = new QueryDispatch(false, [], "");
	// 					queryDispatchObj.query = Object.create(where);
	//
	// 					queryDispatchObj.findAndProcessNot(where);
	//
	// 					expect(where).to.deep.equal(queryDispatchObj.query);
	//
	// 				});
	// 			});
	//
	// 			describe("query dispatch", function (){
	// 				it("should work with wildcards", async function () {
	// 					let expected = [
	// 						{
	// 							courses_dept: "thtr",
	// 							courses_title: "bibliog & resrch",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "sts",
	// 							courses_title: "sts mstrs colloq",
	// 							courses_avg: 90,
	// 							courses_pass: 5,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "sowk",
	// 							courses_title: "soc work doc sem",
	// 							courses_avg: 90,
	// 							courses_pass: 7,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "sans",
	// 							courses_title: "intro sanskrit",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "port",
	// 							courses_title: "elementary port",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "phys",
	// 							courses_title: "quantum mech ii",
	// 							courses_avg: 90,
	// 							courses_pass: 12,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "phar",
	// 							courses_title: "seminar",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "phar",
	// 							courses_title: "seminar",
	// 							courses_avg: 90,
	// 							courses_pass: 2,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "phar",
	// 							courses_title: "peer teaching 2",
	// 							courses_avg: 90,
	// 							courses_pass: 25,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "pcth",
	// 							courses_title: "ms thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 2,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "pcth",
	// 							courses_title: "ms thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 1,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "pcth",
	// 							courses_title: "ms thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 1,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "pcth",
	// 							courses_title: "ms thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 1,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "path",
	// 							courses_title: "msc thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 2,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "path",
	// 							courses_title: "msc thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 3,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "path",
	// 							courses_title: "clk in lab medic",
	// 							courses_avg: 90,
	// 							courses_pass: 12,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "nurs",
	// 							courses_title: "cl pro prim care",
	// 							courses_avg: 90,
	// 							courses_pass: 14,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "mine",
	// 							courses_title: "seminar",
	// 							courses_avg: 90,
	// 							courses_pass: 2,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "mine",
	// 							courses_title: "seminar",
	// 							courses_avg: 90,
	// 							courses_pass: 2,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "midw",
	// 							courses_title: "comp thry&prctc",
	// 							courses_avg: 90,
	// 							courses_pass: 10,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "medi",
	// 							courses_title: "m.sc. thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 6,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "mech",
	// 							courses_title: "seminar",
	// 							courses_avg: 90,
	// 							courses_pass: 7,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "mech",
	// 							courses_title: "mch tool str&vib",
	// 							courses_avg: 90,
	// 							courses_pass: 8,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_title: "algb geometry i",
	// 							courses_avg: 90,
	// 							courses_pass: 9,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_title: "combinatorial op",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_title: "prt diff equa i",
	// 							courses_avg: 90,
	// 							courses_pass: 5,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_title: "discrete math",
	// 							courses_avg: 90,
	// 							courses_pass: 5,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_title: "tpcs algebra",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "ling",
	// 							courses_title: "fld mthd ling ii",
	// 							courses_avg: 90,
	// 							courses_pass: 7,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "libr",
	// 							courses_title: "research collbrt",
	// 							courses_avg: 90,
	// 							courses_pass: 3,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "kin",
	// 							courses_title: "bioenrgtc ph act",
	// 							courses_avg: 90,
	// 							courses_pass: 15,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "ital",
	// 							courses_title: "advanced ital i",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "hgse",
	// 							courses_title: "frst ntns rsorcs",
	// 							courses_avg: 90,
	// 							courses_pass: 21,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "grsj",
	// 							courses_title: "gndr sex crt rce",
	// 							courses_avg: 90,
	// 							courses_pass: 2,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "germ",
	// 							courses_title: "conv german ii",
	// 							courses_avg: 90,
	// 							courses_pass: 7,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "frst",
	// 							courses_title: "tec comm skls ii",
	// 							courses_avg: 90,
	// 							courses_pass: 15,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "frst",
	// 							courses_title: "plnt molec biol",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "epse",
	// 							courses_title: "tech for vis imp",
	// 							courses_avg: 90,
	// 							courses_pass: 11,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "eece",
	// 							courses_title: "eng report",
	// 							courses_avg: 90,
	// 							courses_pass: 3,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "eece",
	// 							courses_title: "nanophoton fab",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "edst",
	// 							courses_title: "tcher union educ",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "edst",
	// 							courses_title: "ldrshp educ org",
	// 							courses_avg: 90,
	// 							courses_pass: 39,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "edst",
	// 							courses_title: "adu edu pro",
	// 							courses_avg: 90,
	// 							courses_pass: 15,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "econ",
	// 							courses_title: "ph d resrch sem",
	// 							courses_avg: 90,
	// 							courses_pass: 27,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "econ",
	// 							courses_title: "ph d resrch sem",
	// 							courses_avg: 90,
	// 							courses_pass: 13,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "econ",
	// 							courses_title: "soc & econ measu",
	// 							courses_avg: 90,
	// 							courses_pass: 14,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "econ",
	// 							courses_title: "hist mod europe",
	// 							courses_avg: 90,
	// 							courses_pass: 5,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "dent",
	// 							courses_title: "clin endo yr 3",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "dent",
	// 							courses_title: "masters thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 1,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "dent",
	// 							courses_title: "m.sc. thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 1,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "dent",
	// 							courses_title: "biomec cr-fac i",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "dent",
	// 							courses_title: "oral pathology",
	// 							courses_avg: 90,
	// 							courses_pass: 23,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "dent",
	// 							courses_title: "prs pln&outc i",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "dent",
	// 							courses_title: "prosth lit rv i",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "cnps",
	// 							courses_title: "family counsl ii",
	// 							courses_avg: 90,
	// 							courses_pass: 6,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "civl",
	// 							courses_title: "adv coastal eng",
	// 							courses_avg: 90,
	// 							courses_pass: 10,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "civl",
	// 							courses_title: "dynam struct 2",
	// 							courses_avg: 90,
	// 							courses_pass: 5,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "chil",
	// 							courses_title: "child's lit",
	// 							courses_avg: 90,
	// 							courses_pass: 2,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "chem",
	// 							courses_title: "stat'l mech chem",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "cell",
	// 							courses_title: "tpc cytosk&cl mo",
	// 							courses_avg: 90,
	// 							courses_pass: 10,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "audi",
	// 							courses_title: "hearing sci ii",
	// 							courses_avg: 90,
	// 							courses_pass: 12,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "arth",
	// 							courses_title: "master's thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 3,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "arth",
	// 							courses_title: "master's thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 2,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "arth",
	// 							courses_title: "master's thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "arst",
	// 							courses_title: "arch rsrch&schlr",
	// 							courses_avg: 90,
	// 							courses_pass: 6,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "arch",
	// 							courses_title: "masa thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 1,
	// 							courses_fail: 0,
	// 							courses_year: 1900
	// 						},
	// 						{
	// 							courses_dept: "phys",
	// 							courses_title: "quantum mech ii",
	// 							courses_avg: 90,
	// 							courses_pass: 12,
	// 							courses_fail: 0,
	// 							courses_year: 2007
	// 						},
	// 						{
	// 							courses_dept: "phar",
	// 							courses_title: "seminar",
	// 							courses_avg: 90,
	// 							courses_pass: 1,
	// 							courses_fail: 0,
	// 							courses_year: 2007
	// 						},
	// 						{
	// 							courses_dept: "path",
	// 							courses_title: "seminar",
	// 							courses_avg: 90,
	// 							courses_pass: 2,
	// 							courses_fail: 0,
	// 							courses_year: 2007
	// 						},
	// 						{
	// 							courses_dept: "mech",
	// 							courses_title: "seminar",
	// 							courses_avg: 90,
	// 							courses_pass: 1,
	// 							courses_fail: 0,
	// 							courses_year: 2007
	// 						},
	// 						{
	// 							courses_dept: "mech",
	// 							courses_title: "research seminar",
	// 							courses_avg: 90,
	// 							courses_pass: 1,
	// 							courses_fail: 0,
	// 							courses_year: 2007
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_title: "prt diff equa i",
	// 							courses_avg: 90,
	// 							courses_pass: 5,
	// 							courses_fail: 0,
	// 							courses_year: 2007
	// 						},
	// 						{
	// 							courses_dept: "frst",
	// 							courses_title: "plnt molec biol",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 2007
	// 						},
	// 						{
	// 							courses_dept: "nurs",
	// 							courses_title: "cl pro prim care",
	// 							courses_avg: 90,
	// 							courses_pass: 14,
	// 							courses_fail: 0,
	// 							courses_year: 2008
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_title: "combinatorial op",
	// 							courses_avg: 90,
	// 							courses_pass: 4,
	// 							courses_fail: 0,
	// 							courses_year: 2008
	// 						},
	// 						{
	// 							courses_dept: "libr",
	// 							courses_title: "research collbrt",
	// 							courses_avg: 90,
	// 							courses_pass: 2,
	// 							courses_fail: 0,
	// 							courses_year: 2008
	// 						},
	// 						{
	// 							courses_dept: "econ",
	// 							courses_title: "ph d resrch sem",
	// 							courses_avg: 90,
	// 							courses_pass: 13,
	// 							courses_fail: 0,
	// 							courses_year: 2008
	// 						},
	// 						{
	// 							courses_dept: "econ",
	// 							courses_title: "soc & econ measu",
	// 							courses_avg: 90,
	// 							courses_pass: 14,
	// 							courses_fail: 0,
	// 							courses_year: 2008
	// 						},
	// 						{
	// 							courses_dept: "cnps",
	// 							courses_title: "family counsl ii",
	// 							courses_avg: 90,
	// 							courses_pass: 6,
	// 							courses_fail: 0,
	// 							courses_year: 2008
	// 						},
	// 						{
	// 							courses_dept: "arst",
	// 							courses_title: "arch rsrch&schlr",
	// 							courses_avg: 90,
	// 							courses_pass: 6,
	// 							courses_fail: 0,
	// 							courses_year: 2008
	// 						},
	// 						{
	// 							courses_dept: "path",
	// 							courses_title: "msc thesis",
	// 							courses_avg: 90,
	// 							courses_pass: 1,
	// 							courses_fail: 0,
	// 							courses_year: 2009
	// 						},
	// 						{
	// 							courses_dept: "audi",
	// 							courses_title: "hearing sci ii",
	// 							courses_avg: 90,
	// 							courses_pass: 12,
	// 							courses_fail: 0,
	// 							courses_year: 2009
	// 						}
	// 					];
	//
	// 					queryDispatchObj = new QueryDispatch(false, [], "");
	// 					queryDispatchObj.buildQueryDispatch(validWildCard1);
	// 					queryDispatchObj.columns.push("courses_dept", "courses_avg");
	// 					let dataset = facade.getDatasetById("courses");
	// 					if (dataset === null) {
	// 						expect.fail("getDatasetById returned null");
	// 					} else {
	// 						let courses: any[] = await queryDispatchObj.performDatasetSearch(dataset);
	// 						expect(courses).to.deep.equal(expected);
	// 					}
	// 				});
	//
	// 				it("should work with WHERE and OPTIONS swapped", async  function () {
	// 					let validator = new QueryValidator(swapWhereOptions);
	// 					let courses = validator.validateAndParseQuery();
	// 					expect(courses).to.eventually.be.rejectedWith(InsightError);
	// 				});
	//
	// 				it("should search with single AND query, one column, no order", async function () {
	// 					let expected = [
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 93.33
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 90.02
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 96.11
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 92.54
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 90.82
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 91.29
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 91.48
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 90.85
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 90.17
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 90.5
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 91.33
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 91.33
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 90.72
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 90.16
	// 						},
	// 						{
	// 							courses_dept: "adhe",
	// 							courses_avg: 90.18
	// 						}
	// 					];
	//
	// 					queryDispatchObj = new QueryDispatch(false, [], "");
	// 					queryDispatchObj.buildQueryDispatch(nestedAndQuery);
	// 					queryDispatchObj.columns.push("courses_dept", "courses_avg");
	// 					let dataset = facade.getDatasetById("courses");
	// 					if (dataset === null) {
	// 						expect.fail("getDatasetById returned null");
	// 					} else {
	// 						let courses: any[] = await queryDispatchObj.performDatasetSearch(dataset);
	// 						expect(courses).to.deep.equal(expected);
	// 					}
	// 				});
	//
	// 				it("should work with nested not that returns empty list", async function () {
	//
	// 					queryDispatchObj = new QueryDispatch(false, [], "");
	// 					queryDispatchObj.buildQueryDispatch(nestedAndWithNot);
	// 					queryDispatchObj.columns.push("courses_dept", "courses_avg");
	// 					let dataset = facade.getDatasetById("courses");
	// 					if (dataset === null) {
	// 						expect.fail("getDatasetById returned null");
	// 					} else {
	// 						let courses: any[] = await queryDispatchObj.performDatasetSearch(dataset);
	// 						expect(courses).to.deep.equal([]);
	// 					}
	// 				});
	//
	// 				it("should search only with one search", async function () {
	// 					let expected = [
	// 						{
	// 							courses_dept: "cnps",
	// 							courses_avg: 99.19
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_avg: 99.78
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_avg: 99.78
	// 						}
	// 					];
	//
	// 					queryDispatchObj = new QueryDispatch(false, [], "");
	// 					queryDispatchObj.buildQueryDispatch(singleSearchQuery);
	// 					queryDispatchObj.columns.push("courses_dept", "courses_avg");
	// 					let dataset = facade.getDatasetById("courses");
	// 					if (dataset === null) {
	// 						expect.fail("getDatasetById returned null");
	// 					} else {
	// 						let courses: any[] = await queryDispatchObj.performDatasetSearch(dataset);
	// 						expect(courses).to.deep.equal(expected);
	// 					}
	//
	// 				});
	//
	// 				it("should succeed with complexQuery2", async function () {
	// 					let expected: any = [];
	//
	// 					queryDispatchObj = new QueryDispatch(false, [], "");
	// 					queryDispatchObj.buildQueryDispatch(complexQuery2);
	// 					queryDispatchObj.columns.push("courses_dept", "courses_avg");
	// 					let dataset = facade.getDatasetById("courses");
	// 					if (dataset === null) {
	// 						expect.fail("getDatasetById returned null");
	// 					} else {
	// 						let courses: any[] = await queryDispatchObj.performDatasetSearch(dataset);
	// 						expect(courses).to.deep.equal(expected);
	// 					}
	//
	// 				});
	//
	// 				it("should succeed with only one asterisk", async function () {
	// 					let expected: any = [
	// 						{
	// 							courses_dept: "math",
	// 							courses_id: "589",
	// 							courses_avg: 90
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_id: "532",
	// 							courses_avg: 90
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_id: "532",
	// 							courses_avg: 90
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_id: "523",
	// 							courses_avg: 90
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_id: "523",
	// 							courses_avg: 90
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_id: "516",
	// 							courses_avg: 90
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_id: "516",
	// 							courses_avg: 90
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_id: "503",
	// 							courses_avg: 90
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_id: "503",
	// 							courses_avg: 90
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_id: "423",
	// 							courses_avg: 90
	// 						},
	// 						{
	// 							courses_dept: "math",
	// 							courses_id: "423",
	// 							courses_avg: 90
	// 						}
	// 					];
	//
	// 					queryDispatchObj = new QueryDispatch(false, [], "");
	// 					queryDispatchObj.buildQueryDispatch(oneAsteriskInputStr);
	// 					queryDispatchObj.columns.push("courses_dept", "courses_avg");
	// 					let dataset = facade.getDatasetById("courses");
	// 					if (dataset === null) {
	// 						expect.fail("getDatasetById returned null");
	// 					} else {
	// 						let courses: any[] = await queryDispatchObj.performDatasetSearch(dataset);
	// 						expect(courses).to.deep.equal(expected);
	// 					}
	//
	// 				});
	// 			});
	// 		});
	//
	//
	// 		describe("buildQueryDispatch", function () {
	//
	// 			before(function () {
	// 				clearDisk();
	// 				facade = new InsightFacade();
	// 				return facade.addDataset("courses", smallerTestStr, InsightDatasetKind.Courses);
	// 			});
	//
	// 			beforeEach(function () {
	// 				where = new QueryFilter(null, "WHERE", [], []);
	// 				or = new QueryFilter(null, "OR", [], []);
	// 				and = new QueryFilter(null, "AND", [], []);
	// 				not = new QueryFilter(null, "NOT", [], []);
	// 				gt = new DatasetSearch("gt", "fail", 10);
	// 				lt = new DatasetSearch("lt", "avg", 90);
	// 				eq = new DatasetSearch("eq", "year", 2012);
	// 				is = new DatasetSearch("is", "dept", "cpsc");
	// 			});
	//
	// 			it("should work with complex nested", function () {
	// 				where.children.push(or);
	// 				or.parent = where;
	// 				or.children.push(and);
	// 				or.searches.push(eq);
	// 				and.parent = or;
	// 				and.searches.push(lt, is);
	//
	// 				queryDispatchObj = new QueryDispatch(false, [], "");
	// 				queryDispatchObj.buildQueryDispatch(testObj1);
	//
	// 				expect(queryDispatchObj.query).to.deep.equal(where);
	// 			});
	//
	// 			it("should work with complex nested2", function () {
	// 				where.children.push(or);
	// 				or.parent = where;
	// 				or.children.push(and);
	// 				and.parent = or;
	// 				and.searches.push(gt, lt, eq, is);
	// 				let and2: QueryFilter = new QueryFilter(or, "AND", [], []);
	// 				let is2: DatasetSearch = new DatasetSearch("is", "instructor", "Gregor Kiczales");
	// 				or.children.push(and2);
	// 				and2.searches.push(is2);
	//
	// 				queryDispatchObj = new QueryDispatch(false, [], "");
	// 				queryDispatchObj.buildQueryDispatch(testObj2);
	//
	// 				expect(queryDispatchObj.query).to.deep.equal(where);
	// 			});
	//
	// 			it("should work with single not", function () {
	// 				where.children.push(not);
	// 				not.parent = where;
	// 				not.searches.push(lt);
	//
	// 				queryDispatchObj = new QueryDispatch(false, [], "");
	// 				queryDispatchObj.buildQueryDispatch(testNot);
	//
	// 				expect(queryDispatchObj.query).to.deep.equal(where);
	// 			});
	//
	// 			it("should work with nested nots", function () {
	// 				where.children.push(not);
	// 				not.parent = where;
	// 				let not1: QueryFilter = new QueryFilter(null, "NOT", [], []);
	// 				not.children.push(not1);
	// 				not1.parent = not;
	// 				not1.searches.push(lt);
	//
	// 				queryDispatchObj = new QueryDispatch(false, [], "");
	// 				queryDispatchObj.buildQueryDispatch(testNestedNot);
	//
	// 				expect(queryDispatchObj.query).to.deep.equal(where);
	// 			});
	//
	// 			it("should work with nested not with and", function () {
	// 				where.children.push(not);
	// 				not.parent = where;
	// 				let not1: QueryFilter = new QueryFilter(null, "NOT", [], []);
	// 				not.children.push(not1);
	// 				not1.parent = not;
	// 				not1.children.push(and);
	// 				and.parent = not1;
	// 				and.searches.push(lt, is);
	//
	// 				queryDispatchObj = new QueryDispatch(false, [], "");
	// 				queryDispatchObj.buildQueryDispatch(testNestedNotAnd);
	//
	// 				expect(queryDispatchObj.query).to.deep.equal(where);
	// 			});
	//
	// 			it("should work with nested not with and and", function () {
	// 				where.children.push(not);
	// 				not.parent = where;
	// 				let not1: QueryFilter = new QueryFilter(null, "NOT", [], []);
	// 				not.children.push(not1);
	// 				not1.parent = not;
	// 				not1.children.push(and);
	// 				and.parent = not1;
	// 				let and1: QueryFilter = new QueryFilter(null, "AND", [], []);
	// 				and.searches.push(lt);
	// 				and.children.push(and1);
	// 				and1.parent = and;
	// 				and1.searches.push(is);
	//
	// 				queryDispatchObj = new QueryDispatch(false, [], "");
	// 				queryDispatchObj.buildQueryDispatch(testNestedNotAndAnd);
	//
	// 				expect(queryDispatchObj.query).to.deep.equal(where);
	// 			});
	//
	// 			it("should build a simple query filter tree", function () {
	// 				where.children.push(and);
	// 				and.parent = where;
	// 				and.children.push(not);
	// 				not.parent = and;
	// 				not.searches.push(lt);
	// 				and.searches.push(is);
	//
	// 				queryDispatchObj = new QueryDispatch(false, [], "");
	// 				queryDispatchObj.buildQueryDispatch(testObj0);
	//
	// 				expect(queryDispatchObj.query).to.deep.equal(where);
	// 			});
	//
	// 			it ("should work", function () {
	// 				where.children.push(or);
	// 				or.parent = where;
	// 				or.children.push(and);
	// 				and.parent = or;
	// 				gt = new DatasetSearch("gt", "fail", 40);
	// 				lt = new DatasetSearch("lt", "pass", 400);
	// 				eq = new DatasetSearch("eq", "year", 2012);
	// 				is = new DatasetSearch("is", "instructor", "*greg*");
	// 				and.searches.push(gt, lt, eq);
	// 				let and2: QueryFilter = new QueryFilter(or, "AND", [], []);
	// 				let eq2: DatasetSearch = new DatasetSearch("eq", "year", 2015);
	// 				or.children.push(and2);
	// 				and2.searches.push(is);
	// 				and2.searches.push(eq2);
	//
	// 				queryDispatchObj = new QueryDispatch(false, ["dept", "id", "avg", "instructor"], "dept");
	// 				queryDispatchObj.buildQueryDispatch(testObj2);
	//
	// 				expect(queryDispatchObj.query).to.deep.equal(where);
	//
	// 			});
	// 		});
	//
	// 	});
	// });

		describe("Add Dataset", function () {
			let coursesWithInvalidJson: string;

			let facade: IInsightFacade;

		// Runs before each "it"
			beforeEach(function () {
				clearDisk();
				facade = new InsightFacade();
			});

			it("should be able to add dataset that includes invalid json ", function () {
				coursesWithInvalidJson = getContentFromArchives("barb.zip");
				return facade
					.addDataset("test", coursesWithInvalidJson, InsightDatasetKind.Courses)
					.then((addedIDs) => expect(addedIDs).to.deep.equal(["test"]));
			});

			it("should add a valid dataset: collection empty", function () {
				return facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses).then((idList) => {
					expect(idList).to.deep.equal(["courses"]);
					expect(idList).to.be.an.instanceof(Array);
					expect(idList).to.have.length(1);
				});
			});

			it("should add a valid dataset: collection already has one valid dataset", function () {
				return facade
					.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset("small", coursesContentStr, InsightDatasetKind.Courses);
					})
					.then((idList) => {
						expect(idList).to.have.deep.members(["courses", "small"]);
						expect(idList).to.be.an.instanceof(Array);
						expect(idList).to.have.length(2);
					});
			});

			it("should add a valid dataset: id contains some whitespace", function () {
				return facade.addDataset("  co  urses  ", coursesContentStr, InsightDatasetKind.Courses)
					.then((idList) => {
						expect(idList).to.deep.equal(["  co  urses  "]);
						expect(idList).to.be.an.instanceof(Array);
						expect(idList).to.have.length(1);
					});
			});

			it("should reject a duplicate dataset", function () {
				return facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses).then(() => {
					return expect(
						facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Courses)
					).eventually.to.be.rejectedWith(InsightError);
				});
			});

			it("should reject a valid dataset with kind-type Rooms", function () {
				return expect(
					facade.addDataset("courses", coursesContentStr, InsightDatasetKind.Rooms)
				).to.eventually.be.rejectedWith(InsightError);
			});

			it("should reject an invalid dataset: id contains underscore", function () {
				return expect(
					facade.addDataset("_courses", coursesContentStr, InsightDatasetKind.Courses)
				).to.eventually.be.rejectedWith(InsightError);
			});

			it("should reject an invalid dataset: id is all whitespace", function () {
				return expect(
					facade.addDataset("    ", coursesContentStr, InsightDatasetKind.Courses)
				).to.eventually.be.rejectedWith(InsightError);
			});

			it("should reject an invalid dataset: id is empty string", function () {
				return expect(
					facade.addDataset("", coursesContentStr, InsightDatasetKind.Courses)
				).to.eventually.be.rejectedWith(InsightError);
			});

			it("should reject an invalid dataset: course files not under a folder courses/", function () {
				const noCoursesStr = getContentFromArchives("noCoursesFolder.zip");
				return expect(
					facade.addDataset("courses", noCoursesStr, InsightDatasetKind.Courses)
				).to.eventually.be.rejectedWith(InsightError);
			});

			it("should reject an invalid dataset: courses not in JSON format", function () {
				const noJSON = getContentFromArchives("filesNotJson.zip");
				return expect(
					facade.addDataset("courses", noJSON, InsightDatasetKind.Courses)
				).to.eventually.be.rejectedWith(InsightError);
			});

			it("should reject an invalid dataset: empty file", function () {
				const emptyFileStr = getContentFromArchives("emptyFile.zip");
				return expect(
					facade.addDataset("courses", emptyFileStr, InsightDatasetKind.Courses)
				).to.eventually.be.rejectedWith(InsightError);
			});

			it("should reject an invalid dataset: empty file empty courses", function () {
				const emptyFileStr = getContentFromArchives("emptyFileEmptyCourses.zip");
				return expect(
					facade.addDataset("courses", emptyFileStr, InsightDatasetKind.Courses)
				).to.eventually.be.rejectedWith(InsightError);
			});

		// it("should reject an invalid dataset: jsons in and out of courses", function () {
		// 	const inAndOut = getContentFromArchives("jsonsInAndOutOfCourses.zip");
		// 	return expect(
		// 		facade.addDataset("courses", inAndOut, InsightDatasetKind.Courses)
		// 	).to.eventually.be.rejectedWith(InsightError);
		// });

			it("should reject an invalid dataset: jsons not in courses", function () {
				const emptyFileStr = getContentFromArchives("jsonsNotInCourses.zip");
				return expect(
					facade.addDataset("courses", emptyFileStr, InsightDatasetKind.Courses)
				).to.eventually.be.rejectedWith(InsightError);
			});

			it("should reject an invalid dataset: jsons in different folder", function () {
				const emptyFileStr = getContentFromArchives("jsonsInDifferentFolder.zip");
				return expect(
					facade.addDataset("courses", emptyFileStr, InsightDatasetKind.Courses)
				).to.eventually.be.rejectedWith(InsightError);
			});
		});
	});

// import {
// 	IInsightFacade,
// 	InsightDataset,
// 	InsightDatasetKind,
// 	InsightError,
// 	NotFoundError,
// 	ResultTooLargeError,
// } from "../../src/controller/IInsightFacade";
// import InsightFacade from "../../src/controller/InsightFacade";
// import {beforeEach} from "mocha";
// import {expect, use} from "chai";
// import chaiAsPromised from "chai-as-promised";
// import {clearDisk, getContent, getContentFromArchives} from "../TestUtil";
// import {testFolder} from "@ubccpsc310/folder-test";
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
// 	// use this for generic dataset adding
// 	let coursesSmaller: string;
//
// 	let courses: string;
// 	let courses2: string;
// 	let ubcCourses: string;
// 	let unzip: string;
// 	let coursesWithInvalidJson: string;
// 	let NotZip: string;
// 	let noJSONcourses: string;
// 	let coursesOneInvalid: string;
// 	let coursesNoSections: string;
// 	let coursesNoCoursesFolder: string;
// 	let coursesNoValidCourses: string;
// 	let corruptedCourses: string;
// 	let coursesInvalidSection: string;
//
// 	// If getContentFromArchives throws exception, whole test suite crashes.  Use
// 	// the before() construct for more specific error messages.  Runs before any of the
// 	// tests - runs before it's describe
// 	before(function () {
// 		// use this for generic dataset adding (c0 autobot timeout workaround)
// 		coursesSmaller = getContentFromArchives("coursesSmaller.zip");
//
// 		courses = getContentFromArchives("courses.zip");
// 		courses2 = getContentFromArchives("courses2.zip");
// 		ubcCourses = getContentFromArchives("ubcCourses.zip");
// 		unzip = getContent("ubc/AANB500");
// 		coursesWithInvalidJson = getContentFromArchives("invalidCourse.zip");
// 		NotZip = getContentFromArchives("curses.json");
// 		noJSONcourses = getContentFromArchives("noJSONcourses.zip");
// 		coursesOneInvalid = getContentFromArchives("coursesOneInvalid.zip");
// 		coursesNoSections = getContentFromArchives("coursesNoSections.zip");
// 		coursesNoValidCourses = getContentFromArchives("coursesJSONNotValidCourse.zip");
// 		coursesNoCoursesFolder = getContentFromArchives("coursesNoCoursesFolder.zip");
// 		corruptedCourses = getContentFromArchives("courses-2.zip");
// 		coursesInvalidSection = getContentFromArchives("courses-invalid-section.zip");
// 		clearDisk();
// 	});
//
// 	describe("List Datasets", function () {
// 		let facade: IInsightFacade;
//
// 		// Runs before each "it"
//
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
// 				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
// 				.then(() => {
// 					return facade.listDatasets();
// 				})
// 				.then((insightDatasets) => {
// 					// expect(insightDatasets).to.deep.equal([
// 					// 	{
// 					// 		id: "courses",
// 					// 		kind: InsightDatasetKind.Courses,
// 					// 		numRows: 2,
// 					// 	},
// 					// ]);
//
// 					// Or alternatively..
// 					expect(insightDatasets).to.be.an.instanceof(Array);
// 					expect(insightDatasets).to.have.length(1);
// 				});
// 		});
//
// 		it("should list multiple datasets", function () {
// 			return facade
// 				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
// 				.then(() => {
// 					return facade.addDataset("courses-2", coursesSmaller, InsightDatasetKind.Courses);
// 				})
// 				.then(() => {
// 					return facade.listDatasets();
// 				})
// 				.then((insightDatasets) => {
// 					const expectedDatasets: InsightDataset[] = [
// 						{
// 							id: "courses",
// 							kind: InsightDatasetKind.Courses,
// 							numRows: 2,
// 						},
// 						{
// 							id: "courses-2",
// 							kind: InsightDatasetKind.Courses,
// 							numRows: 2,
// 						},
// 					];
// 					expect(insightDatasets).to.be.an.instanceof(Array);
// 					expect(insightDatasets).to.have.deep.members(expectedDatasets);
// 					expect(insightDatasets).to.have.length(2);
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
// 		it("should successfully remove a dataset", function () {
// 			return facade
// 				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
// 				.then(() => {
// 					return facade.removeDataset("courses");
// 				})
// 				.then((removedID) => {
// 					expect(removedID).to.deep.equal("courses");
// 				})
// 				.then(() => {
// 					return facade.listDatasets();
// 				})
// 				.then((insightDatasets) => {
// 					expect(insightDatasets).to.deep.equal([]);
// 				});
// 		});
//
// 		it("should fail to remove a dataset because no dataset is added", function () {
// 			return expect(facade.removeDataset("courses")).eventually.to.be.rejectedWith(NotFoundError);
// 		});
//
// 		it("should fail to remove a dataset because ID does not match", function () {
// 			return facade
// 				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
// 				.then(() => {
// 					return expect(facade.removeDataset("courses-2")).eventually.to.be.rejectedWith(NotFoundError);
// 				})
// 				.then(() => {
// 					return facade.listDatasets();
// 				})
// 				.then((insightDatasets) => {
// 					expect(insightDatasets).to.deep.equal([
// 						{
// 							id: "courses",
// 							kind: InsightDatasetKind.Courses,
// 							numRows: 2,
// 						},
// 					]);
// 				});
// 		});
//
// 		it("should fail to remove a dataset due to ID having an underscore", function () {
// 			return facade
// 				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
// 				.then(() => {
// 					return expect(facade.removeDataset("c_ou_rses")).eventually.to.be.rejectedWith(InsightError);
// 				})
// 				.then(() => {
// 					return facade.listDatasets();
// 				})
// 				.then((insightDatasets) => {
// 					expect(insightDatasets).to.deep.equal([
// 						{
// 							id: "courses",
// 							kind: InsightDatasetKind.Courses,
// 							numRows: 2,
// 						},
// 					]);
// 				});
// 		});
//
// 		it("should fail to to remove a dataset due to ID being whitespaces only", function () {
// 			return facade
// 				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
// 				.then(() => {
// 					return expect(facade.removeDataset("   ")).eventually.to.be.rejectedWith(InsightError);
// 				})
// 				.then(() => {
// 					return facade.listDatasets();
// 				})
// 				.then((insightDatasets) => {
// 					expect(insightDatasets).to.deep.equal([
// 						{
// 							id: "courses",
// 							kind: InsightDatasetKind.Courses,
// 							numRows: 2,
// 						},
// 					]);
// 				});
// 		});
//
// 		it("should successfully remove one of two datasets", function () {
// 			return facade
// 				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
// 				.then(() => {
// 					return facade.addDataset("courses-2", coursesSmaller, InsightDatasetKind.Courses);
// 				})
// 				.then(() => {
// 					return facade.removeDataset("courses-2");
// 				})
// 				.then((removedID) => {
// 					expect(removedID).to.deep.equal("courses-2");
// 				})
// 				.then(() => {
// 					return facade.listDatasets();
// 				})
// 				.then((insightDatasets) => {
// 					expect(insightDatasets).to.deep.equal([
// 						{
// 							id: "courses",
// 							kind: InsightDatasetKind.Courses,
// 							numRows: 2,
// 						},
// 					]);
// 				});
// 		});
//
// 		// IF THIS PASSES THEN INVALID IDS THEN PROBLEM WAS ASSERTING ON INSIGHTERROR INSTEAD OF NOTFOUNDERROR
// 		it("should not accept underscore at beginning of id in remove", function () {
// 			return facade.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses).then(() => {
// 				const result = facade.removeDataset("_courses");
// 				return expect(result).eventually.to.be.rejectedWith(NotFoundError);
// 			});
// 		});
//
// 		it("should not remove before anything has been added", function () {
// 			const result = facade.removeDataset("courses");
// 			return expect(result).eventually.to.be.rejectedWith(NotFoundError);
// 		});
//
// 		it(
// 			"should fulfill with id string when dataset is present " + "and id valid: only one dataset added",
// 			function () {
// 				return facade
// 					.addDataset(validIdWithSpaces, coursesSmaller, InsightDatasetKind.Courses)
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
// 					.addDataset("dummy", coursesSmaller, InsightDatasetKind.Courses)
// 					.then(() => {
// 						return facade.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses);
// 					})
// 					.then(() => {
// 						return facade.addDataset("dummy2", coursesSmaller, InsightDatasetKind.Courses);
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
// 				return facade.addDataset("wrongOne", coursesSmaller, InsightDatasetKind.Courses).then(() => {
// 					return expect(facade.removeDataset(validId)).eventually.to.be.rejectedWith(NotFoundError);
// 				});
// 			}
// 		);
//
// 		it(
// 			"should reject with NotFoundError if id is valid but " + "dataset not present: multiple datasets added",
// 			function () {
// 				return facade
// 					.addDataset("wrongOneBuddy", coursesSmaller, InsightDatasetKind.Courses)
// 					.then(() => {
// 						return facade.addDataset("tryGagin Pal!", courses, InsightDatasetKind.Courses);
// 					})
// 					.then(() => {
// 						return expect(facade.removeDataset(validId)).eventually.to.be.rejectedWith(NotFoundError);
// 					});
// 			}
// 		);
//
// 		it("should reject with NotFoundError after consecutive calls " + "with same (valid) id", function () {
// 			return facade
// 				.addDataset("dummy", coursesSmaller, InsightDatasetKind.Courses)
// 				.then(() => {
// 					return facade.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses);
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
// 				return facade.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses).then(() => {
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
// 					.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses)
// 					.then(() => {
// 						return facade.addDataset("anoter valid id", coursesSmaller, InsightDatasetKind.Courses);
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
// 				return facade.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses).then(() => {
// 					return expect(facade.removeDataset(invalidIdWhitespace)).eventually.to.be.rejectedWith(
// 						InsightError
// 					);
// 				});
// 			}
// 		);
//
// 		it(
// 			"should reject with InsightError if invalid id given: " +
// 				"is only whitespace chars, multiple datasets added",
// 			function () {
// 				return facade
// 					.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses)
// 					.then(() => {
// 						return facade.addDataset("anoter valid id", coursesSmaller, InsightDatasetKind.Courses);
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
// 			return facade.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses).then(() => {
// 				return expect(facade.removeDataset(invalidIdEmptyStr)).eventually.to.be.rejectedWith(InsightError);
// 			});
// 		});
//
// 		it(
// 			"should reject with InsightError if invalid id given: " + "empty string, multiple datasets added",
// 			function () {
// 				return facade
// 					.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses)
// 					.then(() => {
// 						return facade.addDataset("anoter valid id", coursesSmaller, InsightDatasetKind.Courses);
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
// 		before(function () {
// 			clearDisk();
// 			facade = new InsightFacade();
// 			facade.addDataset("courses", courses, InsightDatasetKind.Courses);
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
// 	describe("Add Dataset", function () {
// 		let facade: IInsightFacade;
//
// 		// Runs before each "it"
// 		beforeEach(function () {
// 			clearDisk();
// 			facade = new InsightFacade();
// 		});
//
// 		it("should add a valid dataset: collection empty", function () {
// 			return facade.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses).then((idList) => {
// 				expect(idList).to.deep.equal(["courses"]);
// 				expect(idList).to.be.an.instanceof(Array);
// 				expect(idList).to.have.length(1);
// 			});
// 		});
//
// 		it("should add a valid dataset: collection already has one valid dataset", function () {
// 			return facade
// 				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
// 				.then(() => {
// 					return facade.addDataset("small", coursesSmaller, InsightDatasetKind.Courses);
// 				})
// 				.then((idList) => {
// 					expect(idList).to.have.deep.members(["courses", "small"]);
// 					expect(idList).to.be.an.instanceof(Array);
// 					expect(idList).to.have.length(2);
// 				});
// 		});
//
// 		it("should add a valid dataset: id contains some whitespace", function () {
// 			return facade.addDataset("  co  urses  ", coursesSmaller, InsightDatasetKind.Courses).then((idList) => {
// 				expect(idList).to.deep.equal(["  co  urses  "]);
// 				expect(idList).to.be.an.instanceof(Array);
// 				expect(idList).to.have.length(1);
// 			});
// 		});
//
// 		it("should reject a duplicate dataset", function () {
// 			return facade.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses).then(() => {
// 				return expect(
// 					facade.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
// 				).eventually.to.be.rejectedWith(InsightError);
// 			});
// 		});
//
// 		it("should reject a valid dataset with kind-type Rooms", function () {
// 			return expect(
// 				facade.addDataset("courses", coursesSmaller, InsightDatasetKind.Rooms)
// 			).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject an invalid dataset: id contains underscore", function () {
// 			return expect(
// 				facade.addDataset("_courses", coursesSmaller, InsightDatasetKind.Courses)
// 			).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject an invalid dataset: id is all whitespace", function () {
// 			return expect(
// 				facade.addDataset("    ", coursesSmaller, InsightDatasetKind.Courses)
// 			).to.eventually.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject an invalid dataset: id is empty string", function () {
// 			return expect(
// 				facade.addDataset("", coursesSmaller, InsightDatasetKind.Courses)
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
// 		it("should reject an invalid dataset: jsons in and out of courses", function () {
// 			const inAndOut = getContentFromArchives("jsonsInAndOutOfCourses.zip");
// 			return expect(
// 				facade.addDataset("courses", inAndOut, InsightDatasetKind.Courses)
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
//
// 		it("should be able to add dataset that includes an invalid jason", function () {
// 			coursesWithInvalidJson = getContentFromArchives("invalidCourse.zip");
// 			return facade.addDataset("courses", coursesWithInvalidJson, InsightDatasetKind.Courses).then((addedIds) => {
// 				expect(addedIds).to.deep.equal(["courses"]);
// 			});
// 		});
//
// 		it("should successfully add a dataset", function () {
// 			return facade.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses).then((addedIds) => {
// 				expect(addedIds).to.deep.equal(["courses"]);
// 			});
// 		});
//
// 		it("should fail to add dataset because there is not valid section", function () {
// 			return expect(
// 				facade.addDataset("coursesInvalidSection", coursesInvalidSection, InsightDatasetKind.Courses)
// 			).eventually.to.be.rejectedWith(InsightError);
// 		});
//
// 		it("should fail to add dataset because it is invalid kind", function () {
// 			return expect(
// 				facade.addDataset("courses", courses, InsightDatasetKind.Rooms)
// 			).eventually.to.be.rejectedWith(InsightError);
// 		});
//
// 		it("should fail to add a dataset because it is not a valid zip file", function () {
// 			return expect(
// 				facade.addDataset("curses", NotZip, InsightDatasetKind.Courses)
// 			).eventually.to.be.rejectedWith(InsightError);
// 		});
//
// 		it("should fail to add a dataset because no courses are in JSON format", function () {
// 			return expect(
// 				facade.addDataset("noJSONcourses", noJSONcourses, InsightDatasetKind.Courses)
// 			).eventually.to.be.rejectedWith(InsightError);
// 		});
//
// 		it("should fail to add dataset because there is no courses folder", function () {
// 			return expect(
// 				facade.addDataset("coursesNoCoursesFolder", coursesNoCoursesFolder, InsightDatasetKind.Courses)
// 			).eventually.to.be.rejectedWith(InsightError);
// 		});
//
// 		it("should fail to add a dataset with some courses not valid", function () {
// 			return expect(
// 				facade.addDataset("coursesOneInvalid", coursesOneInvalid, InsightDatasetKind.Courses)
// 			).eventually.to.be.rejectedWith(InsightError);
// 		});
//
// 		it("should fail to add because id is all white space", function () {
// 			return expect(facade.addDataset("    ", courses, InsightDatasetKind.Courses)).eventually.to.be.rejectedWith(
// 				InsightError
// 			);
// 		});
//
// 		it("should successfully add even if id has white space", function () {
// 			return facade.addDataset("c o u r s e s ", coursesSmaller, InsightDatasetKind.Courses).then((addedIds) => {
// 				expect(addedIds).to.deep.equal(["c o u r s e s "]);
// 			});
// 		});
//
// 		it("should successfully add even though course is missing information", function () {
// 			return expect(
// 				facade.addDataset("corruptedCourses", corruptedCourses, InsightDatasetKind.Courses)
// 			).eventually.to.be.rejectedWith(InsightError);
// 		});
//
// 		it("should fail to add because the json files are not valid courses", function () {
// 			return expect(
// 				facade.addDataset("coursesNoValidCourses", coursesNoValidCourses, InsightDatasetKind.Courses)
// 			).eventually.to.be.rejectedWith(InsightError);
// 		});
//
// 		it("should fail to add because id has an underscore", function () {
// 			return expect(
// 				facade.addDataset("c_o_u_r_s_e_s", courses, InsightDatasetKind.Courses)
// 			).eventually.to.be.rejectedWith(InsightError);
// 		});
//
// 		it("should fail to add because no sections", function () {
// 			return expect(
// 				facade.addDataset("coursesNoSections", coursesNoSections, InsightDatasetKind.Courses)
// 			).eventually.to.be.rejectedWith(InsightError);
// 		});
//
// 		it("should reject repeat ID", function () {
// 			return facade
// 				.addDataset("courses", courses, InsightDatasetKind.Courses)
// 				.then(() =>
// 					expect(
// 						facade.addDataset("courses", coursesOneInvalid, InsightDatasetKind.Courses)
// 					).eventually.to.be.rejectedWith(InsightError)
// 				)
// 				.then(() => facade.listDatasets())
// 				.then((insightDatasets) => {
// 					expect(insightDatasets).to.deep.equal([
// 						{
// 							id: "courses",
// 							kind: InsightDatasetKind.Courses,
// 							numRows: 64612,
// 						},
// 					]);
// 				});
// 		});
//
// 		it("should add two of the same dataset with different ids", function () {
// 			return facade
// 				.addDataset("courses", courses, InsightDatasetKind.Courses)
// 				.then(() => facade.addDataset("courses-2", courses, InsightDatasetKind.Courses))
// 				.then((addedIDs) => {
// 					expect(addedIDs).to.be.instanceof(Array);
// 					expect(addedIDs).to.have.deep.members(["courses-2", "courses"]);
// 					expect(addedIDs).to.have.length(2);
// 				});
// 		});
// 	});
//
// 	// describe("performQuery", function () {
// 	// 	let facade: IInsightFacade = new InsightFacade();
// 	//
// 	// 	before(function () {
// 	// 		clearDisk();
// 	// 		facade = new InsightFacade();
// 	// 		return facade
// 	// 			.addDataset("courses", courses, InsightDatasetKind.Courses)
// 	// 			.then(() => facade.addDataset("courses-2", courses, InsightDatasetKind.Courses));
// 	// 	});
// 	//
// 	// 	testFolder<Input, Output, Error>(
// 	// 		"performQuery",
// 	// 		(input: Input): Promise<Output> => {
// 	// 			return facade.performQuery(input);
// 	// 		},
// 	// 		"./test/json",
// 	// 		{
// 	// 			assertOnResult: (expected, actual) => {
// 	// 				expect(actual).to.be.instanceof(Array);
// 	// 				expect(actual).to.have.deep.members(expected);
// 	// 				expect(actual).to.have.length(expected.length);
// 	// 			},
// 	// 			errorValidator: (error): error is Error => error === "InsightError" || error === "ResultTooLargeError",
// 	// 			assertOnError: (expected, actual) => {
// 	// 				if (expected === "InsightError") {
// 	// 					expect(actual).to.be.instanceof(InsightError);
// 	// 				} else if (expected === "ResultTooLargeError") {
// 	// 					expect(actual).to.be.instanceof(ResultTooLargeError);
// 	// 				} else {
// 	// 					expect.fail("UNEXPECTED ERROR");
// 	// 				}
// 	// 			},
// 	// 		}
// 	// 	);
// 	// });
});
