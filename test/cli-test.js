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
  const [ owner, repoOwner, someRandomAddress, otherOwner, ownerOfOtherRepo, writer, otherWriter ] = addresses;

  let githereumContract;

  async function runCli(cmd) {
    return await cli(`${githereumContract.address} ${cmd}`);
  }

  async function getHead(repoAndTag) {
    let headOutput = await runCli(`head ${repoAndTag}`);
    let head = headOutput.match(/ is ([0-9a-fA-F]+)/)[1];
    return head;
  }

  async function getRepo(name) {
    return await githereumContract.methods.repos(name).call();
  }

  async function ownerCount(name) {
    let repo = await getRepo(name);
    return Number(repo.ownerCount);
  }

  beforeEach(async () => {
    await shellCommand("rm -rf tmp");
    await shellCommand("mkdir tmp");

    this.project = await TestHelper();
    githereumContract = await this.project.createProxy(GithereumContract);
  });

  describe("Roles", async function() {
    this.slow(1000);

    it("Registers a repo", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);

      expect(await githereumContract.methods.isOwner("my-great-repo", repoOwner).call()).to.be.ok;
      expect(await githereumContract.methods.isOwner("my-great-repo", owner).call()).to.not.be.ok;
      expect(await githereumContract.methods.isOwner("my-great-repo", someRandomAddress).call()).to.not.be.ok;
      expect(await ownerCount('my-great-repo')).to.equal(1);
    });

    it("Doesn't allow registering an existing repo", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);

      expect(await githereumContract.methods.isOwner("my-great-repo", repoOwner).call()).to.be.ok;

      let attemptedCreate = runCli(`register my-great-repo --from ${repoOwner}`);

      await expect(attemptedCreate).to.be.rejectedWith(/Repo already exists/);
    });

    it("Repo owners can add new repo owners to a repo", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);

      expect(await githereumContract.methods.isOwner("my-great-repo", otherOwner).call()).to.not.be.ok;

      await runCli(`add owner my-great-repo ${otherOwner} --from ${repoOwner}`);

      expect(await githereumContract.methods.isOwner("my-great-repo", repoOwner).call()).to.be.ok;
      expect(await githereumContract.methods.isOwner("my-great-repo", otherOwner).call()).to.be.ok;
      expect(await ownerCount('my-great-repo')).to.equal(2);
    });

    it("Repo owners cannot add new repo owners to a repo they do not own", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);
      await runCli(`register other-repo --from ${ownerOfOtherRepo}`);

      expect(await githereumContract.methods.isOwner("my-great-repo", ownerOfOtherRepo).call()).to.not.be.ok;
      expect(await githereumContract.methods.isOwner("my-great-repo", someRandomAddress).call()).to.not.be.ok;

      expect(await ownerCount('my-great-repo')).to.equal(1);

      let attemptedAdd = runCli(`add owner my-great-repo ${someRandomAddress} --from ${ownerOfOtherRepo}`);
      await expect(attemptedAdd).to.be.rejectedWith(/Only repo owners can add new owners/);

      expect(await githereumContract.methods.isOwner("my-great-repo", ownerOfOtherRepo).call()).to.not.be.ok;
      expect(await githereumContract.methods.isOwner("my-great-repo", someRandomAddress).call()).to.not.be.ok;

      expect(await ownerCount('my-great-repo')).to.equal(1);
    });

    it("Repo owners can remove existing repo owners from a repo", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);
      await runCli(`add owner my-great-repo ${otherOwner} --from ${repoOwner}`);

      expect(await ownerCount('my-great-repo')).to.equal(2);

      expect(await githereumContract.methods.isOwner("my-great-repo", repoOwner).call()).to.be.ok;
      expect(await githereumContract.methods.isOwner("my-great-repo", otherOwner).call()).to.be.ok;

      await runCli(`remove owner my-great-repo ${repoOwner} --from ${otherOwner}`);

      expect(await githereumContract.methods.isOwner("my-great-repo", repoOwner).call()).to.not.be.ok;
      expect(await githereumContract.methods.isOwner("my-great-repo", otherOwner).call()).to.be.ok;

      expect(await ownerCount('my-great-repo')).to.equal(1);
    });

    it("Repo owners cannot remove existing repo owners from a repo they do not own", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);
      await runCli(`add owner my-great-repo ${otherOwner} --from ${repoOwner}`);
      await runCli(`register other-repo --from ${ownerOfOtherRepo}`);

      expect(await ownerCount('my-great-repo')).to.equal(2);

      expect(await githereumContract.methods.isOwner("my-great-repo", repoOwner).call()).to.be.ok;
      expect(await githereumContract.methods.isOwner("my-great-repo", otherOwner).call()).to.be.ok;
      expect(await githereumContract.methods.isOwner("my-great-repo", ownerOfOtherRepo).call()).to.not.be.ok;

      let attemptedRemove = runCli(`remove owner my-great-repo ${repoOwner} --from ${ownerOfOtherRepo}`);

      await expect(attemptedRemove).to.be.rejectedWith(/Only repo owners can remove owners/);

      expect(await ownerCount('my-great-repo')).to.equal(2);
    });

    it("Last owner cannot be removed from a repo", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);
      let attemptedRemove = runCli(`remove owner my-great-repo ${repoOwner} --from ${repoOwner}`);
      await expect(attemptedRemove).to.be.rejectedWith(/Cannot remove the last owner from a repo/);
    });

    it("Repo owners can write to a repo they own", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);

      await setupFixtureRepo('dummygit');

      await runCli(`push tmp/dummygit my-great-repo:my-tag --from ${repoOwner}`);
    });

    it("Repo owners can add writers to a repo", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);

      expect(await githereumContract.methods.isWriter("my-great-repo", writer).call()).to.not.ok;

      await runCli(`add writer my-great-repo ${writer} --from ${repoOwner}`);

      expect(await githereumContract.methods.isWriter("my-great-repo", writer).call()).to.be.ok;
    });

    it("Repo owners cannot add writers to a repo they do not own", async function() {
     await runCli(`register my-great-repo --from ${repoOwner}`);
     await runCli(`register other-repo --from ${otherOwner}`);

     expect(await githereumContract.methods.isWriter("my-great-repo", writer).call()).to.not.ok;

     let attemptedAdd = runCli(`add writer my-great-repo ${writer} --from ${otherOwner}`);
     await expect(attemptedAdd).to.be.rejectedWith(/Only repo owners can add new writers/);

     expect(await githereumContract.methods.isWriter("my-great-repo", writer).call()).to.not.ok;
    });

    it("Writers can write to a repo they are writers of", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);
      await runCli(`add writer my-great-repo ${writer} --from ${repoOwner}`);
      await setupFixtureRepo('dummygit');
      await runCli(`push tmp/dummygit my-great-repo:my-tag --from ${writer}`);
    });

    it("Writers cannot write to a repo they are not writers of", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);
      await runCli(`register other-repo --from ${otherOwner}`);
      await runCli(`add writer other-repo ${writer} --from ${otherOwner}`);
      await setupFixtureRepo('dummygit');
      let attemptedPush = runCli(`push tmp/dummygit my-great-repo:my-tag --from ${writer}`);
      await expect(attemptedPush).to.be.rejectedWith(/Cannot push to a repo that you are not a writer or owner of/);
    });

    it("Writers cannot add repo owners to a repo", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);
      await runCli(`add writer my-great-repo ${writer} --from ${repoOwner}`);

      let attemptedAdd = runCli(`add owner my-great-repo ${someRandomAddress} --from ${writer}`);
      await expect(attemptedAdd).to.be.rejectedWith(/Only repo owners can add new owners/);
    });

    it("Writers cannot add writers to a repo", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);
      await runCli(`add writer my-great-repo ${writer} --from ${repoOwner}`);
      let attemptedAdd = runCli(`add writer my-great-repo ${someRandomAddress} --from ${writer}`);
      await expect(attemptedAdd).to.be.rejectedWith(/Only repo owners can add new writers/);
    });

    it("Writers cannot remove repo owners from a repo", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);
      await runCli(`add owner my-great-repo ${otherOwner} --from ${repoOwner}`);
      await runCli(`add writer my-great-repo ${writer} --from ${repoOwner}`);

      let attemptedRemove = runCli(`remove owner my-great-repo ${repoOwner} --from ${writer}`);
      await expect(attemptedRemove).to.be.rejectedWith(/Only repo owners can remove owners/);
    });

    it("Writers cannot remove writers from a repo", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);
      await runCli(`add writer my-great-repo ${writer} --from ${repoOwner}`);
      await runCli(`add writer my-great-repo ${otherWriter} --from ${repoOwner}`);

      let attemptedRemove = runCli(`remove writer my-great-repo ${otherWriter} --from ${writer}`);
      await expect(attemptedRemove).to.be.rejectedWith(/Only repo owners can remove writers/);
    });

    it("Cannot write to a repo that is not registered", async function() {
      await setupFixtureRepo('dummygit');
      let attemptedPush = runCli(`push tmp/dummygit my-great-repo:my-tag --from ${writer}`);
      await expect(attemptedPush).to.be.rejectedWith(/my-great-repo is not registered/);
    });

    it("Repo owners cannot write to a repo they do not own", async function() {
      await runCli(`register my-great-repo --from ${repoOwner}`);
      await runCli(`register other-repo --from ${ownerOfOtherRepo}`);

      await setupFixtureRepo('dummygit');
      let attemptedPush = runCli(`push tmp/dummygit my-great-repo:my-tag --from ${ownerOfOtherRepo}`);
      await expect(attemptedPush).to.be.rejectedWith(/Cannot push to a repo that you are not a writer or owner of/);
    });

    it("Cannot read from a repo that is not registered", async function() {
      let attemptedHead = runCli(`head some-repo:master`);
      await expect(attemptedHead).to.be.rejectedWith(/Repo is not registered/);

      let attemptedClone = runCli(`clone some-repo:master tmp/repo`);
      await expect(attemptedClone).to.be.rejectedWith(/Repo is not registered/);

      let attemptedPull = runCli(`pull some-repo:master tmp/repo`);
      await expect(attemptedPull).to.be.rejectedWith(/Repo is not registered/);
    });

    it("Cannot register a repo with : in the name", async function() {
      let attemptedRegister = runCli(`register repo:badname --from ${repoOwner}`);
      await expect(attemptedRegister).to.be.rejectedWith(/Repo names cannot contain the : character/);
    });

    it("Anyone can read from a repo", async function() {
      await setupFixtureRepo('dummygit');
      await runCli(`register my-repo --from ${repoOwner}`);
      await runCli(`push tmp/dummygit my-repo:my-tag --from ${repoOwner}`);
      await runCli(`head my-repo:my-tag`);
      await runCli(`clone my-repo:my-tag tmp/cloned`);
      await runCli(`pull my-repo:my-tag tmp/cloned`);
    });
  });


  describe("Repo operations", async function() {
    this.slow(2000);

    it("pushes a simple repo to the blockchain and restores it again", async() => {

      await setupFixtureRepo('dummygit');
      await runCli(`register my-repo --from ${repoOwner}`);


      await runCli(`push tmp/dummygit my-repo:my-tag --from ${repoOwner}`);

      // the objects should be stored in the object store
      let blobs = await glob('tmp/blobs/*');
      expect(blobs.length).to.equal(1);

      await runCli(`clone my-repo:my-tag tmp/cloned`);

      let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
      expect(fullRef).to.equal('a47c8dc067a1648896f7de6759d25411f8f665a0');

      let commits = await Git.log({ dir: 'tmp/cloned' });

      expect(commits.length).to.equal(4);

      expect(commits.map(c => c.oid)).to.deep.equal(["a47c8dc067a1648896f7de6759d25411f8f665a0", "247e877ae8a62139e3561fd95ac3cfa48cbfab97", "23e65d5097a41c4f6f9b2937f807c78296ea3298", "b5d928ed34f07b13cb2c664903b771b12ad2ca29"]);

      expect(fs.readFileSync('tmp/cloned/README', 'utf8')).to.equal("Hello World\n");
    });


    it("pushes a repo to the blockchain and restores it again when the repo uses packfiles", async() => {
      await setupFixtureRepo('dummygit-packed');
      await runCli(`register my-repo --from ${repoOwner}`);


      await runCli(`push tmp/dummygit-packed my-repo:packed-tag --from ${repoOwner}`);

      // the objects should be stored in the object store
      let blobs = await glob('tmp/blobs/*');
      expect(blobs.length).to.equal(1);

      await runCli(`clone my-repo:packed-tag tmp/cloned`);

      let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
      expect(fullRef).to.equal('a47c8dc067a1648896f7de6759d25411f8f665a0');

      let commits = await Git.log({ dir: 'tmp/cloned' });

      expect(commits.length).to.equal(4);

      expect(commits.map(c => c.oid)).to.deep.equal(["a47c8dc067a1648896f7de6759d25411f8f665a0", "247e877ae8a62139e3561fd95ac3cfa48cbfab97", "23e65d5097a41c4f6f9b2937f807c78296ea3298", "b5d928ed34f07b13cb2c664903b771b12ad2ca29"]);

      expect(fs.readFileSync('tmp/cloned/README', 'utf8')).to.equal("Hello World\n");

    });

    it("pushes a repo to the blockchain and restores it again when the repo has commits with multiple parents", async() => {
      await setupFixtureRepo('repo-with-merge');

      await runCli(`register merge --from ${repoOwner}`);

      await runCli(`push tmp/repo-with-merge merge:merged-tag --from ${repoOwner}`);

      // the objects should be stored in the object store
      let blobs = await glob('tmp/blobs/*');
      expect(blobs.length).to.equal(1);

      await runCli(`clone merge:merged-tag tmp/cloned`);

      let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
      expect(fullRef).to.equal('93ae4072e3660b23b30b80cfc98620dfbe20ca85');

      let commits = await Git.log({ dir: 'tmp/cloned' });

      expect(commits.length).to.equal(7);


      expect(commits.map(c => c.oid)).to.deep.equal(["93ae4072e3660b23b30b80cfc98620dfbe20ca85", "54663b63174fc953678bea90602f1cf44d86dc15", "ce28caec25546c289f53ee749851848104e5e47f", "a47c8dc067a1648896f7de6759d25411f8f665a0", "247e877ae8a62139e3561fd95ac3cfa48cbfab97", "23e65d5097a41c4f6f9b2937f807c78296ea3298", "b5d928ed34f07b13cb2c664903b771b12ad2ca29"]);

      expect(fs.readFileSync('tmp/cloned/README', 'utf8')).to.equal("Hello World - version C\n");
    });


    it("works with bare repos", async() => {
      await setupBareFixtureRepo('dummygit');
      await runCli(`register bare --from ${repoOwner}`);

      await runCli(`push tmp/dummygit bare:bare-tag --from ${repoOwner}`);

      // the objects should be stored in the object store
      let blobs = await glob('tmp/blobs/*');
      expect(blobs.length).to.equal(1);

      await runCli(`clone bare:bare-tag tmp/cloned`);

      let fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
      expect(fullRef).to.equal('a47c8dc067a1648896f7de6759d25411f8f665a0');

      let commits = await Git.log({ dir: 'tmp/cloned' });

      expect(commits.length).to.equal(4);

      expect(commits.map(c => c.oid)).to.deep.equal(["a47c8dc067a1648896f7de6759d25411f8f665a0", "247e877ae8a62139e3561fd95ac3cfa48cbfab97", "23e65d5097a41c4f6f9b2937f807c78296ea3298", "b5d928ed34f07b13cb2c664903b771b12ad2ca29"]);

      expect(fs.readFileSync('tmp/cloned/README', 'utf8')).to.equal("Hello World\n");

    });

    it("pushes an update to a tag to the blockchain", async() => {
      await shellCommand("mkdir tmp/dummy-repo");
      await runCli(`register update --from ${repoOwner}`);

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

      await runCli(`push tmp/dummy-repo update:incremental-tag --from ${repoOwner}`);

      // the objects should be stored in the object store
      let blobs = await glob('tmp/blobs/*');
      expect(blobs.length).to.equal(1);


      let headSha = await githereumContract.methods.head('update', 'incremental-tag').call();

      let firstPushSha = shas[shas.length - 1];
      expect(headSha).to.equal(firstPushSha);

      let previousPushHeadSha = await githereumContract.methods.previousPushHeadSha('update', headSha).call();

      expect(previousPushHeadSha).to.not.be.ok;
      expect(previousPushHeadSha.length).to.not.be.ok;

      let packSha = await githereumContract.methods.pack('update', firstPushSha).call();

      expect(packSha).to.be.ok;
      expect(packSha.length).to.be.ok;

      let firstPackSha = packSha;


      expect(await getHead('update:incremental-tag')).to.equal(firstPushSha);


      for (let content of ["c", "d"]) {
        let sha = await writeDummyCommit(content);
        shas.push(sha);
      }

      await runCli(`push tmp/dummy-repo update:incremental-tag --from ${repoOwner}`);

      headSha = await githereumContract.methods.head('update', 'incremental-tag').call();
      expect(headSha).to.equal(shas[shas.length - 1]);

      previousPushHeadSha = await githereumContract.methods.previousPushHeadSha('update', headSha).call();
      expect(previousPushHeadSha).to.equal(firstPushSha);

      packSha = await githereumContract.methods.pack('update', shas[shas.length - 1]).call();
      expect(packSha).not.to.equal(firstPackSha);

      expect(await getHead('update:incremental-tag')).to.equal(shas[shas.length - 1]);
    });

    it("Pulls an updated tag from the blockchain", async() => {
      await shellCommand("mkdir tmp/dummy-repo");
      await runCli(`register update --from ${repoOwner}`);

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

      await runCli(`push tmp/dummy-repo update:pull-tag --from ${repoOwner}`);

      let head = await getHead('update:pull-tag');
      expect(head).to.equal(shas[shas.length - 1]);

      await runCli(`clone update:pull-tag tmp/cloned`);

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

      await runCli(`push tmp/dummy-repo update:pull-tag --from ${repoOwner}`);

      head = await getHead('update:pull-tag');
      expect(head).to.equal(shas[shas.length - 1]);

      await runCli(`pull update:pull-tag tmp/cloned`);

      fullRef = await Git.resolveRef({ dir: 'tmp/cloned', ref: 'master' });
      expect(fullRef).to.equal(head);

      commits = await Git.log({ dir: 'tmp/cloned' });

      expect(commits.length).to.equal(4);

      expect(commits.map(c => c.oid)).to.deep.equal(shas.slice().reverse());

      expect(fs.readFileSync('tmp/cloned/content.txt', 'utf8')).to.equal("d");


    });
  });
});
