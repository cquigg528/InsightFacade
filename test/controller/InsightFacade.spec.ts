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
import {clearDisk, getContent, getContentFromArchives} from "../TestUtil";
import {testFolder} from "@ubccpsc310/folder-test";

use(chaiAsPromised);


type Input = any;
type Output = any[];
type Error = "InsightError" | "ResultTooLargeError";

// Notes:
// Can use nested describes, and attach before handles to different describes
describe("InsightFacade", function () {
	let courses: string;
	let courses2: string;
	let ubcCourses: string;
	let unzip: string;
	let coursesWithInvalidJson: string;

	// If getContentFromArchives throws exception, whole test suite crashes.  Use
	// the before() construct for more specific error messages.  Runs before any of the
	// tests - runs before it's describe
	before(function () {
		courses = getContentFromArchives("courses.zip");
		courses2 = getContentFromArchives("courses2.zip");
		ubcCourses = getContentFromArchives("ubcCourses.zip");
		unzip = getContent("ubc/AANB500");
		coursesWithInvalidJson = getContentFromArchives("invalidCourse.zip");
		clearDisk();
	});

	describe("List Datasets", function () {
		let facade: IInsightFacade;

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
				.addDataset("courses", courses, InsightDatasetKind.Courses)
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
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("courses-2", courses, InsightDatasetKind.Courses);
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

		it("should not accept underscore at beginning of id", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				const result = facade.removeDataset("_courses");
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});
		});
		it("should not accept underscore at end of id", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				const result = facade.removeDataset("courses_");
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});
		});
		it("should not accept underscore in middle of id", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				const result = facade.removeDataset("cou_rses");
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});
		});
		it("should not accept whitespace as id", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				const result = facade.removeDataset("    ");
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});
		});

		it("should throw a not found error if id hasn't been added yet ", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				const result = facade.removeDataset("courses-2");
				return expect(result).eventually.to.be.rejectedWith(NotFoundError);
			});
		});

		it("should not accept underscore at beginning of id in remove", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				const result = facade.removeDataset("_courses");
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});
		});

		it("should remove entry once but error on second try", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("courses-2", courses, InsightDatasetKind.Courses);
				})
				.then(() => {
					return facade.removeDataset("courses");
				})
				.then(() => {
					const result = facade.removeDataset("courses");
					return expect(result).eventually.to.be.rejectedWith(NotFoundError);
				});
		});

		it("should correctly remove entry that is present in dataset", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("courses-2", courses, InsightDatasetKind.Courses);
				})
				.then(() => {
					return facade.removeDataset("courses-2");
				})
				.then((addedIds) => {
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
				});
		});

		it("should not remove before anything has been added", function () {
			const result = facade.removeDataset("courses");
			return expect(result).eventually.to.be.rejectedWith(NotFoundError);
		});

		it(
			"should fulfill with id string when dataset is present " + "and id valid: only one dataset added",
			function () {
				return facade
					.addDataset(validIdWithSpaces, courses, InsightDatasetKind.Courses)
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
					.addDataset("dummy", courses, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset(validId, courses, InsightDatasetKind.Courses);
					})
					.then(() => {
						return facade.addDataset("dummy2", courses, InsightDatasetKind.Courses);
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
				return facade.addDataset("wrongOne", courses, InsightDatasetKind.Courses).then(() => {
					return expect(facade.removeDataset(validId)).eventually.to.be.rejectedWith(NotFoundError);
				});
			}
		);

		it(
			"should reject with NotFoundError if id is valid but " + "dataset not present: multiple datasets added",
			function () {
				return facade
					.addDataset("wrongOneBuddy", courses, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset("tryGagin Pal!", courses, InsightDatasetKind.Courses);
					})
					.then(() => {
						return expect(facade.removeDataset(validId)).eventually.to.be.rejectedWith(NotFoundError);
					});
			}
		);

		it("should reject with NotFoundError after consecutive calls " + "with same (valid) id", function () {
			return facade
				.addDataset("dummy", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset(validId, courses, InsightDatasetKind.Courses);
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
				return facade.addDataset(validId, courses, InsightDatasetKind.Courses).then(() => {
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
					.addDataset(validId, courses, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset("anoter valid id", courses, InsightDatasetKind.Courses);
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
				return facade.addDataset(validId, courses, InsightDatasetKind.Courses).then(() => {
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
					.addDataset(validId, courses, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset("anoter valid id", courses, InsightDatasetKind.Courses);
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
			return facade.addDataset(validId, courses, InsightDatasetKind.Courses).then(() => {
				return expect(facade.removeDataset(invalidIdEmptyStr)).eventually.to.be.rejectedWith(InsightError);
			});
		});

		it(
			"should reject with InsightError if invalid id given: " + "empty string, multiple datasets added",
			function () {
				return facade
					.addDataset(validId, courses, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset("anoter valid id", courses, InsightDatasetKind.Courses);
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

		before(function () {
			clearDisk();
			facade = new InsightFacade();
			facade.addDataset("courses", courses, InsightDatasetKind.Courses);
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


	describe("Add Dataset", function () {

		let facade: IInsightFacade;

		// Runs before each "it"
		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});


		it("should list one dataset with InsightDatasetKind rooms", function () {
			return facade
				.addDataset("roomtest", courses, InsightDatasetKind.Rooms)
				.then((addedIds) => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "roomtest",
							kind: InsightDatasetKind.Rooms,
							numRows: 64612,
						},
					]);
				});
		});

		it("should be able to add dataset that includes an invalid jason", function () {
			coursesWithInvalidJson = getContentFromArchives("invalidCourse.zip");
			return facade
				.addDataset("courses", coursesWithInvalidJson, InsightDatasetKind.Courses)
				.then((addedIds) => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 3,
						},
					]);
				});
		});

		it("should list no datasets when invalid directory holding data added (no courses folder)", function () {
			const result = facade.addDataset("courses", ubcCourses, InsightDatasetKind.Courses);

			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("should list no datasets non-zip file is uploaded", function () {
			const result = facade.addDataset("courses", unzip, InsightDatasetKind.Courses);

			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("should list no datasets when no course sections in zip", function () {
			const result = facade.addDataset("courses-5", courses2, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("should not add duplicate id dataset", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				const result = facade.addDataset("courses", courses, InsightDatasetKind.Courses);
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});
		});

		it("should reject invalid id underscore to start", function () {
			const result = facade.addDataset("_courses", courses, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("should reject invalid id underscore to end", function () {
			const result = facade.addDataset("courses_", courses, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it("should reject invalid id underscore in middle", function () {
			const result = facade.addDataset("cou_rses", courses, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it("should reject invalid whitespace id", function () {
			const result = facade.addDataset("      ", courses, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it("should reject invalid whitespace id", function () {
			const result = facade.addDataset(" ", courses, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it("should reject invalid whitespace id with underscore", function () {
			const result = facade.addDataset(" _", courses, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it("should reject invalid whitespace id with underscore and normal character", function () {
			const result = facade.addDataset("a _", courses, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("should accept valid id with whitespace", function () {
			return facade
				.addDataset("courses ubc", courses, InsightDatasetKind.Courses)
				.then((addedIds) => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "courses ubc",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
					]);
				});
		});

		it("should add a valid dataset: collection empty", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then((idList) => {
				expect(idList).to.deep.equal(["courses"]);
				expect(idList).to.be.an.instanceof(Array);
				expect(idList).to.have.length(1);
			});
		});

		it("should add a valid dataset: collection already has one valid dataset", function () {
			const smallTestContentStr = getContentFromArchives("smallTest.zip");
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("small", courses, InsightDatasetKind.Courses);
				})
				.then((idList) => {
					expect(idList).to.have.deep.members(["courses", "small"]);
					expect(idList).to.be.an.instanceof(Array);
					expect(idList).to.have.length(2);
				});
		});

		it("should add a valid dataset: id contains some whitespace", function () {
			return facade.addDataset("  co  urses  ", courses, InsightDatasetKind.Courses).then((idList) => {
				expect(idList).to.deep.equal(["  co  urses  "]);
				expect(idList).to.be.an.instanceof(Array);
				expect(idList).to.have.length(1);
			});
		});

		it("should reject a duplicate dataset", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				return expect(
					facade.addDataset("courses", courses, InsightDatasetKind.Courses)
				).eventually.to.be.rejectedWith(InsightError);
			});
		});

		it("should reject a valid dataset with kind-type Rooms", function () {
			return expect(
				facade.addDataset("courses", courses, InsightDatasetKind.Rooms)
			).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject an invalid dataset: id contains underscore", function () {
			return expect(
				facade.addDataset("_courses", courses, InsightDatasetKind.Courses)
			).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject an invalid dataset: id is all whitespace", function () {
			return expect(
				facade.addDataset("    ", courses, InsightDatasetKind.Courses)
			).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject an invalid dataset: id is empty string", function () {
			return expect(
				facade.addDataset("", courses, InsightDatasetKind.Courses)
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

		it("should reject an invalid dataset: jsons in and out of courses", function () {
			const inAndOut = getContentFromArchives("jsonsInAndOutOfCourses.zip");
			return expect(
				facade.addDataset("courses", inAndOut, InsightDatasetKind.Courses)
			).to.eventually.be.rejectedWith(InsightError);
		});

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

		it("should be able to add dataset that includes an invalid json", function () {
			coursesWithInvalidJson = getContentFromArchives("invalidCourse.zip");
			return facade.addDataset("courses", coursesWithInvalidJson, InsightDatasetKind.Courses).then((addedIds) => {
				expect(addedIds).to.deep.equal(["courses"]);
			});
		});
	});
});
