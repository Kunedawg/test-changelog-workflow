"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var rest_1 = require("@octokit/rest");
var dotenv = require("dotenv");
dotenv.config();
var octokitForTypeInference = new rest_1.Octokit();
function getCommitDateForTag(octokit, owner, repo, tag) {
    return __awaiter(this, void 0, void 0, function () {
        var tagData, commitData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, octokit.rest.git.getRef({
                        owner: owner,
                        repo: repo,
                        ref: "tags/".concat(tag),
                    })];
                case 1:
                    tagData = _a.sent();
                    return [4 /*yield*/, octokit.rest.git.getCommit({
                            owner: owner,
                            repo: repo,
                            commit_sha: tagData.data.object.sha,
                        })];
                case 2:
                    commitData = _a.sent();
                    return [2 /*return*/, commitData.data.committer.date];
            }
        });
    });
}
function fetchAllPullRequests(octokit, owner, repo) {
    return __awaiter(this, void 0, void 0, function () {
        var page, PULL_REQUESTS_PER_PAGE, prs, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    page = 1;
                    PULL_REQUESTS_PER_PAGE = 100;
                    prs = [];
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 3];
                    return [4 /*yield*/, octokit.rest.pulls.list({
                            owner: owner,
                            repo: repo,
                            state: "all",
                            sort: "created",
                            direction: "desc",
                            per_page: PULL_REQUESTS_PER_PAGE,
                            page: page,
                        })];
                case 2:
                    response = _a.sent();
                    prs.push.apply(prs, response.data);
                    if (response.data.length < PULL_REQUESTS_PER_PAGE)
                        return [3 /*break*/, 3];
                    page++;
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/, prs];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var token, owner, repo, tag, octokit, commitDate_1, prIsNewerThanTagFilter, prIsClosed, prIsOpen, pullRequests, filteredPullRequests, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    token = process.env.GITHUB_TOKEN;
                    owner = "Kunedawg";
                    repo = "test-changelog-workflow";
                    tag = "v0.0.0";
                    octokit = new rest_1.Octokit({ auth: token });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, getCommitDateForTag(octokit, owner, repo, tag)];
                case 2:
                    commitDate_1 = _a.sent();
                    prIsNewerThanTagFilter = function (pr) { return new Date(pr.created_at) > new Date(commitDate_1); };
                    prIsClosed = function (pr) { return pr.state === "closed"; };
                    prIsOpen = function (pr) { return pr.state === "open"; };
                    return [4 /*yield*/, fetchAllPullRequests(octokit, owner, repo)];
                case 3:
                    pullRequests = _a.sent();
                    filteredPullRequests = pullRequests.filter(prIsNewerThanTagFilter).filter(prIsClosed).filter(prIsOpen);
                    console.log("Pull Requests since tag ".concat(tag, ":"));
                    filteredPullRequests.forEach(function (pr) {
                        console.log("#".concat(pr.number, " ").concat(pr.title, " (created at ").concat(pr.created_at, ") labels: ").concat(pr.labels));
                    });
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error("Error fetching pull requests:", error_1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
main();
