const { expect } = require('chai');
const { shellCommand }            = require("../utils/async");
const fs                          = require('fs');
const glob                        = require('fast-glob');
const Git                         = require('isomorphic-git');

const { cli, setupFixtureRepo, setupBareFixtureRepo }   = require('./helper');


const { TestHelper } = require('zos');
const { Contracts, ZWeb3 } = require('zos-lib');

ZWeb3.initialize(web3.currentProvider);

const GithereumContract = Contracts.getFromLocal('Githereum');



contract("Githereum", (addresses) => {
  const [ owner ] = addresses;

  let githereumContract;

  async function runCli(cmd) {
    return await cli(`${githereumContract.address} ${cmd}`);
  }

  async function getHead(tag) {
    let headOutput = await runCli(`head ${tag}`);
    let head = headOutput.match(/ is ([0-9a-fA-F]+)/)[1];
    return head;
  }

  beforeEach(async () => {
    await shellCommand("rm -rf tmp");
    await shellCommand("mkdir tmp");

    this.project = await TestHelper();
    githereumContract = await this.project.createProxy(GithereumContract);
  });

  it("pushes a simple repo to the blockchain and restores it again", async() => {
    await setupFixtureRepo('dummygit');

    await runCli(`push --from ${owner} tmp/dummygit my-tag`);

    // the objects should be stored in the object store
    let blobs = await glob('tmp/blobs/*');
    expect(blobs.length).to.equal(1);

    await runCli(`clone my-tag tmp/cloned`);

    let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
    expect(fullRef).to.equal('a47c8dc067a1648896f7de6759d25411f8f665a0');

    let commits = await Git.log({ dir: 'tmp/cloned' });

    expect(commits.length).to.equal(4);

    expect(commits.map(c => c.oid)).to.deep.equal(["a47c8dc067a1648896f7de6759d25411f8f665a0", "247e877ae8a62139e3561fd95ac3cfa48cbfab97", "23e65d5097a41c4f6f9b2937f807c78296ea3298", "b5d928ed34f07b13cb2c664903b771b12ad2ca29"]);

    expect(fs.readFileSync('tmp/cloned/README', 'utf8')).to.equal("Hello World\n");
  });


  it("pushes a repo to the blockchain and restores it again when the repo uses packfiles", async() => {
    await setupFixtureRepo('dummygit-packed');

    await runCli(`push --from ${owner} tmp/dummygit-packed packed-tag`);

    // the objects should be stored in the object store
    let blobs = await glob('tmp/blobs/*');
    expect(blobs.length).to.equal(1);

    await runCli(`clone packed-tag tmp/cloned`);

    let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
    expect(fullRef).to.equal('a47c8dc067a1648896f7de6759d25411f8f665a0');

    let commits = await Git.log({ dir: 'tmp/cloned' });

    expect(commits.length).to.equal(4);

    expect(commits.map(c => c.oid)).to.deep.equal(["a47c8dc067a1648896f7de6759d25411f8f665a0", "247e877ae8a62139e3561fd95ac3cfa48cbfab97", "23e65d5097a41c4f6f9b2937f807c78296ea3298", "b5d928ed34f07b13cb2c664903b771b12ad2ca29"]);

    expect(fs.readFileSync('tmp/cloned/README', 'utf8')).to.equal("Hello World\n");

  });

  it("pushes a repo to the blockchain and restores it again when the repo has commits with multiple parents", async() => {
    await setupFixtureRepo('repo-with-merge');

    await runCli(`push --from ${owner} tmp/repo-with-merge merged-tag`);

    // the objects should be stored in the object store
    let blobs = await glob('tmp/blobs/*');
    expect(blobs.length).to.equal(1);

    await runCli(`clone merged-tag tmp/cloned`);

    let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
    expect(fullRef).to.equal('93ae4072e3660b23b30b80cfc98620dfbe20ca85');

    let commits = await Git.log({ dir: 'tmp/cloned' });

    expect(commits.length).to.equal(7);


    expect(commits.map(c => c.oid)).to.deep.equal(["93ae4072e3660b23b30b80cfc98620dfbe20ca85", "54663b63174fc953678bea90602f1cf44d86dc15", "ce28caec25546c289f53ee749851848104e5e47f", "a47c8dc067a1648896f7de6759d25411f8f665a0", "247e877ae8a62139e3561fd95ac3cfa48cbfab97", "23e65d5097a41c4f6f9b2937f807c78296ea3298", "b5d928ed34f07b13cb2c664903b771b12ad2ca29"]);

    expect(fs.readFileSync('tmp/cloned/README', 'utf8')).to.equal("Hello World - version C\n");
  });


  it("works with bare repos", async() => {
    await setupBareFixtureRepo('dummygit');

    await runCli(`push --from ${owner} tmp/dummygit bare-tag`);

    // the objects should be stored in the object store
    let blobs = await glob('tmp/blobs/*');
    expect(blobs.length).to.equal(1);

    await runCli(`clone bare-tag tmp/cloned`);

    let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
    expect(fullRef).to.equal('a47c8dc067a1648896f7de6759d25411f8f665a0');

    let commits = await Git.log({ dir: 'tmp/cloned' });

    expect(commits.length).to.equal(4);

    expect(commits.map(c => c.oid)).to.deep.equal(["a47c8dc067a1648896f7de6759d25411f8f665a0", "247e877ae8a62139e3561fd95ac3cfa48cbfab97", "23e65d5097a41c4f6f9b2937f807c78296ea3298", "b5d928ed34f07b13cb2c664903b771b12ad2ca29"]);

    expect(fs.readFileSync('tmp/cloned/README', 'utf8')).to.equal("Hello World\n");

  });

  it("pushes an update to a tag to the blockchain", async() => {
    await shellCommand("mkdir tmp/dummy-repo");

    await Git.init({ dir: 'tmp/dummy-repo' });

    let shas = [];


    async function writeDummyCommit(content) {
      fs.writeFileSync("tmp/dummy-repo/content.txt", content);
      await Git.add({ dir: 'tmp/dummy-repo', filepath: 'content.txt' });

      return await Git.commit({
        dir: 'tmp/dummy-repo',
        author: {
          name: 'Mr. Test',
          email: 'mrtest@example.com'
        },
        message: `Commit ${content}`
      });
    }

    for (let content of ["a", "b"]) {
      let sha = await writeDummyCommit(content);
      shas.push(sha);
    }

    await runCli(`push --from ${owner} tmp/dummy-repo incremental-tag`);

    // the objects should be stored in the object store
    let blobs = await glob('tmp/blobs/*');
    expect(blobs.length).to.equal(1);


    let push = await githereumContract.methods.pushes('incremental-tag').call();

    let firstPushSha = shas[shas.length - 1];
    expect(push.headSha).to.equal(firstPushSha);

    expect(push.previousPushHeadSha).to.not.be.ok;
    expect(push.tag).to.equal('incremental-tag');
    expect(push.packSha).to.be.ok;

    let firstPackSha = push.packSha;

    expect(await getHead('incremental-tag')).to.equal(firstPushSha);


    for (let content of ["c", "d"]) {
      let sha = await writeDummyCommit(content);
      shas.push(sha);
    }

    await runCli(`push --from ${owner} tmp/dummy-repo incremental-tag`);

    push = await githereumContract.methods.pushes('incremental-tag').call();


    expect(push.headSha).to.equal(shas[shas.length - 1]);

    expect(push.previousPushHeadSha).to.equal(firstPushSha);

    expect(push.packSha).not.to.equal(firstPackSha);

    expect(await getHead('incremental-tag')).to.equal(shas[shas.length - 1]);
  });

  it("Pulls an updated tag from the blockchain", async() => {
    await shellCommand("mkdir tmp/dummy-repo");

    await Git.init({ dir: 'tmp/dummy-repo' });

    let shas = [];

    async function writeDummyCommit(content) {
      fs.writeFileSync("tmp/dummy-repo/content.txt", content);
      await Git.add({ dir: 'tmp/dummy-repo', filepath: 'content.txt' });

      return await Git.commit({
        dir: 'tmp/dummy-repo',
        author: {
          name: 'Mr. Test',
          email: 'mrtest@example.com'
        },
        message: `Commit ${content}`
      });
    }

    for (let content of ["a", "b"]) {
      let sha = await writeDummyCommit(content);
      shas.push(sha);
    }

    await runCli(`push --from ${owner} tmp/dummy-repo pull-tag`);

    let head = await getHead('pull-tag');
    expect(head).to.equal(shas[shas.length - 1]);

    await runCli(`clone pull-tag tmp/cloned`);

    let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
    expect(fullRef).to.equal(head);

    let commits = await Git.log({ dir: 'tmp/cloned' });

    expect(commits.length).to.equal(2);

    expect(commits.map(c => c.oid)).to.deep.equal(shas.slice().reverse());

    expect(fs.readFileSync('tmp/cloned/content.txt', 'utf8')).to.equal("b");


    for (let content of ["c", "d"]) {
      let sha = await writeDummyCommit(content);
      shas.push(sha);
    }

    await runCli(`push --from ${owner} tmp/dummy-repo pull-tag`);

    head = await getHead('pull-tag');
    expect(head).to.equal(shas[shas.length - 1]);

    await runCli(`pull pull-tag tmp/cloned`);

    fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
    expect(fullRef).to.equal(head);

    commits = await Git.log({ dir: 'tmp/cloned' });

    expect(commits.length).to.equal(4);

    expect(commits.map(c => c.oid)).to.deep.equal(shas.slice().reverse());

    expect(fs.readFileSync('tmp/cloned/content.txt', 'utf8')).to.equal("d");


  });
});
