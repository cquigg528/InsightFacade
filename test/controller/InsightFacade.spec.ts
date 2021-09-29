import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import {beforeEach} from "mocha";
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
	// use this for generic dataset adding
	let coursesSmaller: string;

	let courses: string;
	let courses2: string;
	let ubcCourses: string;
	let unzip: string;
	let coursesWithInvalidJson: string;
	let NotZip: string;
	let noJSONcourses: string;
	let coursesOneInvalid: string;
	let coursesNoSections: string;
	let coursesNoCoursesFolder: string;
	let coursesNoValidCourses: string;
	let corruptedCourses: string;
	let coursesInvalidSection: string;

	// If getContentFromArchives throws exception, whole test suite crashes.  Use
	// the before() construct for more specific error messages.  Runs before any of the
	// tests - runs before it's describe
	before(function () {
		// use this for generic dataset adding (c0 autobot timeout workaround)
		coursesSmaller = getContent("coursesSmaller.zip");

		courses = getContentFromArchives("courses.zip");
		courses2 = getContentFromArchives("courses2.zip");
		ubcCourses = getContentFromArchives("ubcCourses.zip");
		unzip = getContent("ubc/AANB500");
		coursesWithInvalidJson = getContentFromArchives("invalidCourse.zip");
		NotZip = getContentFromArchives("curses.json");
		noJSONcourses = getContentFromArchives("noJSONcourses.zip");
		coursesOneInvalid = getContentFromArchives("coursesOneInvalid.zip");
		coursesNoSections = getContentFromArchives("coursesNoSections.zip");
		coursesNoValidCourses = getContentFromArchives("coursesJSONNotValidCourse.zip");
		coursesNoCoursesFolder = getContentFromArchives("coursesNoCoursesFolder.zip");
		corruptedCourses = getContentFromArchives("courses-2.zip");
		coursesInvalidSection = getContentFromArchives("courses-invalid-section.zip");
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
				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("courses-2", coursesSmaller, InsightDatasetKind.Courses);
				})
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					const expectedDatasets: InsightDataset[] = [
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 2,
						},
						{
							id: "courses-2",
							kind: InsightDatasetKind.Courses,
							numRows: 2,
						},
					];
					expect(insightDatasets).to.be.an.instanceof(Array);
					expect(insightDatasets).to.have.deep.members(expectedDatasets);
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

		it("should successfully remove a dataset", function () {
			return facade
				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
				.then(() => facade.removeDataset("courses"))
				.then((removedID) => {
					expect(removedID).to.deep.equal("courses");
				})
				.then(() => facade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([]);
				});
		});

		it("should fail to remove a dataset because no dataset is added", function () {
			return expect(facade.removeDataset("courses")).eventually.to.be.rejectedWith(NotFoundError);
		});

		it("should fail to remove a dataset because ID does not match", function () {
			return facade
				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
				.then(() => {
					expect(facade.removeDataset("courses-2")).eventually.to.be.rejectedWith(NotFoundError);
				})
				.then(() => facade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 2,
						},
					]);
				});
		});

		it("should fail to remove a dataset due to ID having an underscore", function () {
			return facade
				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
				.then(() => {
					expect(facade.removeDataset("c_ou_rses")).eventually.to.be.rejectedWith(InsightError);
				})
				.then(() => facade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 2,
						},
					]);
				});
		});

		it("should fail to to remove a dataset due to ID being whitespaces only", function () {
			return facade
				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
				.then(() => {
					expect(facade.removeDataset("   ")).eventually.to.be.rejectedWith(InsightError);
				})
				.then(() => facade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 2,
						},
					]);
				});
		});

		it("should successfully remove one of two datasets", function () {
			return facade
				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
				.then(() => facade.addDataset("courses-2", coursesSmaller, InsightDatasetKind.Courses))
				.then(() => facade.removeDataset("courses-2"))
				.then((removedID) => {
					expect(removedID).to.deep.equal("courses-2");
				})
				.then(() => facade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 2,
						},
					]);
				});
		});

		it("should not accept underscore at beginning of id", function () {
			return facade.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses).then(() => {
				const result = facade.removeDataset("_courses");
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});
		});
		it("should not accept underscore at end of id", function () {
			return facade.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses).then(() => {
				const result = facade.removeDataset("courses_");
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});
		});
		it("should not accept underscore in middle of id", function () {
			return facade.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses).then(() => {
				const result = facade.removeDataset("cou_rses");
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});
		});
		it("should not accept whitespace as id", function () {
			return facade.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses).then(() => {
				const result = facade.removeDataset("    ");
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});
		});

		it("should throw a not found error if id hasn't been added yet ", function () {
			return facade.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses).then(() => {
				const result = facade.removeDataset("courses-2");
				return expect(result).eventually.to.be.rejectedWith(NotFoundError);
			});
		});

		it("should not accept underscore at beginning of id in remove", function () {
			return facade.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses).then(() => {
				const result = facade.removeDataset("_courses");
				return expect(result).eventually.to.be.rejectedWith(InsightError);
			});
		});

		it("should remove entry once but error on second try", function () {
			return facade
				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("courses-2", coursesSmaller, InsightDatasetKind.Courses);
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
				.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("courses-2", coursesSmaller, InsightDatasetKind.Courses);
				})
				.then(() => {
					return facade.removeDataset("courses-2");
				})
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 2,
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
					.addDataset(validIdWithSpaces, coursesSmaller, InsightDatasetKind.Courses)
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
					.addDataset("dummy", coursesSmaller, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses);
					})
					.then(() => {
						return facade.addDataset("dummy2", coursesSmaller, InsightDatasetKind.Courses);
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
				return facade.addDataset("wrongOne", coursesSmaller, InsightDatasetKind.Courses).then(() => {
					return expect(facade.removeDataset(validId)).eventually.to.be.rejectedWith(NotFoundError);
				});
			}
		);

		it(
			"should reject with NotFoundError if id is valid but " + "dataset not present: multiple datasets added",
			function () {
				return facade
					.addDataset("wrongOneBuddy", coursesSmaller, InsightDatasetKind.Courses)
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
				.addDataset("dummy", coursesSmaller, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses);
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
				return facade.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses).then(() => {
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
					.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset("anoter valid id", coursesSmaller, InsightDatasetKind.Courses);
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
				return facade.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses).then(() => {
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
					.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset("anoter valid id", coursesSmaller, InsightDatasetKind.Courses);
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
			return facade.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses).then(() => {
				return expect(facade.removeDataset(invalidIdEmptyStr)).eventually.to.be.rejectedWith(InsightError);
			});
		});

		it(
			"should reject with InsightError if invalid id given: " + "empty string, multiple datasets added",
			function () {
				return facade
					.addDataset(validId, coursesSmaller, InsightDatasetKind.Courses)
					.then(() => {
						return facade.addDataset("anoter valid id", coursesSmaller, InsightDatasetKind.Courses);
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

		it("should successfully add a dataset", function () {
			return facade.addDataset("courses", coursesSmaller, InsightDatasetKind.Courses).then((addedIds) => {
				expect(addedIds).to.deep.equal(["courses"]);
			});
		});

		it("should fail to add dataset because there is not valid section", function () {
			return expect(
				facade.addDataset("coursesInvalidSection", coursesInvalidSection, InsightDatasetKind.Courses)
			).eventually.to.be.rejectedWith(InsightError);
		});

		it("should fail to add dataset because it is invalid kind", function () {
			return expect(
				facade.addDataset("courses", courses, InsightDatasetKind.Rooms)
			).eventually.to.be.rejectedWith(InsightError);
		});

		it("should fail to add a dataset because it is not a valid zip file", function () {
			return expect(
				facade.addDataset("curses", NotZip, InsightDatasetKind.Courses)
			).eventually.to.be.rejectedWith(InsightError);
		});

		it("should fail to add a dataset because no courses are in JSON format", function () {
			return expect(
				facade.addDataset("noJSONcourses", noJSONcourses, InsightDatasetKind.Courses)
			).eventually.to.be.rejectedWith(InsightError);
		});

		it("should fail to add dataset because there is no courses folder", function () {
			return expect(
				facade.addDataset("coursesNoCoursesFolder", coursesNoCoursesFolder, InsightDatasetKind.Courses)
			).eventually.to.be.rejectedWith(InsightError);
		});

		it("should fail to add a dataset with some courses not valid", function () {
			return expect(
				facade.addDataset("coursesOneInvalid", coursesOneInvalid, InsightDatasetKind.Courses)
			).eventually.to.be.rejectedWith(InsightError);
		});

		it("should fail to add because id is all white space", function () {
			return expect(facade.addDataset("    ", courses, InsightDatasetKind.Courses)).eventually.to.be.rejectedWith(
				InsightError
			);
		});

		it("should successfully add even if id has white space", function () {
			return facade.addDataset("c o u r s e s ", coursesSmaller, InsightDatasetKind.Courses).then((addedIds) => {
				expect(addedIds).to.deep.equal(["c o u r s e s "]);
			});
		});

		it("should successfully add even though course is missing information", function () {
			return expect(
				facade.addDataset("corruptedCourses", corruptedCourses, InsightDatasetKind.Courses)
			).eventually.to.be.rejectedWith(InsightError);
		});

		it("should fail to add because the json files are not valid courses", function () {
			return expect(
				facade.addDataset("coursesNoValidCourses", coursesNoValidCourses, InsightDatasetKind.Courses)
			).eventually.to.be.rejectedWith(InsightError);
		});

		it("should fail to add because id has an underscore", function () {
			return expect(
				facade.addDataset("c_o_u_r_s_e_s", courses, InsightDatasetKind.Courses)
			).eventually.to.be.rejectedWith(InsightError);
		});

		it("should fail to add because no sections", function () {
			return expect(
				facade.addDataset("coursesNoSections", coursesNoSections, InsightDatasetKind.Courses)
			).eventually.to.be.rejectedWith(InsightError);
		});

		it("should reject repeat ID", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() =>
					expect(
						facade.addDataset("courses", coursesOneInvalid, InsightDatasetKind.Courses)
					).eventually.to.be.rejectedWith(InsightError)
				)
				.then(() => facade.listDatasets())
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

		it("should add two of the same dataset with different ids", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => facade.addDataset("courses-2", courses, InsightDatasetKind.Courses))
				.then((addedIDs) => {
					expect(addedIDs).to.be.instanceof(Array);
					expect(addedIDs).to.have.deep.members(["courses-2", "courses"]);
					expect(addedIDs).to.have.length(2);
				});
		});

		it("should list one dataset with InsightDatasetKind rooms", function () {
			return facade
				.addDataset("roomtest", courses, InsightDatasetKind.Rooms)
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "roomtest",
							kind: InsightDatasetKind.Rooms,
						},
					]);
				});
		});
	});

	describe("performQuery", function () {
		let facade: IInsightFacade = new InsightFacade();

		before(function () {
			clearDisk();
			facade = new InsightFacade();
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => facade.addDataset("courses-2", courses, InsightDatasetKind.Courses));
		});

		testFolder<Input, Output, Error>(
			"performQuery",
			(input: Input): Promise<Output> => {
				return facade.performQuery(input);
			},
			"./test/json",
			{
				assertOnResult: (expected, actual) => {
					expect(actual).to.be.instanceof(Array);
					expect(actual).to.have.deep.members(expected);
					expect(actual).to.have.length(expected.length);
				},
				errorValidator: (error): error is Error => error === "InsightError" || error === "ResultTooLargeError",
				assertOnError: (expected, actual) => {
					if (expected === "InsightError") {
						expect(actual).to.be.instanceof(InsightError);
					} else if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect.fail("UNEXPECTED ERROR");
					}
				},
			}
		);
	});
});
