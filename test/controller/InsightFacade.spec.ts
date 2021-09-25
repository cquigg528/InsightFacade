import {
	InsightDataset,
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import * as fs from "fs-extra";

import {getContentFromArchives, clearDisk, getContent} from "../TestUtil";
import {testFolder} from "@ubccpsc310/folder-test";
import {expect} from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);

type Input = any;
type Output = Promise<any[]>;
type Error = "InsightError" | "ResultTooLargeError";

describe("InsightFacade", function () {
	let insightFacade: InsightFacade;
	let courses: string;
	let courses2: string;
	let ubcCourses: string;
	let unzip: string;
	let coursesWithInvalidJson: string;

	const persistDir = "./data";
	const datasetContents = new Map<string, string>();

	// Reference any datasets you've added to test/resources/archives here and they will
	// automatically be loaded in the 'before' hook.
	const datasetsToLoad: {[key: string]: string} = {
		courses: "./test/resources/archives/courses.zip",
	};

	before(function () {
		// This section runs once and loads all datasets specified in the datasetsToLoad object
		courses = getContentFromArchives("courses.zip");
		courses2 = getContentFromArchives("courses2.zip");
		ubcCourses = getContentFromArchives("ubcCourses.zip");
		unzip = getContent("ubc/AANB500");
		coursesWithInvalidJson = getContentFromArchives("invalidCourse.zip");
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Just in case there is anything hanging around from a previous run
		fs.removeSync(persistDir);
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent from the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDir);
		});

		// This is a unit test. You should create more like this!
		it("Should add a valid dataset", function () {
			const id: string = "courses";
			const content: string = datasetContents.get("courses") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			});
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			insightFacade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				insightFacade.addDataset("courses", datasetContents.get("courses") ?? "", InsightDatasetKind.Courses),
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDir);
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		testFolder<any, any[], PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => insightFacade.performQuery(input),
			"./test/resources/queries",
			{
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError(expected, actual) {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
			}
		);
	});

	describe("List Datasets", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should list no datasets", function () {
			return facade.listDatasets().then((insightDatasets) => {
				expect(insightDatasets).to.deep.equal([]);
				expect(insightDatasets).to.have.length(0);
			});
		});

		it("should list one dataset", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
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
					expect(insightDatasets).to.have.length(2);
				});
		});
	});

	describe("Add Dataset", function () {
		let facade: IInsightFacade;
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
	});

	// describe("", function() {
	// before(function() {
	// clearDisk();
	// });
	describe("Perform Query", function () {
		// SOURCE FOR GENERATING TEST CASES: https://cpsc-310-test-generator.vercel.app/
		let facade: IInsightFacade;
		before(function () {
			clearDisk();
			facade = new InsightFacade();
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses);
		});

		function assertResult(expected: Output, actual: any): void {
			expect(actual).to.deep.equal(expected);
		}

		function assertError(expected: Error, actual: any): void {
			if (expected === "InsightError") {
				expect(actual).to.be.an.instanceOf(InsightError);
			} else {
				expect(actual).to.be.an.instanceOf(ResultTooLargeError);
			}
		}
		testFolder<Input, Output, Error>(
			"Perform Query Dynamic Tests",
			(input: Input): Output => {
				return facade.performQuery(input);
			},
			"./test/resources/json",
			{
				assertOnResult: assertResult,
				assertOnError: assertError, // options
			}
		);
	});
	// });

	describe("Remove Dataset", function () {
		let facade: IInsightFacade;
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
	});
});
